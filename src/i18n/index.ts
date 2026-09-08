import type { Dictionary, Locale } from './dictionary.ts';
import { DEFAULT_LOCALE, LOCALES, isLocale } from './dictionary.ts';
import { id } from './id.ts';
import { en } from './en.ts';

export type { Dictionary, Locale };
export { DEFAULT_LOCALE, LOCALES, isLocale };

export const dictionaries: Record<Locale, Dictionary> = { id, en };

/** Dotted path into a dictionary, e.g. `couple.groomParents`. */
export type TextKey = string;

/**
 * Resolve a dotted key. Falls back to the default locale, then to the key
 * itself, so a missing translation degrades to something visible in review
 * rather than an empty element in front of a guest.
 */
export function translate(
  locale: Locale,
  key: TextKey,
  values: Record<string, string | number> = {},
): string {
  const raw = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    raw,
  );
}

function lookup(dictionary: Dictionary, key: TextKey): string | undefined {
  let node: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}
