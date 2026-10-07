import test from 'node:test';
import assert from 'node:assert/strict';
import { eventCalendar } from '../src/lib/eventCalendar.js';

const base = { id: '123', title: 'Community meetup', event_date: '2026-10-07', start_time: '18:30:00', location: 'Doha' };
const now = new Date('2026-10-01T12:00:00Z');
const make = (changes = {}) => eventCalendar({ ...base, ...changes }, 'https://example.org', now);

test('Qatar start time is exported as UTC independently of device timezone', () => {
  assert.match(make(), /DTSTART:20261007T153000Z\r\n/);
  assert.match(make({ start_time: '01:15' }), /DTSTART:20261006T221500Z/);
  assert.match(make(), /UID:123@example.org/);
  assert.doesNotMatch(make(), /DTEND|DURATION/);
});

test('missing start time produces a date-only event', () => {
  assert.match(make({ start_time: null }), /DTSTART;VALUE=DATE:20261007\r\n/);
});

test('escapes text and newlines to prevent calendar property injection', () => {
  const calendar = make({ title: 'Hello, all; \\ friends\r\nATTENDEE:someone@example.org' });
  const unfolded = calendar.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('SUMMARY:Hello\\, all\\; \\\\ friends\\nATTENDEE:someone@example.org'));
  assert.doesNotMatch(calendar, /\r\nATTENDEE:/);
});

test('long Arabic text folds on UTF-8 boundaries and round trips intact', () => {
  const title = 'أهلاً بكم في الفعالية '.repeat(15);
  const calendar = make({ title });
  for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
  assert.ok(calendar.replace(/\r\n /g, '').includes(`SUMMARY:${title}\r\n`));
});

test('rejects invalid dates and times', () => {
  for (const event_date of [null, 'bad', '2026-02-30', '2026-13-01']) assert.throws(() => make({ event_date }));
  for (const start_time of ['25:00', '10:90', '18:30\r\nATTENDEE:bad']) assert.throws(() => make({ start_time }));
});
