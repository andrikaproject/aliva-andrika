'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { ADMIN_PREFIX, createInvitationAdmin } = require('./invitation-admin.cjs');

const PORT = Number(process.env.PORT || 4000);
const DATABASE_PATH = process.env.DATABASE_PATH || '/data/rsvp.sqlite';
const MAX_BODY_BYTES = 16 * 1024;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 30_000;
const RATE_LIMIT_MAX_ENTRIES = 10_000;

// How many proxies sit in front of this process. Caddy appends the real peer
// to X-Forwarded-For, so with one hop the last entry is the guest and any
// header the guest invented sits harmlessly to its left. Set this to the real
// chain length; 0 ignores the header and rate-limits by socket address, which
// only makes sense when the API is reached directly.
const TRUSTED_PROXY_HOPS = Number(process.env.TRUSTED_PROXY_HOPS ?? 1);

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

const countEntries = db.prepare('SELECT COUNT(*) AS total FROM guestbook_entries');

const insertEntry = db.prepare(`
  INSERT INTO guestbook_entries (name, message, attendance, guests, created_at)
  VALUES (?, ?, ?, ?, ?)
`);

const invitationAdmin = createInvitationAdmin({
  db,
  readJson,
  sendJson,
  sendError,
  sendEmpty,
  getClientKey,
});

const rateLimit = new Map();

function getClientKey(request) {
  const socketAddress = request.socket.remoteAddress || 'unknown';
  if (TRUSTED_PROXY_HOPS <= 0) return socketAddress;

  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string' || !forwarded.trim()) return socketAddress;

  // Count in from the right: those entries were written by our own proxies.
  // Reading the leftmost entry would let a guest spoof a new identity per
  // request and walk straight past the rate limit.
  const hops = forwarded.split(',').map((value) => value.trim()).filter(Boolean);
  return hops[hops.length - TRUSTED_PROXY_HOPS] || socketAddress;
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

function sendError(response, statusCode, code, message) {
  sendJson(response, statusCode, { error: message, code });
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
        // Stop reading, but leave the socket alive long enough to answer.
        // Destroying it here made an oversized body look like a network
        // failure to the browser instead of a refusal it can explain.
        request.pause();
        const error = new Error('Request body is too large');
        error.code = 'body_too_large';
        fail(error);
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
        const error = new Error('Invalid JSON');
        error.code = 'invalid_json';
        reject(error);
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
    sendError(response, 405, 'method_not_allowed', 'Method not allowed');
    return;
  }

  if (isRateLimited(getClientKey(request))) {
    sendError(response, 429, 'rate_limited', 'Please wait before sending another message.');
    return;
  }

  let payload;
  try {
    payload = await readJson(request);
  } catch (error) {
    const code = error.code === 'body_too_large' ? 'body_too_large' : 'invalid_json';
    const status = code === 'body_too_large' ? 413 : 400;
    response.setHeader('Connection', 'close');
    response.on('finish', () => request.destroy());
    sendError(response, status, code, error.message);
    return;
  }

  const name = textValue(payload.name, MAX_NAME_LENGTH);
  const message = textValue(payload.message, MAX_MESSAGE_LENGTH);
  const attendance = payload.attendance;
  const guests = Number(payload.guests || 1);

  if (!name) {
    sendError(response, 422, 'name_required', 'Name is required.');
    return;
  }

  if (!message) {
    sendError(response, 422, 'message_required', 'Message is required.');
    return;
  }

  if (!['attending', 'not_attending'].includes(attendance)) {
    sendError(response, 422, 'attendance_invalid', 'Attendance selection is invalid.');
    return;
  }

  if (!Number.isInteger(guests) || guests < 1 || guests > 4) {
    sendError(response, 422, 'guests_invalid', 'Number of guests must be between 1 and 4.');
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

const server = http.createServer({
  requestTimeout: 15_000,
  headersTimeout: 10_000,
  connectionsCheckingInterval: 1_000,
}, async (request, response) => {
  try {
    const requestUrl = new URL(request.url, 'http://localhost');

    if (requestUrl.pathname === '/healthz') {
      try {
        countEntries.get();
        sendJson(response, 200, { ok: true, database: 'ok' });
      } catch (error) {
        console.error('Health check query failed:', error);
        sendError(response, 503, 'server_error', 'Database unavailable.');
      }
      return;
    }

    if (requestUrl.pathname === '/api/guestbook') {
      await handleGuestbook(request, response);
      return;
    }

    if (requestUrl.pathname === ADMIN_PREFIX || requestUrl.pathname.startsWith(`${ADMIN_PREFIX}/`)) {
      await invitationAdmin.handle(request, response, requestUrl);
      return;
    }

    sendError(response, 404, 'not_found', 'Not found');
  } catch (error) {
    console.error('Unhandled request error:', error);
    if (!response.headersSent) sendError(response, 500, 'server_error', 'Temporary server error.');
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
