'use strict';

const crypto = require('node:crypto');

const ADMIN_PREFIX = '/api/invitation-admin';
const SESSION_COOKIE = 'invitation_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_NAME_LENGTH = 60;
const MAX_TITLE_LENGTH = 32;
const MAX_TITLES = 6;
const MAX_TEMPLATE_LENGTH = 8_000;
const LOGIN_WINDOW_MS = 5 * 60_000;
const LOGIN_MAX_ATTEMPTS = 8;

const CATEGORIES = new Set(['personal', 'group', 'titled']);
// How many people each wording style names; two-name styles need both.
const WORDING_STYLES = new Map([
  ['default', 0],
  ['ibu_family', 1],
  ['bapak_family', 1],
  ['ibu_bapak_family', 2],
  ['bapak_ibu_family', 2],
]);
const GROUPS = new Set(['friend_andrika', 'friend_aliva', 'parent_friend_andrika', 'parent_friend_aliva']);
const STATUSES = new Set(['pending', 'copied', 'sent']);
// One message for friends, another for the parents' guests. A guest picks
// which of the two their invitation is written in.
const TEMPLATE_KEYS = ['friend', 'parent'];
const PLACEMENTS = new Set(['prefix', 'suffix']);
const TITLES = ['Bapak', 'Ibu', 'Saudara', 'Saudari', 'H.', 'Hj.', 'Dr.', 'dr.', 'Prof.', 'Ir.'];
// Degrees are written after the name, so they ship as their own list.
const SUFFIX_TITLES = [
  'S.Kom', 'S.Si', 'S.T', 'S.E', 'S.H', 'S.Pd', 'S.Sos', 'S.Psi', 'S.Ked', 'S.Farm', 'S.Ag', 'S.IP',
  'A.Md', 'M.M', 'M.Kom', 'M.Si', 'M.T', 'M.Pd',
];

function initializeInvitationAdmin(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitation_admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invitation_admin_sessions_expires
      ON invitation_admin_sessions (expires_at);

    CREATE TABLE IF NOT EXISTS invitation_guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raw_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('personal', 'group', 'titled')),
      relationship_group TEXT NOT NULL CHECK (relationship_group IN (
        'friend_andrika', 'friend_aliva', 'parent_friend_andrika', 'parent_friend_aliva'
      )),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'copied', 'sent')),
      wording_style TEXT NOT NULL DEFAULT 'default',
      second_name TEXT NOT NULL DEFAULT '',
      with_partner INTEGER NOT NULL DEFAULT 1 CHECK (with_partner IN (0, 1)),
      version INTEGER NOT NULL DEFAULT 1,
      copied_at TEXT,
      sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_invitation_guests_filters
      ON invitation_guests (relationship_group, category, status, updated_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS invitation_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      normalized_label TEXT NOT NULL UNIQUE,
      placement TEXT NOT NULL DEFAULT 'prefix' CHECK (placement IN ('prefix', 'suffix')),
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitation_guest_titles (
      guest_id INTEGER NOT NULL REFERENCES invitation_guests(id) ON DELETE CASCADE,
      title_id INTEGER NOT NULL REFERENCES invitation_titles(id) ON DELETE RESTRICT,
      person INTEGER NOT NULL DEFAULT 1 CHECK (person IN (1, 2)),
      position INTEGER NOT NULL CHECK (position >= 0),
      PRIMARY KEY (guest_id, person, position),
      UNIQUE (guest_id, person, title_id)
    );

    CREATE TABLE IF NOT EXISTS invitation_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      message_template_friend TEXT NOT NULL DEFAULT '',
      message_template_parent TEXT NOT NULL DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );
  `);

  // Guest lists created before wording styles existed keep their rows; the
  // default value is exactly the wording those rows already had.
  const guestColumns = new Set(db.prepare('PRAGMA table_info(invitation_guests)').all().map((column) => column.name));
  if (!guestColumns.has('wording_style')) {
    db.exec(`ALTER TABLE invitation_guests ADD COLUMN wording_style TEXT NOT NULL DEFAULT 'default'`);
  }
  if (!guestColumns.has('second_name')) {
    db.exec(`ALTER TABLE invitation_guests ADD COLUMN second_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!guestColumns.has('with_partner')) {
    // Every invitation written so far named a partner alongside the guest.
    db.exec(`
      ALTER TABLE invitation_guests
      ADD COLUMN with_partner INTEGER NOT NULL DEFAULT 1 CHECK (with_partner IN (0, 1))
    `);
  }
  if (!guestColumns.has('template_key')) {
    db.exec(`
      ALTER TABLE invitation_guests
      ADD COLUMN template_key TEXT NOT NULL DEFAULT 'friend' CHECK (template_key IN ('friend', 'parent'))
    `);
    // Guests filed under the parents' friends were always written to as such.
    db.exec(`
      UPDATE invitation_guests SET template_key = 'parent'
      WHERE relationship_group IN ('parent_friend_andrika', 'parent_friend_aliva')
    `);
  }

  // The single message becomes two. Its text seeds both, so whichever a
  // guest is written in, the wording the couple already wrote is there.
  const settingColumns = new Set(db.prepare('PRAGMA table_info(invitation_settings)').all().map((column) => column.name));
  for (const key of TEMPLATE_KEYS) {
    if (!settingColumns.has(`message_template_${key}`)) {
      db.exec(`ALTER TABLE invitation_settings ADD COLUMN message_template_${key} TEXT NOT NULL DEFAULT ''`);
      if (settingColumns.has('message_template')) {
        db.exec(`UPDATE invitation_settings SET message_template_${key} = message_template WHERE id = 1`);
      }
    }
  }
  if (settingColumns.has('message_template')) db.exec('ALTER TABLE invitation_settings DROP COLUMN message_template');

  const titleColumns = new Set(db.prepare('PRAGMA table_info(invitation_titles)').all().map((column) => column.name));
  if (!titleColumns.has('placement')) {
    db.exec(`ALTER TABLE invitation_titles ADD COLUMN placement TEXT NOT NULL DEFAULT 'prefix'`);
  }

  // The link table gains the person a title belongs to. Its primary key has
  // to change with it, which SQLite only allows by rebuilding the table.
  const linkColumns = new Set(db.prepare('PRAGMA table_info(invitation_guest_titles)').all().map((column) => column.name));
  if (!linkColumns.has('person')) {
    db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE invitation_guest_titles_rebuilt (
        guest_id INTEGER NOT NULL REFERENCES invitation_guests(id) ON DELETE CASCADE,
        title_id INTEGER NOT NULL REFERENCES invitation_titles(id) ON DELETE RESTRICT,
        person INTEGER NOT NULL DEFAULT 1 CHECK (person IN (1, 2)),
        position INTEGER NOT NULL CHECK (position >= 0),
        PRIMARY KEY (guest_id, person, position),
        UNIQUE (guest_id, person, title_id)
      );
      INSERT INTO invitation_guest_titles_rebuilt (guest_id, title_id, person, position)
        SELECT guest_id, title_id, 1, position FROM invitation_guest_titles;
      DROP TABLE invitation_guest_titles;
      ALTER TABLE invitation_guest_titles_rebuilt RENAME TO invitation_guest_titles;
      COMMIT;
    `);
  }

  const createdAt = new Date().toISOString();
  const insertTitle = db.prepare(`
    INSERT INTO invitation_titles (label, normalized_label, placement, is_default, created_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(normalized_label) DO UPDATE SET placement = excluded.placement, is_default = 1
  `);
  for (const label of TITLES) insertTitle.run(label, normalizeKey(label), 'prefix', createdAt);
  for (const label of SUFFIX_TITLES) insertTitle.run(label, normalizeKey(label), 'suffix', createdAt);
  db.prepare(`
    INSERT OR IGNORE INTO invitation_settings (id, message_template_friend, message_template_parent, version, updated_at)
    VALUES (1, '', '', 1, ?)
  `).run(createdAt);
}

function normalizeKey(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}

function textValue(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function nowIso() {
  return new Date().toISOString();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {}
  }
  return cookies;
}

function cookieHeader(token, maxAge) {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api/invitation-admin',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function codeHashParts(encoded) {
  if (typeof encoded !== 'string') return null;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [scheme, nText, rText, pText, salt, digest] = parts;
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (scheme !== 'scrypt' || !Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  if (!salt || !digest || N < 16 || r < 1 || p < 1 || N > 1 << 20) return null;
  return { N, r, p, salt: Buffer.from(salt, 'base64url'), digest: Buffer.from(digest, 'base64url') };
}

function verifyAccessCode(code) {
  const parts = codeHashParts(process.env.INVITATION_ADMIN_CODE_HASH);
  if (!parts || typeof code !== 'string' || code.length > 128) return false;
  try {
    const derived = crypto.scryptSync(code, parts.salt, parts.digest.length, {
      N: parts.N,
      r: parts.r,
      p: parts.p,
      maxmem: Math.max(32 * 1024 * 1024, 128 * parts.N * parts.r + 1024),
    });
    return derived.length === parts.digest.length && crypto.timingSafeEqual(derived, parts.digest);
  } catch {
    return false;
  }
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function sessionFor(request, db) {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const row = db.prepare(`
    SELECT id, token_hash, expires_at
    FROM invitation_admin_sessions
    WHERE token_hash = ? AND expires_at > ?
  `).get(hashToken(token), nowIso());
  if (!row) return null;
  db.prepare('UPDATE invitation_admin_sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), row.id);
  return row;
}

function validateCategory(value) {
  return typeof value === 'string' && CATEGORIES.has(value);
}

function validateGroup(value) {
  return typeof value === 'string' && GROUPS.has(value);
}

function validateStatus(value) {
  return typeof value === 'string' && STATUSES.has(value);
}

function validateWordingStyle(value) {
  return typeof value === 'string' && WORDING_STYLES.has(value);
}

function validateTemplateKey(value) {
  return typeof value === 'string' && TEMPLATE_KEYS.includes(value);
}

function readSettings(db) {
  const row = db.prepare(`
    SELECT message_template_friend, message_template_parent, version, updated_at
    FROM invitation_settings WHERE id = 1
  `).get();
  return {
    templates: { friend: row.message_template_friend, parent: row.message_template_parent },
    version: Number(row.version),
    updated_at: row.updated_at,
  };
}

/**
 * Titles as {label, placement, person}. A bare string keeps its original
 * meaning — a prefix on the first person — so older clients still work.
 */
function normalizeTitles(values) {
  if (!Array.isArray(values)) return [];
  const counts = new Map();
  const titles = [];
  for (const value of values) {
    const raw = typeof value === 'string' ? { label: value } : (value && typeof value === 'object' ? value : {});
    const label = textValue(raw.label, MAX_TITLE_LENGTH);
    if (!label) continue;
    const person = Number(raw.person) === 2 ? 2 : 1;
    const taken = counts.get(person) || 0;
    if (taken >= MAX_TITLES) continue;
    counts.set(person, taken + 1);
    titles.push({ label, placement: raw.placement === 'suffix' ? 'suffix' : 'prefix', person });
  }
  return titles;
}

function titleRowsFor(db, guestId) {
  return db.prepare(`
    SELECT t.id, t.label, t.placement, gt.person
    FROM invitation_guest_titles gt
    JOIN invitation_titles t ON t.id = gt.title_id
    WHERE gt.guest_id = ?
    ORDER BY gt.person ASC, gt.position ASC
  `).all(guestId).map((row) => ({
    id: Number(row.id),
    label: row.label,
    placement: row.placement || 'prefix',
    person: Number(row.person) || 1,
  }));
}

function serializeGuest(db, row) {
  return {
    id: Number(row.id),
    name: row.raw_name,
    category: row.category,
    wording_style: row.wording_style || 'default',
    second_name: row.second_name || '',
    with_partner: Number(row.with_partner) !== 0,
    template_key: row.template_key || 'friend',
    relationship_group: row.relationship_group,
    titles: titleRowsFor(db, row.id),
    status: row.status,
    version: Number(row.version),
    copied_at: row.copied_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function insertGuestTitles(db, guestId, titles, createdAt) {
  const upsertTitle = db.prepare(`
    INSERT INTO invitation_titles (label, normalized_label, placement, is_default, is_active, created_at)
    VALUES (?, ?, ?, 0, 1, ?)
    ON CONFLICT(normalized_label) DO UPDATE SET is_active = 1
  `);
  const findTitle = db.prepare('SELECT id FROM invitation_titles WHERE normalized_label = ?');
  const linkTitle = db.prepare(`
    INSERT INTO invitation_guest_titles (guest_id, title_id, person, position) VALUES (?, ?, ?, ?)
  `);
  const positions = new Map();
  for (const { label, placement, person } of titles) {
    const normalized = normalizeKey(label);
    upsertTitle.run(label, normalized, placement, createdAt);
    const title = findTitle.get(normalized);
    const position = positions.get(person) || 0;
    positions.set(person, position + 1);
    linkTitle.run(guestId, title.id, person, position);
  }
}

function validateGuestInput(payload, current = {}) {
  const name = payload.name === undefined
    ? textValue(current.name || current.raw_name || '', MAX_NAME_LENGTH)
    : textValue(payload.name, MAX_NAME_LENGTH);
  const category = payload.category === undefined ? current.category : payload.category;
  const relationshipGroup = payload.relationship_group === undefined
    ? current.relationship_group
    : payload.relationship_group;
  const titles = normalizeTitles(payload.titles === undefined ? (current.titles || []) : payload.titles);
  const style = payload.wording_style === undefined ? (current.wording_style || 'default') : payload.wording_style;
  const secondName = payload.second_name === undefined
    ? textValue(current.second_name || '', MAX_NAME_LENGTH)
    : textValue(payload.second_name, MAX_NAME_LENGTH);
  // A guest of the parents' friends is written to as such unless said otherwise.
  const withPartner = payload.with_partner === undefined
    ? current.with_partner === undefined ? true : Number(current.with_partner) !== 0
    : payload.with_partner !== false;
  const templateKey = payload.template_key === undefined
    ? (current.template_key || (String(relationshipGroup).startsWith('parent_') ? 'parent' : 'friend'))
    : payload.template_key;

  if (!name) return { error: ['name_required', 'Name is required.'] };
  if (!validateWordingStyle(style)) return { error: ['wording_style_invalid', 'Wording style is invalid.'] };
  if (!validateTemplateKey(templateKey)) return { error: ['template_key_invalid', 'Message template is invalid.'] };
  if (!validateGroup(relationshipGroup)) return { error: ['relationship_group_invalid', 'Relationship group is invalid.'] };

  const namedPeople = WORDING_STYLES.get(style);
  if (style !== 'default') {
    if (namedPeople > 1 && !secondName) {
      return { error: ['second_name_required', 'The second name is required for this wording style.'] };
    }
    // A style carries its own form of address, so the category it is filed
    // under stays neutral rather than contradicting the printed wording. A
    // style naming one person has nobody to hang a second person's titles on.
    return {
      value: {
        name,
        category: 'personal',
        relationshipGroup,
        titles: namedPeople > 1 ? titles : titles.filter((title) => title.person === 1),
        style,
        secondName: namedPeople > 1 ? secondName : '',
        // A style prints its own form of address; no partner is appended.
        withPartner: true,
        templateKey,
      },
    };
  }

  if (!validateCategory(category)) return { error: ['category_invalid', 'Invitation category is invalid.'] };
  const ownTitles = titles.filter((title) => title.person === 1);
  if (category === 'titled' && ownTitles.length === 0) return { error: ['titles_required', 'At least one title is required.'] };
  if (category !== 'titled' && ownTitles.length > 0) return { error: ['titles_not_allowed', 'Titles are only allowed for Personal Bergelar.'] };
  return {
    value: {
      name,
      category,
      relationshipGroup,
      titles: ownTitles,
      style,
      secondName: '',
      // A whole family is never invited "& Pasangan" to begin with.
      withPartner: category === 'group' ? true : withPartner,
      templateKey,
    },
  };
}

function listGuests(db, url) {
  const clauses = [];
  const values = [];
  const search = textValue(url.searchParams.get('search') || '', MAX_NAME_LENGTH);
  const category = url.searchParams.get('category');
  const wordingStyle = url.searchParams.get('wording_style');
  const withPartner = url.searchParams.get('with_partner');
  const relationshipGroup = url.searchParams.get('relationship_group');
  const status = url.searchParams.get('status');

  if (search) {
    clauses.push('raw_name LIKE ? COLLATE NOCASE');
    values.push(`%${search}%`);
  }
  if (validateCategory(category)) {
    clauses.push('category = ?');
    values.push(category);
  }
  if (validateWordingStyle(wordingStyle)) {
    clauses.push('wording_style = ?');
    values.push(wordingStyle);
  }
  if (withPartner === '0' || withPartner === '1') {
    clauses.push('with_partner = ?');
    values.push(Number(withPartner));
  }
  if (validateGroup(relationshipGroup)) {
    clauses.push('relationship_group = ?');
    values.push(relationshipGroup);
  }
  if (validateStatus(status)) {
    clauses.push('status = ?');
    values.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT id, raw_name, category, wording_style, second_name, with_partner, template_key, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
    FROM invitation_guests
    ${where}
    ORDER BY updated_at DESC, id DESC
  `).all(...values);
  return rows.map((row) => serializeGuest(db, row));
}

function validateTemplate(template) {
  if (typeof template !== 'string' || template.length > MAX_TEMPLATE_LENGTH) {
    return ['template_invalid', 'Message template is invalid.'];
  }
  const placeholders = template.match(/\{\{[^}]+\}\}/g) || [];
  const allowed = new Set(['{{nama_tamu}}', '{{link_undangan}}']);
  if (placeholders.some((placeholder) => !allowed.has(placeholder))) {
    return ['template_placeholder_invalid', 'Template contains an unsupported placeholder.'];
  }
  if (template.trim() && (!template.includes('{{nama_tamu}}') || !template.includes('{{link_undangan}}'))) {
    return ['template_placeholder_missing', 'Template must include the guest name and invitation link.'];
  }
  return null;
}

function runTransaction(db, callback) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function makeLoginLimiter() {
  const attempts = new Map();
  return (key) => {
    const now = Date.now();
    const previous = attempts.get(key);
    if (!previous || now - previous.startedAt >= LOGIN_WINDOW_MS) {
      attempts.set(key, { startedAt: now, count: 1 });
      return false;
    }
    previous.count += 1;
    return previous.count > LOGIN_MAX_ATTEMPTS;
  };
}

function createInvitationAdmin({ db, readJson, sendJson, sendError, sendEmpty, getClientKey }) {
  initializeInvitationAdmin(db);
  const loginLimited = makeLoginLimiter();

  async function handle(request, response, requestUrl) {
    const subpath = requestUrl.pathname.slice(ADMIN_PREFIX.length) || '/';

    if (subpath === '/login' && request.method === 'POST') {
      if (!process.env.INVITATION_ADMIN_CODE_HASH) {
        sendError(response, 503, 'admin_not_configured', 'Invitation dashboard is not configured.');
        return;
      }
      if (loginLimited(getClientKey(request))) {
        sendError(response, 429, 'login_rate_limited', 'Too many login attempts. Please wait and try again.');
        return;
      }
      let payload;
      try {
        payload = await readJson(request);
      } catch (error) {
        sendError(response, error.code === 'body_too_large' ? 413 : 400, error.code || 'invalid_json', error.message);
        return;
      }
      if (!verifyAccessCode(payload.code)) {
        sendError(response, 401, 'invalid_code', 'The access code is incorrect.');
        return;
      }

      const token = crypto.randomBytes(32).toString('base64url');
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      db.prepare('DELETE FROM invitation_admin_sessions WHERE expires_at <= ?').run(createdAt);
      db.prepare(`
        INSERT INTO invitation_admin_sessions (token_hash, created_at, expires_at, last_seen_at)
        VALUES (?, ?, ?, ?)
      `).run(hashToken(token), createdAt, expiresAt, createdAt);
      response.setHeader('Set-Cookie', cookieHeader(token, SESSION_TTL_MS / 1000));
      sendJson(response, 200, { authenticated: true, expires_at: expiresAt });
      return;
    }

    if (subpath === '/logout' && request.method === 'POST') {
      const token = parseCookies(request.headers.cookie)[SESSION_COOKIE];
      if (token) db.prepare('DELETE FROM invitation_admin_sessions WHERE token_hash = ?').run(hashToken(token));
      response.setHeader('Set-Cookie', cookieHeader('', 0));
      sendJson(response, 200, { authenticated: false });
      return;
    }

    if (subpath === '/session' && request.method === 'GET') {
      const session = sessionFor(request, db);
      sendJson(response, 200, session ? { authenticated: true, expires_at: session.expires_at } : { authenticated: false });
      return;
    }

    if (!sameOrigin(request)) {
      sendError(response, 403, 'origin_forbidden', 'Request origin is not allowed.');
      return;
    }

    if (!sessionFor(request, db)) {
      sendError(response, 401, 'auth_required', 'Authentication is required.');
      return;
    }

    if (subpath === '/guests' && request.method === 'GET') {
      const guests = listGuests(db, requestUrl);
      sendJson(response, 200, { guests, total: guests.length });
      return;
    }

    if (subpath === '/guests' && request.method === 'POST') {
      let payload;
      try {
        payload = await readJson(request);
      } catch (error) {
        sendError(response, error.code === 'body_too_large' ? 413 : 400, error.code || 'invalid_json', error.message);
        return;
      }
      const validated = validateGuestInput(payload);
      if (validated.error) {
        sendError(response, 422, ...validated.error);
        return;
      }
      const createdAt = nowIso();
      const row = runTransaction(db, () => {
        const result = db.prepare(`
          INSERT INTO invitation_guests
            (raw_name, category, wording_style, second_name, with_partner, template_key, relationship_group, status, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?)
        `).run(
          validated.value.name,
          validated.value.category,
          validated.value.style,
          validated.value.secondName,
          validated.value.withPartner ? 1 : 0,
          validated.value.templateKey,
          validated.value.relationshipGroup,
          createdAt,
          createdAt,
        );
        const id = Number(result.lastInsertRowid);
        insertGuestTitles(db, id, validated.value.titles, createdAt);
        return db.prepare(`
          SELECT id, raw_name, category, wording_style, second_name, with_partner, template_key, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
          FROM invitation_guests WHERE id = ?
        `).get(id);
      });
      sendJson(response, 201, { guest: serializeGuest(db, row) });
      return;
    }

    const guestMatch = subpath.match(/^\/guests\/(\d+)$/);
    if (guestMatch && (request.method === 'PATCH' || request.method === 'DELETE')) {
      const id = Number(guestMatch[1]);
      let payload;
      try {
        payload = await readJson(request);
      } catch (error) {
        sendError(response, error.code === 'body_too_large' ? 413 : 400, error.code || 'invalid_json', error.message);
        return;
      }
      const currentRow = db.prepare(`
        SELECT id, raw_name, category, wording_style, second_name, with_partner, template_key, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
        FROM invitation_guests WHERE id = ?
      `).get(id);
      if (!currentRow) {
        sendError(response, 404, 'guest_not_found', 'Guest was not found.');
        return;
      }
      if (!Number.isInteger(payload.version)) {
        sendError(response, 400, 'version_required', 'A record version is required.');
        return;
      }
      if (payload.version !== Number(currentRow.version)) {
        sendError(response, 409, 'version_conflict', 'This guest changed on another device.');
        return;
      }

      if (request.method === 'DELETE') {
        db.prepare('DELETE FROM invitation_guests WHERE id = ? AND version = ?').run(id, payload.version);
        sendEmpty(response, 204);
        return;
      }

      const current = { ...currentRow, titles: titleRowsFor(db, id) };
      const validated = validateGuestInput(payload, current);
      if (validated.error) {
        sendError(response, 422, ...validated.error);
        return;
      }
      const requestedStatus = payload.status === undefined ? current.status : payload.status;
      if (!validateStatus(requestedStatus)) {
        sendError(response, 422, 'status_invalid', 'Delivery status is invalid.');
        return;
      }
      const status = current.status === 'sent' && requestedStatus === 'copied' ? 'sent' : requestedStatus;
      const updatedAt = nowIso();
      const copiedAt = status === 'copied' ? (current.copied_at || updatedAt) : null;
      const sentAt = status === 'sent' ? (current.sent_at || updatedAt) : null;
      const row = runTransaction(db, () => {
        db.prepare(`
          UPDATE invitation_guests
          SET raw_name = ?, category = ?, wording_style = ?, second_name = ?, with_partner = ?,
              template_key = ?, relationship_group = ?, status = ?, version = version + 1,
              copied_at = ?, sent_at = ?, updated_at = ?
          WHERE id = ? AND version = ?
        `).run(
          validated.value.name,
          validated.value.category,
          validated.value.style,
          validated.value.secondName,
          validated.value.withPartner ? 1 : 0,
          validated.value.templateKey,
          validated.value.relationshipGroup,
          status,
          copiedAt,
          sentAt,
          updatedAt,
          id,
          payload.version,
        );
        db.prepare('DELETE FROM invitation_guest_titles WHERE guest_id = ?').run(id);
        insertGuestTitles(db, id, validated.value.titles, updatedAt);
        return db.prepare(`
          SELECT id, raw_name, category, wording_style, second_name, with_partner, template_key, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
          FROM invitation_guests WHERE id = ?
        `).get(id);
      });
      sendJson(response, 200, { guest: serializeGuest(db, row) });
      return;
    }

    if (subpath === '/titles' && request.method === 'GET') {
      const titles = db.prepare(`
        SELECT id, label, placement, is_default FROM invitation_titles
        WHERE is_active = 1 ORDER BY is_default DESC, id ASC
      `).all().map((row) => ({
        id: Number(row.id),
        label: row.label,
        placement: row.placement || 'prefix',
        is_default: Boolean(row.is_default),
      }));
      sendJson(response, 200, { titles });
      return;
    }

    if (subpath === '/titles' && request.method === 'POST') {
      let payload;
      try {
        payload = await readJson(request);
      } catch (error) {
        sendError(response, error.code === 'body_too_large' ? 413 : 400, error.code || 'invalid_json', error.message);
        return;
      }
      const label = textValue(payload.label, MAX_TITLE_LENGTH);
      if (!label) {
        sendError(response, 422, 'title_required', 'Title is required.');
        return;
      }
      const placement = PLACEMENTS.has(payload.placement) ? payload.placement : 'prefix';
      const createdAt = nowIso();
      // An existing label keeps the placement it was created with; the same
      // degree cannot be a prefix for one guest and a suffix for another.
      db.prepare(`
        INSERT INTO invitation_titles (label, normalized_label, placement, is_default, is_active, created_at)
        VALUES (?, ?, ?, 0, 1, ?)
        ON CONFLICT(normalized_label) DO UPDATE SET is_active = 1
      `).run(label, normalizeKey(label), placement, createdAt);
      const title = db.prepare('SELECT id, label, placement, is_default FROM invitation_titles WHERE normalized_label = ?').get(normalizeKey(label));
      sendJson(response, 201, {
        title: {
          id: Number(title.id),
          label: title.label,
          placement: title.placement || 'prefix',
          is_default: Boolean(title.is_default),
        },
      });
      return;
    }

    if (subpath === '/settings' && request.method === 'GET') {
      sendJson(response, 200, { settings: readSettings(db) });
      return;
    }

    if (subpath === '/settings/message-template' && request.method === 'PUT') {
      let payload;
      try {
        payload = await readJson(request);
      } catch (error) {
        sendError(response, error.code === 'body_too_large' ? 413 : 400, error.code || 'invalid_json', error.message);
        return;
      }
      const current = readSettings(db);
      const templates = { ...current.templates, ...(payload.templates || {}) };
      for (const key of TEMPLATE_KEYS) {
        const validationError = validateTemplate(templates[key]);
        if (validationError) {
          sendError(response, 422, ...validationError);
          return;
        }
      }
      if (!Number.isInteger(payload.version) || payload.version !== current.version) {
        sendError(response, 409, 'version_conflict', 'The message template changed on another device.');
        return;
      }
      const updatedAt = nowIso();
      db.prepare(`
        UPDATE invitation_settings
        SET message_template_friend = ?, message_template_parent = ?, version = version + 1, updated_at = ?
        WHERE id = 1 AND version = ?
      `).run(templates.friend, templates.parent, updatedAt, payload.version);
      sendJson(response, 200, { settings: readSettings(db) });
      return;
    }

    response.setHeader('Allow', 'GET, POST, PATCH, PUT, DELETE');
    sendError(response, 405, 'method_not_allowed', 'Method not allowed.');
  }

  return { handle };
}

module.exports = {
  ADMIN_PREFIX,
  createInvitationAdmin,
};
