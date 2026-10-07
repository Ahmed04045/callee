// RFC 5545. The current event schema stores Qatar local dates/times.
// Export timed events in UTC so importing in another timezone stays correct.
const stamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escapeText = (text) => String(text ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/[,;]/g, '\\$&');

// Fold at 75 UTF-8 octets without splitting an Arabic character.
function fold(line) {
  const encoder = new TextEncoder();
  let result = '';
  let length = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (length + size > 75) { result += '\r\n '; length = 1; }
    result += char;
    length += size;
  }
  return result;
}

export function eventCalendar(event, origin, now = new Date()) {
  const date = event.event_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new Error('Invalid event date');
  }
  const time = event.start_time;
  if (time && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.test(time)) throw new Error('Invalid event time');
  const url = new URL(`/events/${encodeURIComponent(event.id)}`, origin).href;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Circosodal//Events//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${encodeURIComponent(event.id)}@${new URL(origin).host}`,
    `DTSTAMP:${stamp(now)}`,
    time ? `DTSTART:${stamp(new Date(`${date}T${time}+03:00`))}` : `DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`,
    `SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`, `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  // No invented end time: the database does not currently store event duration.
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
