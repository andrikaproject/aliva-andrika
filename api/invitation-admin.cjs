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
const TITLES = ['Bapak', 'Ibu', 'Saudara', 'Saudari', 'H.', 'Hj.', 'Dr.', 'dr.', 'Prof.', 'Ir.'];

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
      is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invitation_guest_titles (
      guest_id INTEGER NOT NULL REFERENCES invitation_guests(id) ON DELETE CASCADE,
      title_id INTEGER NOT NULL REFERENCES invitation_titles(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL CHECK (position >= 0),
      PRIMARY KEY (guest_id, position),
      UNIQUE (guest_id, title_id)
    );

    CREATE TABLE IF NOT EXISTS invitation_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      message_template TEXT NOT NULL DEFAULT '',
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

  const createdAt = new Date().toISOString();
  const insertTitle = db.prepare(`
    INSERT OR IGNORE INTO invitation_titles (label, normalized_label, is_default, created_at)
    VALUES (?, ?, 1, ?)
  `);
  for (const label of TITLES) insertTitle.run(label, normalizeKey(label), createdAt);
  db.prepare(`
    INSERT OR IGNORE INTO invitation_settings (id, message_template, version, updated_at)
    VALUES (1, '', 1, ?)
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

function normalizeTitles(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => textValue(value, MAX_TITLE_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TITLES);
}

function titleRowsFor(db, guestId) {
  return db.prepare(`
    SELECT t.id, t.label
    FROM invitation_guest_titles gt
    JOIN invitation_titles t ON t.id = gt.title_id
    WHERE gt.guest_id = ?
    ORDER BY gt.position ASC
  `).all(guestId).map((row) => ({ id: Number(row.id), label: row.label }));
}

function serializeGuest(db, row) {
  return {
    id: Number(row.id),
    name: row.raw_name,
    category: row.category,
    wording_style: row.wording_style || 'default',
    second_name: row.second_name || '',
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
    INSERT INTO invitation_titles (label, normalized_label, is_default, is_active, created_at)
    VALUES (?, ?, 0, 1, ?)
    ON CONFLICT(normalized_label) DO UPDATE SET is_active = 1
  `);
  const findTitle = db.prepare('SELECT id FROM invitation_titles WHERE normalized_label = ?');
  const linkTitle = db.prepare(`
    INSERT INTO invitation_guest_titles (guest_id, title_id, position) VALUES (?, ?, ?)
  `);
  titles.forEach((label, position) => {
    const normalized = normalizeKey(label);
    upsertTitle.run(label, normalized, createdAt);
    const title = findTitle.get(normalized);
    linkTitle.run(guestId, title.id, position);
  });
}

function validateGuestInput(payload, current = {}) {
  const name = payload.name === undefined
    ? textValue(current.name || current.raw_name || '', MAX_NAME_LENGTH)
    : textValue(payload.name, MAX_NAME_LENGTH);
  const category = payload.category === undefined ? current.category : payload.category;
  const relationshipGroup = payload.relationship_group === undefined
    ? current.relationship_group
    : payload.relationship_group;
  const titles = payload.titles === undefined
    ? (current.titles || []).map((title) => title.label || title)
    : normalizeTitles(payload.titles);
  const style = payload.wording_style === undefined ? (current.wording_style || 'default') : payload.wording_style;
  const secondName = payload.second_name === undefined
    ? textValue(current.second_name || '', MAX_NAME_LENGTH)
    : textValue(payload.second_name, MAX_NAME_LENGTH);

  if (!name) return { error: ['name_required', 'Name is required.'] };
  if (!validateWordingStyle(style)) return { error: ['wording_style_invalid', 'Wording style is invalid.'] };
  if (!validateGroup(relationshipGroup)) return { error: ['relationship_group_invalid', 'Relationship group is invalid.'] };

  if (style !== 'default') {
    if (titles.length > 0) return { error: ['titles_not_allowed', 'Titles are only allowed for Personal Bergelar.'] };
    if (WORDING_STYLES.get(style) > 1 && !secondName) {
      return { error: ['second_name_required', 'The second name is required for this wording style.'] };
    }
    // A style carries its own form of address, so the category it is filed
    // under stays neutral rather than contradicting the printed wording.
    return { value: { name, category: 'personal', relationshipGroup, titles: [], style, secondName } };
  }

  if (!validateCategory(category)) return { error: ['category_invalid', 'Invitation category is invalid.'] };
  if (category === 'titled' && titles.length === 0) return { error: ['titles_required', 'At least one title is required.'] };
  if (category !== 'titled' && titles.length > 0) return { error: ['titles_not_allowed', 'Titles are only allowed for Personal Bergelar.'] };
  return { value: { name, category, relationshipGroup, titles, style, secondName: '' } };
}

function listGuests(db, url) {
  const clauses = [];
  const values = [];
  const search = textValue(url.searchParams.get('search') || '', MAX_NAME_LENGTH);
  const category = url.searchParams.get('category');
  const wordingStyle = url.searchParams.get('wording_style');
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
    SELECT id, raw_name, category, wording_style, second_name, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
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
            (raw_name, category, wording_style, second_name, relationship_group, status, version, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', 1, ?, ?)
        `).run(
          validated.value.name,
          validated.value.category,
          validated.value.style,
          validated.value.secondName,
          validated.value.relationshipGroup,
          createdAt,
          createdAt,
        );
        const id = Number(result.lastInsertRowid);
        insertGuestTitles(db, id, validated.value.titles, createdAt);
        return db.prepare(`
          SELECT id, raw_name, category, wording_style, second_name, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
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
        SELECT id, raw_name, category, wording_style, second_name, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
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
          SET raw_name = ?, category = ?, wording_style = ?, second_name = ?, relationship_group = ?,
              status = ?, version = version + 1,
              copied_at = ?, sent_at = ?, updated_at = ?
          WHERE id = ? AND version = ?
        `).run(
          validated.value.name,
          validated.value.category,
          validated.value.style,
          validated.value.secondName,
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
          SELECT id, raw_name, category, wording_style, second_name, relationship_group, status, version, copied_at, sent_at, created_at, updated_at
          FROM invitation_guests WHERE id = ?
        `).get(id);
      });
      sendJson(response, 200, { guest: serializeGuest(db, row) });
      return;
    }

    if (subpath === '/titles' && request.method === 'GET') {
      const titles = db.prepare(`
        SELECT id, label, is_default FROM invitation_titles WHERE is_active = 1 ORDER BY is_default DESC, id ASC
      `).all().map((row) => ({ id: Number(row.id), label: row.label, is_default: Boolean(row.is_default) }));
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
      const createdAt = nowIso();
      db.prepare(`
        INSERT INTO invitation_titles (label, normalized_label, is_default, is_active, created_at)
        VALUES (?, ?, 0, 1, ?)
        ON CONFLICT(normalized_label) DO UPDATE SET is_active = 1
      `).run(label, normalizeKey(label), createdAt);
      const title = db.prepare('SELECT id, label, is_default FROM invitation_titles WHERE normalized_label = ?').get(normalizeKey(label));
      sendJson(response, 201, { title: { id: Number(title.id), label: title.label, is_default: Boolean(title.is_default) } });
      return;
    }

    if (subpath === '/settings' && request.method === 'GET') {
      const settings = db.prepare('SELECT message_template, version, updated_at FROM invitation_settings WHERE id = 1').get();
      sendJson(response, 200, { settings });
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
      const validationError = validateTemplate(payload.template);
      if (validationError) {
        sendError(response, 422, ...validationError);
        return;
      }
      const current = db.prepare('SELECT version FROM invitation_settings WHERE id = 1').get();
      if (!Number.isInteger(payload.version) || payload.version !== Number(current.version)) {
        sendError(response, 409, 'version_conflict', 'The message template changed on another device.');
        return;
      }
      const updatedAt = nowIso();
      db.prepare(`
        UPDATE invitation_settings SET message_template = ?, version = version + 1, updated_at = ?
        WHERE id = 1 AND version = ?
      `).run(payload.template, updatedAt, payload.version);
      const settings = db.prepare('SELECT message_template, version, updated_at FROM invitation_settings WHERE id = 1').get();
      sendJson(response, 200, { settings });
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
