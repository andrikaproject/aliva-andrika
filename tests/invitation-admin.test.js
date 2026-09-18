import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SERVER = fileURLToPath(new URL('../api/server.js', import.meta.url));
const PORT = 4148;
const BASE = `http://127.0.0.1:${PORT}`;
const CODE = 'kode-uji-admin';
const salt = randomBytes(16);
const digest = scryptSync(CODE, salt, 32, { N: 16_384, r: 8, p: 1 });
const CODE_HASH = `scrypt$16384$8$1$${salt.toString('base64url')}$${digest.toString('base64url')}`;

let workdir;
let child;
let cookie = '';

async function startServer() {
  child = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_PATH: path.join(workdir, 'admin.sqlite'),
      TRUSTED_PROXY_HOPS: '0',
      INVITATION_ADMIN_CODE_HASH: CODE_HASH,
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

async function send(pathname, init = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers || {}),
    },
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

before(async () => {
  workdir = await mkdtemp(path.join(tmpdir(), 'invitation-admin-test-'));
  await startServer();
});

after(async () => {
  await stopServer();
  await rm(workdir, { recursive: true, force: true });
});

test('admin API protects data and manages titled guests', async () => {
  let result = await send('/api/invitation-admin/guests');
  assert.equal(result.response.status, 401);

  result = await send('/api/invitation-admin/login', {
    method: 'POST',
    body: JSON.stringify({ code: 'wrong' }),
  });
  assert.equal(result.response.status, 401);

  result = await send('/api/invitation-admin/login', {
    method: 'POST',
    body: JSON.stringify({ code: CODE }),
  });
  assert.equal(result.response.status, 200);
  assert.match(cookie, /^invitation_admin_session=/);

  result = await send('/api/invitation-admin/titles');
  assert.equal(result.response.status, 200);
  assert.ok(result.body.titles.some((title) => title.label === 'Dr.'));

  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Budi Santoso',
      category: 'titled',
      relationship_group: 'parent_friend_aliva',
      titles: ['Bapak', 'Dr.'],
    }),
  });
  assert.equal(result.response.status, 201);
  assert.deepEqual(result.body.guest.titles.map((title) => title.label), ['Bapak', 'Dr.']);

  const guest = result.body.guest;
  result = await send('/api/invitation-admin/guests', {
    method: 'GET',
  });
  assert.equal(result.body.total, 1);

  result = await send(`/api/invitation-admin/guests/${guest.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: guest.version,
      name: guest.name,
      category: guest.category,
      relationship_group: guest.relationship_group,
      titles: ['Bapak', 'Dr.'],
      status: 'copied',
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.guest.status, 'copied');

  result = await send(`/api/invitation-admin/guests/${guest.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: guest.version,
      name: guest.name,
      category: guest.category,
      relationship_group: guest.relationship_group,
      titles: ['Bapak', 'Dr.'],
      status: 'sent',
    }),
  });
  assert.equal(result.response.status, 409);
  assert.equal(result.body.code, 'version_conflict');
});

test('template endpoint validates both placeholders', async () => {
  let result = await send('/api/invitation-admin/settings');
  assert.equal(result.response.status, 200);
  const version = result.body.settings.version;

  result = await send('/api/invitation-admin/settings/message-template', {
    method: 'PUT',
    body: JSON.stringify({ version, template: 'Halo {{nama_tamu}}' }),
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.body.code, 'template_placeholder_missing');

  result = await send('/api/invitation-admin/settings/message-template', {
    method: 'PUT',
    body: JSON.stringify({ version, template: 'Halo {{nama_tamu}} {{link_undangan}}' }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.settings.message_template, 'Halo {{nama_tamu}} {{link_undangan}}');
});
