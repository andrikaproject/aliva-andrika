import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../api/backup.cjs', import.meta.url));

test('backup includes committed WAL data, is private, and restores independently', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'aliva-backup-test-'));
  const source = path.join(directory, 'source.sqlite');
  const destination = path.join(directory, 'backup.sqlite');
  const db = new DatabaseSync(source);
  try {
    db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE guestbook_entries (id INTEGER PRIMARY KEY, message TEXT)');
    db.prepare('INSERT INTO guestbook_entries VALUES (?, ?)').run(1, 'Staging-only backup test');
    const result = spawnSync(process.execPath, [script, source, destination], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.integrity, 'ok');
    assert.deepEqual(report.ids, [1]);
    assert.equal(statSync(destination).mode & 0o777, 0o600);
    assert.ok(!result.stdout.includes('Staging-only'));
    const restored = new DatabaseSync(destination);
    assert.equal(restored.prepare('SELECT message FROM guestbook_entries').get().message, 'Staging-only backup test');
    restored.exec('DELETE FROM guestbook_entries');
    restored.close();
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM guestbook_entries').get().count, 1);
    const duplicate = spawnSync(process.execPath, [script, source, destination], { encoding: 'utf8' });
    assert.notEqual(duplicate.status, 0);
  } finally {
    db.close();
    rmSync(directory, { recursive: true });
  }
});
