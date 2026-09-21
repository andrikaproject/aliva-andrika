import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildInvitationUrl,
  displayRecipientName,
  normalizeGroupName,
  normalizeTitles,
} from '../src/lib/invitation-recipient.ts';

test('renders the three invitation categories in Indonesian', () => {
  assert.equal(displayRecipientName({ name: 'Budi Santoso', category: 'personal' }), 'Budi Santoso & Pasangan');
  assert.equal(displayRecipientName({ name: 'Cimahi', category: 'group' }), 'Keluarga Besar Cimahi');
  assert.equal(
    displayRecipientName({ name: 'Budi Santoso', category: 'titled', titles: ['Bapak', 'Dr.'] }),
    'Bapak Dr. Budi Santoso & Pasangan',
  );
});

test('normalizes a legacy group value without duplicating its prefix', () => {
  assert.equal(normalizeGroupName(' Keluarga Besar Cimahi '), 'Cimahi');
  assert.equal(displayRecipientName({ name: 'Keluarga Besar Cimahi', category: 'group' }), 'Keluarga Besar Cimahi');
});

test('sanitizes and limits ordered titles', () => {
  assert.deepEqual(normalizeTitles(['Bapak', '<Dr.>', '', 'Prof.']), ['Bapak', 'Dr.', 'Prof.']);
});

test('builds encoded, compatible invitation URLs', () => {
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', { name: 'Cimahi', category: 'group' }),
    'https://andrika-aliva.my.id/?to=Cimahi&type=group',
  );
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', {
      name: 'Budi Santoso',
      category: 'titled',
      titles: ['Bapak', 'Dr.'],
    }),
    'https://andrika-aliva.my.id/?to=Budi+Santoso&type=titled&title=Bapak&title=Dr.',
  );
});

test('the wording styles name one or both parents, then the family', () => {
  const both = { name: 'Sari', category: 'personal', secondName: 'Dodi' } as const;
  assert.equal(
    displayRecipientName({ name: 'Sari', category: 'personal', style: 'ibu_family' }),
    'Ibu Sari Beserta Keluarga Besar',
  );
  assert.equal(
    displayRecipientName({ name: 'Dodi', category: 'personal', style: 'bapak_family' }),
    'Bapak Dodi Beserta Keluarga Besar',
  );
  assert.equal(
    displayRecipientName({ ...both, style: 'ibu_bapak_family' }),
    'Ibu Sari & Bapak Dodi Beserta Keluarga Besar',
  );
  assert.equal(
    displayRecipientName({ name: 'Dodi', category: 'personal', secondName: 'Sari', style: 'bapak_ibu_family' }),
    'Bapak Dodi & Ibu Sari Beserta Keluarga Besar',
  );
});

test('a style ignores the category and the titles it is filed with', () => {
  assert.equal(
    displayRecipientName({ name: 'Sari', category: 'titled', titles: ['Dr.'], style: 'ibu_family' }),
    'Ibu Sari Beserta Keluarga Besar',
  );
});

test('a style renders in English without borrowing Indonesian honorifics', () => {
  assert.equal(
    displayRecipientName({ name: 'Sari', category: 'personal', secondName: 'Dodi', style: 'ibu_bapak_family' }, 'en'),
    'Mrs. Sari & Mr. Dodi and Family',
  );
});

test('a half-filled two-name style still previews the name it has', () => {
  assert.equal(
    displayRecipientName({ name: 'Sari', category: 'personal', style: 'ibu_bapak_family' }),
    'Ibu Sari Beserta Keluarga Besar',
  );
  assert.equal(displayRecipientName({ name: '', category: 'personal', style: 'ibu_family' }), '');
});

test('style links carry the style and the second name', () => {
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', {
      name: 'Sari',
      category: 'personal',
      secondName: 'Dodi',
      style: 'ibu_bapak_family',
    }),
    'https://andrika-aliva.my.id/?to=Sari&style=ibu_bapak_family&to2=Dodi',
  );
  // A one-name style drops a stray second name rather than linking to it.
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', {
      name: 'Sari',
      category: 'personal',
      secondName: 'Dodi',
      style: 'ibu_family',
    }),
    'https://andrika-aliva.my.id/?to=Sari&style=ibu_family',
  );
});

test('the default style keeps the links already shared with guests', () => {
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', { name: 'Cimahi', category: 'group', style: 'default' }),
    'https://andrika-aliva.my.id/?to=Cimahi&type=group',
  );
});
