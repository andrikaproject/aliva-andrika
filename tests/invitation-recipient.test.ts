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
