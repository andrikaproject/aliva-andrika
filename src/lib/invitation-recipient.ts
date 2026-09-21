export type InvitationCategory = 'personal' | 'group' | 'titled';

export const INVITATION_CATEGORIES: readonly InvitationCategory[] = ['personal', 'group', 'titled'];

/**
 * How the recipient line is worded.
 *
 * `default` keeps the category-driven wording the invitation shipped with
 * ("… & Pasangan", "Keluarga Besar …"). The rest address one or both parents
 * of a household and always end in the extended family, printed in the order
 * the style names them.
 */
export type WordingStyle =
  | 'default'
  | 'ibu_family'
  | 'bapak_family'
  | 'ibu_bapak_family'
  | 'bapak_ibu_family';

export const WORDING_STYLES: readonly WordingStyle[] = [
  'default',
  'ibu_family',
  'bapak_family',
  'ibu_bapak_family',
  'bapak_ibu_family',
];

export type Honorific = 'ibu' | 'bapak';

/** Which honorifics a style prints, in the order it prints them. */
const STYLE_HONORIFICS: Record<Exclude<WordingStyle, 'default'>, readonly Honorific[]> = {
  ibu_family: ['ibu'],
  bapak_family: ['bapak'],
  ibu_bapak_family: ['ibu', 'bapak'],
  bapak_ibu_family: ['bapak', 'ibu'],
};

const HONORIFIC_LABELS: Record<Honorific, Record<'id' | 'en', string>> = {
  ibu: { id: 'Ibu', en: 'Mrs.' },
  bapak: { id: 'Bapak', en: 'Mr.' },
};

export type RelationshipGroup =
  | 'friend_andrika'
  | 'friend_aliva'
  | 'parent_friend_andrika'
  | 'parent_friend_aliva';

export const RELATIONSHIP_GROUPS: readonly RelationshipGroup[] = [
  'friend_andrika',
  'friend_aliva',
  'parent_friend_andrika',
  'parent_friend_aliva',
];

export const TITLE_MAX_LENGTH = 32;
export const RECIPIENT_NAME_MAX_LENGTH = 60;
export const MAX_TITLES = 6;

export interface InvitationRecipientInput {
  name: string;
  category: InvitationCategory;
  titles?: readonly string[];
  style?: WordingStyle;
  /** The second person named by a two-honorific style. */
  secondName?: string;
}

export function isWordingStyle(value: unknown): value is WordingStyle {
  return typeof value === 'string' && (WORDING_STYLES as readonly string[]).includes(value);
}

/** Honorifics the style prints, in order. Empty for the default wording. */
export function styleHonorifics(style: WordingStyle | undefined): readonly Honorific[] {
  return style && style !== 'default' ? STYLE_HONORIFICS[style] : [];
}

/** Keep URL-provided recipient values displayable without creating markup. */
export function sanitizeRecipientPart(value: string, maxLength = RECIPIENT_NAME_MAX_LENGTH): string {
  return value
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Group links are allowed to be re-shared without doubling the prefix. */
export function normalizeGroupName(value: string): string {
  return sanitizeRecipientPart(value).replace(/^keluarga besar\s+/i, '').trim();
}

export function normalizeTitles(values: readonly string[] = []): string[] {
  return values
    .map((value) => sanitizeRecipientPart(value, TITLE_MAX_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TITLES);
}

/**
 * The named people alone — "Ibu Sari & Bapak Dodi" — without the family
 * suffix, which the dictionary owns so the cover can translate it.
 *
 * A style that names two people still renders with one, so a half-filled
 * preview in the dashboard shows what it can rather than nothing.
 */
export function familyRecipientNames(input: InvitationRecipientInput, locale: 'id' | 'en' = 'id'): string {
  const names = [sanitizeRecipientPart(input.name), sanitizeRecipientPart(input.secondName ?? '')];
  return styleHonorifics(input.style)
    .map((honorific, index) => (names[index] ? `${HONORIFIC_LABELS[honorific][locale]} ${names[index]}` : ''))
    .filter(Boolean)
    .join(' & ');
}

export function displayRecipientName(input: InvitationRecipientInput, locale: 'id' | 'en' = 'id'): string {
  if (input.style && input.style !== 'default') {
    const named = familyRecipientNames(input, locale);
    if (!named) return '';
    return locale === 'en' ? `${named} and Family` : `${named} Beserta Keluarga Besar`;
  }

  const name = input.category === 'group' ? normalizeGroupName(input.name) : sanitizeRecipientPart(input.name);
  if (!name) return '';

  if (input.category === 'group') {
    return locale === 'en' ? `The ${name} Family` : `Keluarga Besar ${name}`;
  }

  if (input.category === 'titled') {
    const titles = normalizeTitles(input.titles);
    const prefix = titles.length > 0 ? `${titles.join(' ')} ` : '';
    return `${prefix}${name} ${locale === 'en' ? '& Partner' : '& Pasangan'}`;
  }

  return `${name} ${locale === 'en' ? '& Partner' : '& Pasangan'}`;
}

export function buildInvitationUrl(baseUrl: string, input: InvitationRecipientInput): string {
  const url = new URL(baseUrl);
  url.search = '';

  if (input.style && input.style !== 'default') {
    const name = sanitizeRecipientPart(input.name);
    if (!name) return url.toString();
    url.searchParams.set('to', name);
    url.searchParams.set('style', input.style);
    const secondName = sanitizeRecipientPart(input.secondName ?? '');
    if (secondName && styleHonorifics(input.style).length > 1) url.searchParams.set('to2', secondName);
    return url.toString();
  }

  const name = input.category === 'group' ? normalizeGroupName(input.name) : sanitizeRecipientPart(input.name);
  if (!name) return url.toString();

  url.searchParams.set('to', name);
  if (input.category === 'group') url.searchParams.set('type', 'group');
  if (input.category === 'titled') {
    url.searchParams.set('type', 'titled');
    normalizeTitles(input.titles).forEach((title) => url.searchParams.append('title', title));
  }
  return url.toString();
}
