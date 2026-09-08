import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countdownTarget } from '../src/data/wedding.ts';
import { remainingUntil } from '../src/scripts/countdown.ts';

const HOUR = 3_600_000;

test('the target carries an explicit West Indonesia offset', () => {
  assert.equal(countdownTarget, '2026-10-17T08:30:00+07:00');
  assert.equal(new Date(countdownTarget).toISOString(), '2026-10-17T01:30:00.000Z');
});

test('a guest in Jakarta and a guest in Berlin see the same remainder', () => {
  // Both browsers evaluate Date.now() to the same instant; only their local
  // rendering differs. The pre-refactor target parsed as local time, which
  // made this assertion fail by seven hours.
  const now = Date.parse('2026-10-16T01:30:00.000Z');
  assert.deepEqual(remainingUntil(countdownTarget, now), {
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});

test('splits a remainder into days, hours, minutes and seconds', () => {
  const now = new Date(countdownTarget).getTime() - (2 * 24 * HOUR + 3 * HOUR + 4 * 60_000 + 5_000);
  assert.deepEqual(remainingUntil(countdownTarget, now), {
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
  });
});

test('floors at zero once the day arrives', () => {
  const after = new Date(countdownTarget).getTime() + 10 * HOUR;
  assert.deepEqual(remainingUntil(countdownTarget, after), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
});
