import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('../api/server.js', import.meta.url));
const PORT = 4137;
const BASE = `http://127.0.0.1:${PORT}`;

let workdir;
let child;

async function startServer() {
  child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_PATH: path.join(workdir, 'rsvp.sqlite'),
      TRUSTED_PROXY_HOPS: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('API did not start in time')), 10_000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('error', reject);
  });
}

async function stopServer() {
  if (!child) return;
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.kill('SIGTERM');
  await exited;
  child = null;
}

/** Every request carries its own forwarded address so the 30s window is per-test. */
function send(pathname, { ip = '203.0.113.1', ...init } = {}) {
  return fetch(`${BASE}${pathname}`, {
    ...init,
    headers: { Accept: 'application/json', 'X-Forwarded-For': ip, ...init.headers },
  });
}

function post(body, ip) {
  return send('/api/guestbook', {
    ip,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validEntry = {
  name: 'Tamu Uji',
  message: 'Selamat menempuh hidup baru.',
  attendance: 'attending',
  guests: 2,
};

before(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), 'rsvp-test-'));
  await startServer();
});

after(async () => {
  await stopServer();
  await rm(workdir, { recursive: true, force: true });
});

test('health check proves the database answers, not just the process', async () => {
  const response = await send('/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, database: 'ok' });
});

test('an empty guestbook returns an entries array', async () => {
  const response = await send('/api/guestbook');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { entries: [] });
});

test('a valid RSVP is stored and echoed back', async () => {
  const response = await post(validEntry, '203.0.113.10');
  assert.equal(response.status, 201);

  const { entry } = await response.json();
  assert.equal(entry.name, validEntry.name);
  assert.equal(entry.message, validEntry.message);
  assert.equal(entry.attendance, 'attending');
  assert.equal(entry.guests, 2);
  assert.ok(Number.isInteger(entry.id));
  assert.ok(!Number.isNaN(Date.parse(entry.created_at)));
});

test('validation failures carry a stable code alongside the English message', async () => {
  const cases = [
    [{ ...validEntry, name: '   ' }, 'name_required'],
    [{ ...validEntry, message: '' }, 'message_required'],
    [{ ...validEntry, attendance: 'maybe' }, 'attendance_invalid'],
    [{ ...validEntry, guests: 9 }, 'guests_invalid'],
  ];

  for (const [body, code] of cases) {
    const response = await post(body, `198.51.100.${cases.indexOf(cases.find((c) => c[1] === code)) + 1}`);
    assert.equal(response.status, 422, code);
    const payload = await response.json();
    assert.equal(payload.code, code);
    assert.equal(typeof payload.error, 'string');
  }
});

test('a second submission from the same guest is rate limited', async () => {
  const first = await post(validEntry, '203.0.113.20');
  assert.equal(first.status, 201);

  const second = await post(validEntry, '203.0.113.20');
  assert.equal(second.status, 429);
  assert.equal((await second.json()).code, 'rate_limited');
});

test('a spoofed forwarded address cannot walk past the rate limit', async () => {
  const first = await post(validEntry, '203.0.113.30');
  assert.equal(first.status, 201);

  // The guest prepends whatever they like; the proxy still appends the real
  // peer, and the limiter reads from the right.
  const spoofed = await post(validEntry, 'not-a-real-ip, 203.0.113.30');
  assert.equal(spoofed.status, 429);
});

test('an oversized body gets a refusal, not a dropped connection', async () => {
  const response = await post({ ...validEntry, message: 'x'.repeat(40_000) }, '203.0.113.40');
  assert.equal(response.status, 413);
  assert.equal((await response.json()).code, 'body_too_large');
});

test('malformed JSON is refused with a code', async () => {
  const response = await send('/api/guestbook', {
    ip: '203.0.113.41',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ not json',
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'invalid_json');
});

test('unknown routes answer with a coded 404', async () => {
  const response = await send('/api/nope');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, 'not_found');
});

test('entries survive a restart', async () => {
  const before = await (await send('/api/guestbook')).json();
  assert.ok(before.entries.length > 0);

  await stopServer();
  await startServer();

  const after = await (await send('/api/guestbook')).json();
  assert.deepEqual(after.entries, before.entries);
});
