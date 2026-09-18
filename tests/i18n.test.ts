import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dictionaries, translate } from '../src/i18n/index.ts';

function flatten(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

test('both locales define exactly the same keys', () => {
  assert.deepEqual(flatten(dictionaries.id).sort(), flatten(dictionaries.en).sort());
});

test('no dictionary value smuggles markup into the page', () => {
  // Every string reaches the DOM through textContent. A stray tag or entity
  // would be shown to a guest verbatim.
  for (const locale of ['id', 'en'] as const) {
    for (const key of flatten(dictionaries[locale])) {
      const value = translate(locale, key);
      assert.ok(!/<[a-z/]/i.test(value), `${locale}.${key} contains markup: ${value}`);
      assert.ok(!/&[a-z]+;/i.test(value), `${locale}.${key} contains an HTML entity: ${value}`);
    }
  }
});

test('interpolates named values and leaves the rest alone', () => {
  assert.equal(translate('id', 'cover.guestGreetingPrefix'), 'Kepada');
  assert.equal(translate('id', 'cover.guestGreetingName', { name: 'Budi' }), 'Budi & Pasangan');
  assert.equal(translate('en', 'cover.groupGreetingPrefix'), 'Dear');
  assert.equal(translate('en', 'cover.groupGreetingName', { name: 'Keluarga Sari' }), 'The Keluarga Sari Family');
  assert.equal(translate('id', 'gallery.photoCount', { count: 13 }), '13 foto');
});

test('an unknown key falls back to the default locale, then to itself', () => {
  assert.equal(translate('en', 'nope.missing'), 'nope.missing');
});
