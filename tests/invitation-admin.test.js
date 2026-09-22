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

test('both message templates are kept, and both are validated', async () => {
  let result = await send('/api/invitation-admin/settings');
  assert.equal(result.response.status, 200);
  assert.deepEqual(Object.keys(result.body.settings.templates).sort(), ['friend', 'parent']);
  const version = result.body.settings.version;

  // A broken parent template cannot slip through on the friend one's coat-tails.
  result = await send('/api/invitation-admin/settings/message-template', {
    method: 'PUT',
    body: JSON.stringify({
      version,
      templates: { friend: 'Halo {{nama_tamu}} {{link_undangan}}', parent: 'Salam {{nama_tamu}}' },
    }),
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.body.code, 'template_placeholder_missing');

  result = await send('/api/invitation-admin/settings/message-template', {
    method: 'PUT',
    body: JSON.stringify({
      version,
      templates: {
        friend: 'Halo {{nama_tamu}} {{link_undangan}}',
        parent: 'Dengan hormat {{nama_tamu}} {{link_undangan}}',
      },
    }),
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.settings.templates, {
    friend: 'Halo {{nama_tamu}} {{link_undangan}}',
    parent: 'Dengan hormat {{nama_tamu}} {{link_undangan}}',
  });

  result = await send('/api/invitation-admin/settings/message-template', {
    method: 'PUT',
    body: JSON.stringify({ version, templates: { friend: 'x {{nama_tamu}} {{link_undangan}}' } }),
  });
  assert.equal(result.response.status, 409);
  assert.equal(result.body.code, 'version_conflict');
});

test('a guest carries the template their invitation is written in', async () => {
  // Left unsaid, it follows the group the guest is filed under.
  let result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Pak Harto',
      category: 'personal',
      relationship_group: 'parent_friend_andrika',
    }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.guest.template_key, 'parent');
  const guest = result.body.guest;

  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({ name: 'Rizky', category: 'personal', relationship_group: 'friend_andrika' }),
  });
  assert.equal(result.body.guest.template_key, 'friend');
  const friend = result.body.guest;

  // Said outright, the choice stands whatever the group says.
  result = await send(`/api/invitation-admin/guests/${guest.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: guest.version,
      name: 'Pak Harto',
      category: 'personal',
      relationship_group: 'parent_friend_andrika',
      template_key: 'friend',
      titles: [],
      status: 'pending',
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.guest.template_key, 'friend');

  result = await send(`/api/invitation-admin/guests/${friend.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: friend.version,
      name: 'Rizky',
      category: 'personal',
      relationship_group: 'friend_andrika',
      template_key: 'sahabat',
      titles: [],
      status: 'pending',
    }),
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.body.code, 'template_key_invalid');

  for (const id of [guest.id, friend.id]) {
    const current = await send(`/api/invitation-admin/guests`);
    const row = current.body.guests.find((candidate) => candidate.id === id);
    await send(`/api/invitation-admin/guests/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ version: row.version }),
    });
  }
});

test('wording styles are stored, validated and filterable', async () => {
  let result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sari',
      category: 'personal',
      wording_style: 'ibu_bapak_family',
      relationship_group: 'friend_andrika',
    }),
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.body.code, 'second_name_required');

  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sari',
      category: 'personal',
      wording_style: 'tidak-ada',
      relationship_group: 'friend_andrika',
    }),
  });
  assert.equal(result.response.status, 422);
  assert.equal(result.body.code, 'wording_style_invalid');

  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sari',
      // The category the client happens to send must not contradict the
      // wording the style prints.
      category: 'group',
      wording_style: 'ibu_bapak_family',
      second_name: 'Dodi',
      relationship_group: 'friend_andrika',
    }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.guest.wording_style, 'ibu_bapak_family');
  assert.equal(result.body.guest.second_name, 'Dodi');
  assert.equal(result.body.guest.category, 'personal');
  const styled = result.body.guest;

  // A style names people, so each of them may carry titles of their own.
  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rina',
      category: 'personal',
      wording_style: 'ibu_bapak_family',
      second_name: 'Agus',
      relationship_group: 'friend_aliva',
      titles: [
        { label: 'Dr.', placement: 'prefix', person: 1 },
        { label: 'S.Kom', placement: 'suffix', person: 1 },
        { label: 'S.T', placement: 'suffix', person: 2 },
      ],
    }),
  });
  assert.equal(result.response.status, 201);
  assert.deepEqual(
    result.body.guest.titles.map(({ label, placement, person }) => ({ label, placement, person })),
    [
      { label: 'Dr.', placement: 'prefix', person: 1 },
      { label: 'S.Kom', placement: 'suffix', person: 1 },
      { label: 'S.T', placement: 'suffix', person: 2 },
    ],
  );
  const titled = result.body.guest;

  // The same degree may sit on both halves of a couple.
  result = await send(`/api/invitation-admin/guests/${titled.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: titled.version,
      name: 'Rina',
      category: 'personal',
      wording_style: 'ibu_bapak_family',
      second_name: 'Agus',
      relationship_group: 'friend_aliva',
      titles: [
        { label: 'S.Kom', placement: 'suffix', person: 1 },
        { label: 'S.Kom', placement: 'suffix', person: 2 },
      ],
      status: 'pending',
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.guest.titles.length, 2);

  // A one-name style has nobody to hang the second person's titles on.
  result = await send(`/api/invitation-admin/guests/${titled.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: result.body.guest.version,
      name: 'Rina',
      category: 'personal',
      wording_style: 'ibu_family',
      second_name: 'Agus',
      relationship_group: 'friend_aliva',
      titles: [
        { label: 'S.Kom', placement: 'suffix', person: 1 },
        { label: 'S.T', placement: 'suffix', person: 2 },
      ],
      status: 'pending',
    }),
  });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body.guest.titles.map((title) => title.person), [1]);
  assert.equal(result.body.guest.second_name, '');

  result = await send(`/api/invitation-admin/guests/${titled.id}`, {
    method: 'DELETE',
    body: JSON.stringify({ version: result.body.guest.version }),
  });
  assert.equal(result.response.status, 204);

  result = await send('/api/invitation-admin/guests?wording_style=ibu_bapak_family');
  assert.equal(result.body.total, 1);
  assert.equal(result.body.guests[0].id, styled.id);

  result = await send('/api/invitation-admin/guests?category=personal');
  assert.equal(result.body.guests.some((row) => row.id === styled.id), true);

  // Switching back to the default wording drops the second name with it.
  result = await send(`/api/invitation-admin/guests/${styled.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      version: styled.version,
      name: 'Sari',
      category: 'personal',
      wording_style: 'default',
      second_name: 'Dodi',
      relationship_group: 'friend_andrika',
      titles: [],
      status: 'pending',
    }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.guest.wording_style, 'default');
  assert.equal(result.body.guest.second_name, '');
});

test('a guest list created before styles existed keeps its rows', async () => {
  const { createRequire } = await import('node:module');
  const { DatabaseSync } = await import('node:sqlite');
  const require = createRequire(import.meta.url);
  const { createInvitationAdmin } = require('../api/invitation-admin.cjs');

  const db = new DatabaseSync(path.join(workdir, 'legacy.sqlite'));
  db.exec(`
    CREATE TABLE invitation_guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('personal', 'group', 'titled')),
      relationship_group TEXT NOT NULL CHECK (relationship_group IN (
        'friend_andrika', 'friend_aliva', 'parent_friend_andrika', 'parent_friend_aliva'
      )),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'copied', 'sent')),
      version INTEGER NOT NULL DEFAULT 1,
      copied_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.exec(`
    CREATE TABLE invitation_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      message_template TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE invitation_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      normalized_label TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE invitation_guest_titles (
      guest_id INTEGER NOT NULL REFERENCES invitation_guests(id) ON DELETE CASCADE,
      title_id INTEGER NOT NULL REFERENCES invitation_titles(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL CHECK (position >= 0),
      PRIMARY KEY (guest_id, position),
      UNIQUE (guest_id, title_id)
    );
  `);
  db.prepare(`
    INSERT INTO invitation_guests (raw_name, category, relationship_group, created_at, updated_at)
    VALUES ('Budi Santoso', 'personal', 'friend_aliva', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
  `).run();
  db.prepare(`
    INSERT INTO invitation_titles (id, label, normalized_label, is_default, created_at)
    VALUES (1, 'Dr.', 'dr.', 1, '2026-01-01T00:00:00.000Z')
  `).run();
  db.prepare('INSERT INTO invitation_guest_titles (guest_id, title_id, position) VALUES (1, 1, 0)').run();
  db.prepare(`
    INSERT INTO invitation_guests (raw_name, category, relationship_group, created_at, updated_at)
    VALUES ('Pak Broto', 'personal', 'parent_friend_andrika', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
  `).run();
  db.prepare(`
    INSERT INTO invitation_settings (id, message_template, version, updated_at)
    VALUES (1, 'Halo {{nama_tamu}} {{link_undangan}}', 3, '2026-01-01T00:00:00.000Z')
  `).run();

  const noop = () => {};
  createInvitationAdmin({
    db,
    readJson: async () => ({}),
    sendJson: noop,
    sendError: noop,
    sendEmpty: noop,
    getClientKey: () => 'test',
  });

  const row = db.prepare('SELECT raw_name, wording_style, second_name FROM invitation_guests').get();
  assert.equal(row.raw_name, 'Budi Santoso');
  assert.equal(row.wording_style, 'default');
  assert.equal(row.second_name, '');

  // The title a guest already carried survives the rebuilt link table, and
  // belongs to the first person it was always printed in front of.
  const link = db.prepare(`
    SELECT t.label, t.placement, gt.person, gt.position
    FROM invitation_guest_titles gt JOIN invitation_titles t ON t.id = gt.title_id
  `).get();
  assert.deepEqual({ ...link }, { label: 'Dr.', placement: 'prefix', person: 1, position: 0 });
  assert.equal(
    db.prepare(`SELECT COUNT(*) n FROM invitation_titles WHERE placement = 'suffix'`).get().n > 0,
    true,
  );

  // The one message the couple wrote seeds both templates, and the guests
  // filed under the parents' friends are written to as such.
  const settings = db.prepare('SELECT * FROM invitation_settings WHERE id = 1').get();
  assert.equal(settings.message_template_friend, 'Halo {{nama_tamu}} {{link_undangan}}');
  assert.equal(settings.message_template_parent, 'Halo {{nama_tamu}} {{link_undangan}}');
  assert.equal(settings.version, 3);
  assert.equal('message_template' in settings, false);
  assert.deepEqual(
    db.prepare('SELECT raw_name, template_key, with_partner FROM invitation_guests ORDER BY id').all().map((row) => ({ ...row })),
    [
      { raw_name: 'Budi Santoso', template_key: 'friend', with_partner: 1 },
      { raw_name: 'Pak Broto', template_key: 'parent', with_partner: 1 },
    ],
  );
  db.close();
});

test('a guest can be invited on their own, without a partner', async () => {
  let result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sendiri',
      category: 'personal',
      with_partner: false,
      relationship_group: 'friend_aliva',
    }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.guest.with_partner, false);
  const solo = result.body.guest;

  // A whole family has no partner to leave off, and neither has a style.
  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Cimahi',
      category: 'group',
      with_partner: false,
      relationship_group: 'friend_aliva',
    }),
  });
  assert.equal(result.body.guest.with_partner, true);
  const family = result.body.guest;

  result = await send('/api/invitation-admin/guests', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Sari',
      category: 'personal',
      with_partner: false,
      wording_style: 'ibu_family',
      relationship_group: 'friend_aliva',
    }),
  });
  assert.equal(result.body.guest.with_partner, true);
  const styled = result.body.guest;

  result = await send('/api/invitation-admin/guests?category=personal&with_partner=0');
  assert.deepEqual(result.body.guests.map((row) => row.id), [solo.id]);

  // The choice sticks until it is changed outright.
  result = await send(`/api/invitation-admin/guests/${solo.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ version: solo.version, status: 'copied' }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.guest.with_partner, false);

  result = await send(`/api/invitation-admin/guests/${solo.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ version: result.body.guest.version, with_partner: true, status: 'copied' }),
  });
  assert.equal(result.body.guest.with_partner, true);

  for (const guest of [{ ...solo, version: result.body.guest.version }, family, styled]) {
    const listed = await send('/api/invitation-admin/guests');
    const row = listed.body.guests.find((candidate) => candidate.id === guest.id);
    await send(`/api/invitation-admin/guests/${guest.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ version: row.version }),
    });
  }
});
