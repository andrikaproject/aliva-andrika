import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildInvitationUrl,
  displayRecipientName,
  normalizeGroupName,
  normalizeRecipientTitles,
  normalizeTitles,
  recipientTitlesFromParams,
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
    'Ibu Sari Beserta Keluarga',
  );
  assert.equal(
    displayRecipientName({ name: 'Dodi', category: 'personal', style: 'bapak_family' }),
    'Bapak Dodi Beserta Keluarga',
  );
  assert.equal(
    displayRecipientName({ ...both, style: 'ibu_bapak_family' }),
    'Ibu Sari & Bapak Dodi Beserta Keluarga',
  );
  assert.equal(
    displayRecipientName({ name: 'Dodi', category: 'personal', secondName: 'Sari', style: 'bapak_ibu_family' }),
    'Bapak Dodi & Ibu Sari Beserta Keluarga',
  );
});

test('a style ignores the category it is filed under, but wears its titles', () => {
  assert.equal(
    displayRecipientName({ name: 'Sari', category: 'titled', titles: ['Dr.'], style: 'ibu_family' }),
    'Ibu Dr. Sari Beserta Keluarga',
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
    'Ibu Sari Beserta Keluarga',
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

test('a degree sits behind the name, after a comma', () => {
  assert.equal(
    displayRecipientName({
      name: 'Budi Santoso',
      category: 'titled',
      titles: [{ label: 'Dr.' }, { label: 'S.Kom', placement: 'suffix' }, { label: 'M.M.', placement: 'suffix' }],
    }),
    'Dr. Budi Santoso, S.Kom, M.M. & Pasangan',
  );
});

test('each person a style names carries their own titles', () => {
  assert.equal(
    displayRecipientName({
      name: 'Sari',
      category: 'personal',
      secondName: 'Dodi',
      style: 'ibu_bapak_family',
      titles: [
        { label: 'Dr.', person: 1 },
        { label: 'S.Kom', placement: 'suffix', person: 1 },
        { label: 'S.T', placement: 'suffix', person: 2 },
      ],
    }),
    'Ibu Dr. Sari, S.Kom & Bapak Dodi, S.T Beserta Keluarga',
  );
});

test('titles are capped per person rather than across the pair', () => {
  const many = Array.from({ length: 8 }, (_, index) => ({ label: `G${index}`, person: 2 as const }));
  assert.equal(normalizeRecipientTitles(many).length, 6);
  assert.equal(normalizeRecipientTitles([...many, { label: 'Dr.', person: 1 }]).length, 7);
});

test('a bare string stays what it always was: a prefix on the first person', () => {
  assert.deepEqual(normalizeRecipientTitles(['Bapak', '<Dr.>', '']), [
    { label: 'Bapak', placement: 'prefix', person: 1 },
    { label: 'Dr.', placement: 'prefix', person: 1 },
  ]);
});

test('links carry each placement under its own parameter', () => {
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', {
      name: 'Sari',
      category: 'personal',
      secondName: 'Dodi',
      style: 'ibu_bapak_family',
      titles: [
        { label: 'Dr.', person: 1 },
        { label: 'S.Kom', placement: 'suffix', person: 1 },
        { label: 'S.T', placement: 'suffix', person: 2 },
      ],
    }),
    'https://andrika-aliva.my.id/?to=Sari&style=ibu_bapak_family&title=Dr.&title_suffix=S.Kom&to2=Dodi&title2_suffix=S.T',
  );
  // A one-name style has nobody to hang the second person's titles on.
  assert.equal(
    buildInvitationUrl('https://andrika-aliva.my.id', {
      name: 'Sari',
      category: 'personal',
      secondName: 'Dodi',
      style: 'ibu_family',
      titles: [{ label: 'S.T', placement: 'suffix', person: 2 }],
    }),
    'https://andrika-aliva.my.id/?to=Sari&style=ibu_family',
  );
});

test('a link round-trips its titles back onto the names', () => {
  const url = buildInvitationUrl('https://andrika-aliva.my.id', {
    name: 'Sari',
    category: 'personal',
    secondName: 'Dodi',
    style: 'ibu_bapak_family',
    titles: [
      { label: 'Dr.', person: 1 },
      { label: 'S.Kom', placement: 'suffix', person: 1 },
      { label: 'S.T', placement: 'suffix', person: 2 },
    ],
  });
  const params = new URL(url).searchParams;
  assert.equal(
    displayRecipientName({
      name: params.get('to') ?? '',
      category: 'personal',
      secondName: params.get('to2') ?? '',
      style: 'ibu_bapak_family',
      titles: recipientTitlesFromParams(params),
    }),
    'Ibu Dr. Sari, S.Kom & Bapak Dodi, S.T Beserta Keluarga',
  );
});
