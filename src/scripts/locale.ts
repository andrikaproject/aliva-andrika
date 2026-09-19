import type { Locale } from '../i18n/index.ts';
import { DEFAULT_LOCALE, LOCALES, isLocale, translate } from '../i18n/index.ts';

const STORAGE_KEY = 'wedding-locale';

type Listener = (locale: Locale) => void;

const listeners = new Set<Listener>();
let current: Locale = DEFAULT_LOCALE;

/**
 * Storage is a convenience, never a dependency. Private-mode Safari and
 * blocked-cookie settings both throw here, and a guest must still be able to
 * open the invitation.
 */
function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Preference simply will not survive this session.
  }
}

export function getLocale(): Locale {
  return current;
}

export function t(key: string, values?: Record<string, string | number>): string {
  return translate(current, key, values);
}

/** Subscribe to locale changes. Returns an unsubscribe function. */
export function onLocaleChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Writes every translated string this module owns.
 *
 * Only text nodes and attributes are touched — no innerHTML anywhere — so a
 * dictionary can never introduce markup into the page.
 */
function paint(locale: Locale): void {
  document.documentElement.lang = locale;

  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = translate(locale, key);
  });

  document.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (key) element.setAttribute('placeholder', translate(locale, key));
  });

  document.querySelectorAll<HTMLImageElement>('img[data-alt-id][data-alt-en]').forEach((image) => {
    const alt = locale === 'id' ? image.dataset.altId : image.dataset.altEn;
    if (alt) image.alt = alt;
  });

  document.querySelectorAll<HTMLAnchorElement>('a[data-href-id][data-href-en]').forEach((link) => {
    const href = locale === 'id' ? link.dataset.hrefId : link.dataset.hrefEn;
    if (href) link.href = href;
  });

  document.querySelectorAll<HTMLElement>('[data-rsvp-deadline][data-deadline-date]').forEach((element) => {
    const iso = element.dataset.deadlineDate;
    if (!iso) return;
    element.textContent = new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${iso}T00:00:00+07:00`));
  });

  document.querySelectorAll<HTMLButtonElement>('.language-btn').forEach((button) => {
    const active = button.dataset.locale === locale;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  document
    .getElementById('language-switcher')
    ?.setAttribute('aria-label', translate(locale, 'a11y.languageGroup'));

  document
    .getElementById('rsvp-entries')
    ?.setAttribute('aria-label', translate(locale, 'a11y.guestbookRegion'));

  document.getElementById('music-btn')?.setAttribute('aria-label', translate(locale, 'a11y.musicToggle'));
}

export function setLocale(next: Locale): void {
  if (!LOCALES.includes(next)) return;
  current = next;
  paint(next);
  storeLocale(next);
  listeners.forEach((listener) => listener(next));
}

export function initLocale(): void {
  document.querySelectorAll<HTMLButtonElement>('.language-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const locale = button.dataset.locale;
      if (isLocale(locale)) setLocale(locale);
    });
  });

  const stored = readStoredLocale();
  // The page is already rendered in the default locale, so repainting is only
  // needed when the guest previously chose the other one.
  if (stored && stored !== current) setLocale(stored);
  else paint(current);
}
