import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calendarEvent } from '../src/data/wedding.ts';
import { googleCalendarUrl } from '../src/lib/google-calendar.ts';

const event = {
  title: 'Pernikahan Andrika & Aliva',
  ...calendarEvent,
  details: 'Akad Nikah: 07:00 – 10:00 WIB\nResepsi: 10:30 – 14:00 WIB',
  location: 'V Hotel & Residence, Bandung',
};

test('opens the Google Calendar template with the event prefilled', () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('text'), event.title);
  assert.equal(url.searchParams.get('details'), event.details);
  assert.equal(url.searchParams.get('location'), event.location);
  assert.equal(url.searchParams.get('ctz'), 'Asia/Jakarta');
});

test('the wedding block is 07:00–14:00 WIB, sent as UTC', () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.searchParams.get('dates'), '20261017T000000Z/20261017T070000Z');
});

test('an ampersand in the title cannot split the query string', () => {
  assert.ok(googleCalendarUrl(event).includes('text=Pernikahan+Andrika+%26+Aliva'));
});

test('optional fields are left out rather than sent empty', () => {
  const url = new URL(googleCalendarUrl({ title: 'x', ...calendarEvent }));
  assert.equal(url.searchParams.has('details'), false);
  assert.equal(url.searchParams.has('location'), false);
});

test('a malformed timestamp fails the build instead of shipping a broken link', () => {
  assert.throws(() => googleCalendarUrl({ ...event, start: 'not-a-date' }), /Invalid calendar timestamp/);
});
