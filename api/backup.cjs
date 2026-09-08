const { DatabaseSync } = require('node:sqlite');
const { createHash } = require('node:crypto');
const fs = require('node:fs');

const [source, destination] = process.argv.slice(2);
if (!source || !fs.statSync(source).isFile()) throw new Error('An existing source database is required');
const db = new DatabaseSync(source, { readOnly: true });
db.exec('PRAGMA busy_timeout = 10000');
let verified = db;
if (destination) {
  if (fs.existsSync(destination)) throw new Error('Backup destination already exists');
  db.prepare('VACUUM INTO ?').run(destination);
  fs.chmodSync(destination, 0o600);
  verified = new DatabaseSync(destination, { readOnly: true });
}
const integrity = verified.prepare('PRAGMA integrity_check').all();
if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
  throw new Error('Database integrity check failed');
}
const entries = verified.prepare('SELECT * FROM guestbook_entries ORDER BY id').all();
console.log(JSON.stringify({
  integrity: 'ok',
  records: entries.length,
  ids: entries.map((entry) => entry.id),
  sha256: createHash('sha256').update(JSON.stringify(entries)).digest('hex'),
}));
if (verified !== db) verified.close();
db.close();

