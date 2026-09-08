/**
 * HTTP client for the guestbook. Owns transport and response shape only —
 * rendering and copy live in the RSVP module.
 */

export type Attendance = 'attending' | 'not_attending';

export interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  attendance: Attendance;
  guests: number;
  created_at: string;
}

export interface GuestbookSubmission {
  name: string;
  message: string;
  attendance: Attendance;
  guests: number;
}

export type GuestbookErrorCode =
  | 'rate_limited'
  | 'name_required'
  | 'message_required'
  | 'attendance_invalid'
  | 'guests_invalid'
  | 'invalid_json'
  | 'body_too_large'
  | 'server_error'
  | 'invalid_response'
  | 'network'
  | 'timeout';

export class GuestbookError extends Error {
  readonly code: GuestbookErrorCode;
  /** True when the request may have reached the server despite the failure. */
  readonly maybeDelivered: boolean;

  constructor(code: GuestbookErrorCode, message: string, maybeDelivered = false) {
    super(message);
    this.name = 'GuestbookError';
    this.code = code;
    this.maybeDelivered = maybeDelivered;
  }
}

const ENDPOINT = '/api/guestbook';
const TIMEOUT_MS = 12_000;

function isAttendance(value: unknown): value is Attendance {
  return value === 'attending' || value === 'not_attending';
}

function isEntry(value: unknown): value is GuestbookEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === 'number' &&
    typeof entry.name === 'string' &&
    typeof entry.message === 'string' &&
    typeof entry.guests === 'number' &&
    typeof entry.created_at === 'string' &&
    isAttendance(entry.attendance)
  );
}

/** Manual timeout: AbortSignal.any is still too new for the guest list. */
async function request(init: RequestInit, external?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), TIMEOUT_MS);
  const forward = () => controller.abort(external?.reason);
  external?.addEventListener('abort', forward, { once: true });

  try {
    return await fetch(ENDPOINT, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
    external?.removeEventListener('abort', forward);
  }
}

function codeFromResponse(status: number, body: unknown): GuestbookErrorCode {
  const declared = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).code : undefined;
  if (typeof declared === 'string') return declared as GuestbookErrorCode;
  if (status === 429) return 'rate_limited';
  return 'server_error';
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function fetchEntries(signal?: AbortSignal): Promise<GuestbookEntry[]> {
  let response: Response;
  try {
    response = await request({ method: 'GET', headers: { Accept: 'application/json' } }, signal);
  } catch (error) {
    throw asTransportError(error, false);
  }

  const body = await readJson(response);
  if (!response.ok) throw new GuestbookError(codeFromResponse(response.status, body), 'Guestbook request failed');

  const entries = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).entries : undefined;
  if (!Array.isArray(entries)) throw new GuestbookError('invalid_response', 'Guestbook response had no entries array');

  return entries.filter(isEntry);
}

export async function submitEntry(
  submission: GuestbookSubmission,
  signal?: AbortSignal,
): Promise<GuestbookEntry> {
  let response: Response;
  try {
    response = await request(
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(submission),
      },
      signal,
    );
  } catch (error) {
    // The POST may well have been stored before the connection dropped, so
    // this is never retried automatically.
    throw asTransportError(error, true);
  }

  const body = await readJson(response);
  if (!response.ok) throw new GuestbookError(codeFromResponse(response.status, body), 'Guestbook submission rejected');

  const entry = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).entry : undefined;
  if (!isEntry(entry)) throw new GuestbookError('invalid_response', 'Guestbook response had no entry', true);

  return entry;
}

function asTransportError(error: unknown, maybeDelivered: boolean): GuestbookError {
  const name = error instanceof Error ? error.name : '';
  if (name === 'TimeoutError') return new GuestbookError('timeout', 'Guestbook request timed out', maybeDelivered);
  if (name === 'AbortError') return new GuestbookError('network', 'Guestbook request was cancelled', false);
  return new GuestbookError('network', 'Guestbook request could not reach the server', maybeDelivered);
}
