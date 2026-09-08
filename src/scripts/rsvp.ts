import type { Attendance, GuestbookEntry, GuestbookErrorCode, GuestbookSubmission } from '../lib/guestbook-api.ts';
import { GuestbookError, fetchEntries, submitEntry } from '../lib/guestbook-api.ts';
import { rsvp as rsvpRules } from '../data/wedding.ts';
import { getLocale, onLocaleChange, t } from './locale.ts';

/** What the guestbook list is currently showing. Never inferred from data. */
type ListState =
  | { status: 'loading' }
  | { status: 'ready'; entries: GuestbookEntry[] }
  | { status: 'error'; code: GuestbookErrorCode };

type FormState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'error'; code: GuestbookErrorCode };

const MAX_RENDERED_ENTRIES = 50;

const ERROR_KEYS: Record<GuestbookErrorCode, string> = {
  rate_limited: 'rsvp.errorRateLimited',
  name_required: 'rsvp.errorNameRequired',
  message_required: 'rsvp.errorMessageRequired',
  attendance_invalid: 'rsvp.errorAttendance',
  guests_invalid: 'rsvp.errorGuests',
  invalid_json: 'rsvp.errorGeneric',
  body_too_large: 'rsvp.errorGeneric',
  server_error: 'rsvp.errorGeneric',
  invalid_response: 'rsvp.errorGeneric',
  network: 'rsvp.errorOffline',
  timeout: 'rsvp.errorOffline',
};

export function initRsvp(): void {
  const form = document.getElementById('rsvp-form') as HTMLFormElement | null;
  const list = document.getElementById('rsvp-entries');
  const viewport = document.getElementById('rsvp-entries-viewport');
  const status = document.getElementById('rsvp-guestbook-status');
  if (!form && !list) return;

  const feedback = document.getElementById('rsvp-feedback');
  const success = document.getElementById('rsvp-success');
  const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = form?.querySelector<HTMLElement>('[data-rsvp-submit-label]');

  let listState: ListState = { status: 'loading' };
  let formState: FormState = { status: 'idle' };
  let inFlight: AbortController | null = null;

  // ── Rendering ───────────────────────────────────────────────────────────

  function syncScrollState(): void {
    if (!viewport || !list) return;
    const scrollable = list.scrollHeight > list.clientHeight + 1;
    const atEnd = !scrollable || list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    viewport.classList.toggle('is-scrollable', scrollable);
    viewport.classList.toggle('is-at-end', atEnd);
  }

  function entryCard(entry: GuestbookEntry): HTMLElement {
    const card = document.createElement('article');
    card.className = 'guestbook-entry panel';

    const header = document.createElement('div');
    header.className = 'guestbook-entry__header';

    const guestInfo = document.createElement('div');
    guestInfo.className = 'guestbook-entry__guest-info';

    const name = document.createElement('h4');
    name.className = 'guestbook-entry__name';
    name.textContent = entry.name;

    const date = document.createElement('time');
    date.className = 'guestbook-entry__date';
    date.dateTime = entry.created_at;
    date.textContent = formatTimestamp(entry.created_at);

    const attendance = document.createElement('span');
    attendance.className = `guestbook-entry__attendance ${
      entry.attendance === 'attending' ? 'is-attending' : 'is-declining'
    }`;
    attendance.textContent = t(entry.attendance === 'attending' ? 'guestbook.attending' : 'guestbook.notAttending');

    const divider = document.createElement('div');
    divider.className = 'guestbook-entry__divider';
    divider.setAttribute('aria-hidden', 'true');

    const message = document.createElement('p');
    message.className = 'guestbook-entry__message';
    message.textContent = entry.message;

    guestInfo.append(name, date);
    header.append(guestInfo, attendance);
    card.append(header, divider, message);
    return card;
  }

  function formatTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(getLocale() === 'id' ? 'id-ID' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  /**
   * The single place the list is drawn. Because it renders from `listState`
   * rather than from the entries array, a language switch after a failed
   * request repaints the failure instead of claiming the guestbook is empty.
   */
  function renderList(): void {
    if (!list || !status) return;

    if (listState.status === 'loading') {
      status.textContent = t('guestbook.loading');
      list.replaceChildren();
      syncScrollState();
      return;
    }

    if (listState.status === 'error') {
      status.textContent = t('guestbook.error');
      // A failed read is worth offering again; a failed write is not, because
      // the entry may already be stored.
      status.append(' ', retryButton());
      list.replaceChildren();
      syncScrollState();
      return;
    }

    if (listState.entries.length === 0) {
      status.textContent = t('guestbook.empty');
      list.replaceChildren();
      syncScrollState();
      return;
    }

    status.textContent = '';
    list.replaceChildren(...listState.entries.map(entryCard));
    list.scrollTop = 0;
    requestAnimationFrame(syncScrollState);
  }

  function retryButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guestbook-retry';
    button.textContent = t('rsvp.retry');
    button.addEventListener('click', () => void loadEntries(), { once: true });
    return button;
  }

  function renderForm(): void {
    if (!feedback) return;

    feedback.classList.toggle('is-error', formState.status === 'error');
    feedback.classList.toggle('is-success', formState.status === 'success');

    if (submit) submit.disabled = formState.status === 'submitting';
    if (submitLabel) {
      submitLabel.dataset.i18n = formState.status === 'submitting' ? 'rsvp.sending' : 'rsvp.send';
      submitLabel.textContent = t(submitLabel.dataset.i18n);
    }

    switch (formState.status) {
      case 'idle':
        feedback.textContent = '';
        break;
      case 'submitting':
        feedback.textContent = t('rsvp.sending');
        break;
      case 'success':
        feedback.textContent = t('rsvp.received');
        break;
      case 'error':
        feedback.textContent = t(ERROR_KEYS[formState.code]);
        break;
    }

    success?.classList.toggle('is-visible', formState.status === 'success');
  }

  // ── Loading ─────────────────────────────────────────────────────────────

  async function loadEntries(): Promise<void> {
    listState = { status: 'loading' };
    renderList();

    try {
      const entries = await fetchEntries();
      listState = { status: 'ready', entries: entries.slice(0, MAX_RENDERED_ENTRIES) };
    } catch (error) {
      listState = { status: 'error', code: error instanceof GuestbookError ? error.code : 'network' };
      if (import.meta.env.DEV) console.warn('Guestbook could not be loaded:', error);
    }

    renderList();
  }

  // ── Submitting ──────────────────────────────────────────────────────────

  function readSubmission(): { ok: true; value: GuestbookSubmission } | { ok: false; code: GuestbookErrorCode } {
    const data = new FormData(form!);
    const name = String(data.get('name') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const attendance = String(data.get('attendance') ?? '');
    const guests = Number(data.get('guests') ?? rsvpRules.minGuests);

    if (!name) return { ok: false, code: 'name_required' };
    if (!message) return { ok: false, code: 'message_required' };
    if (attendance !== 'attending' && attendance !== 'not_attending') {
      return { ok: false, code: 'attendance_invalid' };
    }
    if (!Number.isInteger(guests) || guests < rsvpRules.minGuests || guests > rsvpRules.maxGuests) {
      return { ok: false, code: 'guests_invalid' };
    }

    return {
      ok: true,
      value: { name, message, attendance: attendance as Attendance, guests },
    };
  }

  async function handleSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!form || formState.status === 'submitting') return;

    const parsed = readSubmission();
    if (!parsed.ok) {
      formState = { status: 'error', code: parsed.code };
      renderForm();
      focusFirstInvalid(parsed.code);
      return;
    }

    inFlight?.abort();
    inFlight = new AbortController();

    formState = { status: 'submitting' };
    renderForm();

    try {
      const entry = await submitEntry(parsed.value, inFlight.signal);
      const previous = listState.status === 'ready' ? listState.entries : [];
      listState = {
        status: 'ready',
        entries: [entry, ...previous.filter((item) => item.id !== entry.id)].slice(0, MAX_RENDERED_ENTRIES),
      };
      renderList();

      // Only a confirmed write clears what the guest typed.
      form.reset();
      formState = { status: 'success' };
    } catch (error) {
      formState = { status: 'error', code: error instanceof GuestbookError ? error.code : 'network' };
      if (import.meta.env.DEV) console.warn('RSVP submission failed:', error);
    } finally {
      inFlight = null;
      renderForm();
    }
  }

  function focusFirstInvalid(code: GuestbookErrorCode): void {
    const id =
      code === 'name_required' ? 'rsvp-name' : code === 'message_required' ? 'rsvp-message' : code === 'guests_invalid' ? 'rsvp-guests' : null;
    if (id) document.getElementById(id)?.focus();
  }

  // ── Wiring ──────────────────────────────────────────────────────────────

  form?.addEventListener('submit', (event) => void handleSubmit(event));
  list?.addEventListener('scroll', syncScrollState, { passive: true });
  window.addEventListener('resize', syncScrollState, { passive: true });

  onLocaleChange(() => {
    renderList();
    renderForm();
  });

  void loadEntries();
}
