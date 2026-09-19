export interface CalendarEventInput {
  title: string;
  /** ISO timestamps carrying their own offset, e.g. `2026-10-17T07:00:00+07:00`. */
  start: string;
  end: string;
  /** IANA zone the entry is displayed in, e.g. `Asia/Jakarta`. */
  timeZone: string;
  details?: string;
  location?: string;
}

/** `20261017T000000Z` — the compact UTC form Google's template expects. */
function toCompactUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid calendar timestamp: ${iso}`);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Link that opens Google Calendar with the event prefilled; the guest only
 * has to press save.
 *
 * Times are sent in UTC so the entry lands on the same instant wherever the
 * guest's phone thinks it is — the same reason the countdown target carries
 * an explicit offset.
 */
export function googleCalendarUrl(event: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toCompactUtc(event.start)}/${toCompactUtc(event.end)}`,
    ctz: event.timeZone,
  });
  if (event.details) params.set('details', event.details);
  if (event.location) params.set('location', event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
