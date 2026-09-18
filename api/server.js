'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 4000);
const DATABASE_PATH = process.env.DATABASE_PATH || '/data/rsvp.sqlite';
const MAX_BODY_BYTES = 16 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX_ENTRIES = 10_000;

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

const db = new DatabaseSync(DATABASE_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS guestbook_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('attending', 'not_attending')),
    guests INTEGER NOT NULL DEFAULT 1 CHECK (guests BETWEEN 1 AND 4),
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_guestbook_entries_created_at
    ON guestbook_entries (created_at DESC, id DESC);
`);

const listEntries = db.prepare(`
  SELECT id, name, message, attendance, guests, created_at
  FROM guestbook_entries
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`);

const insertEntry = db.prepare(`
  INSERT INTO guestbook_entries (name, message, attendance, guests, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const rateLimit = new Map();

function getClientKey(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  return request.socket.remoteAddress || 'unknown';
}

function isRateLimited(key) {
  const now = Date.now();
  const previous = rateLimit.get(key) || 0;

  if (now - previous < RATE_LIMIT_WINDOW_MS) return true;

  rateLimit.set(key, now);
  if (rateLimit.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [entryKey, timestamp] of rateLimit) {
      if (now - timestamp >= RATE_LIMIT_WINDOW_MS) rateLimit.delete(entryKey);
    }
  }

  return false;
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Length': 0,
  });
  response.end();
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        fail(new Error('Request body is too large'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (settled) return;
      settled = true;
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    request.on('error', fail);
  });
}

function textValue(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function publicEntry(row) {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    attendance: row.attendance,
    guests: row.guests,
    created_at: row.created_at,
  };
}

async function handleGuestbook(request, response) {
  if (request.method === 'GET') {
    const entries = listEntries.all(50).map(publicEntry);
    sendJson(response, 200, { entries });
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (isRateLimited(getClientKey(request))) {
    sendJson(response, 429, { error: 'Please wait before sending another message.' });
    return;
  }

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  const name = textValue(payload.name, MAX_NAME_LENGTH);
  const message = textValue(payload.message, MAX_MESSAGE_LENGTH);
  const attendance = payload.attendance;
  const guests = Number(payload.guests || 1);

  if (!name) {
    sendJson(response, 422, { error: 'Name is required.' });
    return;
  }

  if (!message) {
    sendJson(response, 422, { error: 'Message is required.' });
    return;
  }

  if (!['attending', 'not_attending'].includes(attendance)) {
    sendJson(response, 422, { error: 'Attendance selection is invalid.' });
    return;
  }

  if (!Number.isInteger(guests) || guests < 1 || guests > 4) {
    sendJson(response, 422, { error: 'Number of guests must be between 1 and 4.' });
    return;
  }

  const createdAt = new Date().toISOString();
  const result = insertEntry.run(name, message, attendance, guests, createdAt);
  const entry = {
    id: Number(result.lastInsertRowid),
    name,
    message,
    attendance,
    guests,
    created_at: createdAt,
  };

  sendJson(response, 201, { entry });
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, 'http://localhost');

    if (requestUrl.pathname === '/healthz') {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (requestUrl.pathname === '/api/guestbook') {
      await handleGuestbook(request, response);
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Unhandled request error:', error);
    if (!response.headersSent) sendJson(response, 500, { error: 'Temporary server error.' });
    else response.destroy();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RSVP API listening on port ${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
