export type InvitationCategory = 'personal' | 'group' | 'titled';

export const INVITATION_CATEGORIES: readonly InvitationCategory[] = ['personal', 'group', 'titled'];

/**
 * How the recipient line is worded.
 *
 * `default` keeps the category-driven wording the invitation shipped with
 * ("… & Pasangan", "Keluarga Besar …"). A style naming one parent carries
 * the family with it; naming both already covers the household, so it ends
 * at the two names, printed in the order the style gives them.
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
/** Per person, so a couple can carry six each. */
export const MAX_TITLES = 6;

/** Where a degree sits: "Dr." before the name, "S.Kom" after it. */
export type TitlePlacement = 'prefix' | 'suffix';

/** Which of the people a style names the title belongs to. */
export type TitlePerson = 1 | 2;

export interface RecipientTitle {
  label: string;
  placement?: TitlePlacement;
  person?: TitlePerson;
}

/** A bare string is a prefix on the first person — the original shape. */
export type TitleInput = string | RecipientTitle;

export interface InvitationRecipientInput {
  name: string;
  category: InvitationCategory;
  titles?: readonly TitleInput[];
  style?: WordingStyle;
  /** The second person named by a two-honorific style. */
  secondName?: string;
  /** False invites the person alone, without "& Pasangan" after the name. */
  withPartner?: boolean;
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

/** Titles with their placement and owner settled, capped per person. */
export function normalizeRecipientTitles(values: readonly TitleInput[] = []): Required<RecipientTitle>[] {
  const counts = new Map<TitlePerson, number>();
  const titles: Required<RecipientTitle>[] = [];
  for (const value of values) {
    const raw = typeof value === 'string' ? { label: value } : value;
    const label = sanitizeRecipientPart(raw.label ?? '', TITLE_MAX_LENGTH);
    if (!label) continue;
    const person: TitlePerson = raw.person === 2 ? 2 : 1;
    const taken = counts.get(person) ?? 0;
    if (taken >= MAX_TITLES) continue;
    counts.set(person, taken + 1);
    titles.push({ label, placement: raw.placement === 'suffix' ? 'suffix' : 'prefix', person });
  }
  return titles;
}

function titlesFor(
  titles: readonly TitleInput[] | undefined,
  person: TitlePerson,
  placement: TitlePlacement,
): string[] {
  return normalizeRecipientTitles(titles)
    .filter((title) => title.person === person && title.placement === placement)
    .map((title) => title.label);
}

/**
 * A name wearing its degrees: prefixes lead, suffixes follow behind a comma,
 * the way they are printed on an Indonesian invitation.
 */
export function decorateRecipientName(
  name: string,
  titles: readonly TitleInput[] | undefined,
  person: TitlePerson = 1,
): string {
  const prefixes = titlesFor(titles, person, 'prefix');
  const suffixes = titlesFor(titles, person, 'suffix');
  const lead = prefixes.length > 0 ? `${prefixes.join(' ')} ` : '';
  const trail = suffixes.length > 0 ? `, ${suffixes.join(', ')}` : '';
  return `${lead}${name}${trail}`;
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
    .map((honorific, index) => {
      if (!names[index]) return '';
      const person: TitlePerson = index === 0 ? 1 : 2;
      return `${HONORIFIC_LABELS[honorific][locale]} ${decorateRecipientName(names[index], input.titles, person)}`;
    })
    .filter(Boolean)
    .join(' & ');
}

export function displayRecipientName(input: InvitationRecipientInput, locale: 'id' | 'en' = 'id'): string {
  if (input.style && input.style !== 'default') {
    const named = familyRecipientNames(input, locale);
    if (!named) return '';
    // Naming both of them already covers the household.
    if (styleHonorifics(input.style).length > 1) return named;
    return locale === 'en' ? `${named} and Family` : `${named} Beserta Keluarga`;
  }

  const name = input.category === 'group' ? normalizeGroupName(input.name) : sanitizeRecipientPart(input.name);
  if (!name) return '';

  if (input.category === 'group') {
    return locale === 'en' ? `The ${name} Family` : `Keluarga Besar ${name}`;
  }

  const partner = input.withPartner === false ? '' : locale === 'en' ? ' & Partner' : ' & Pasangan';

  if (input.category === 'titled') {
    return `${decorateRecipientName(name, input.titles, 1)}${partner}`;
  }

  return `${name}${partner}`;
}

export function buildInvitationUrl(baseUrl: string, input: InvitationRecipientInput): string {
  const url = new URL(baseUrl);
  url.search = '';

  if (input.style && input.style !== 'default') {
    const name = sanitizeRecipientPart(input.name);
    if (!name) return url.toString();
    url.searchParams.set('to', name);
    url.searchParams.set('style', input.style);
    appendTitleParams(url, input.titles, 1);
    const secondName = sanitizeRecipientPart(input.secondName ?? '');
    if (secondName && styleHonorifics(input.style).length > 1) {
      url.searchParams.set('to2', secondName);
      appendTitleParams(url, input.titles, 2);
    }
    return url.toString();
  }

  const name = input.category === 'group' ? normalizeGroupName(input.name) : sanitizeRecipientPart(input.name);
  if (!name) return url.toString();

  url.searchParams.set('to', name);
  if (input.category === 'group') url.searchParams.set('type', 'group');
  if (input.category === 'titled') {
    url.searchParams.set('type', 'titled');
    appendTitleParams(url, input.titles, 1);
  }
  if (input.category !== 'group' && input.withPartner === false) url.searchParams.set('solo', '1');
  return url.toString();
}

/** `title`/`title_suffix` for the first person, `title2…` for the second. */
export const TITLE_PARAMS: Record<TitlePerson, Record<TitlePlacement, string>> = {
  1: { prefix: 'title', suffix: 'title_suffix' },
  2: { prefix: 'title2', suffix: 'title2_suffix' },
};

/** The titles a shared link carries, read back out of its query string. */
export function recipientTitlesFromParams(params: URLSearchParams): Required<RecipientTitle>[] {
  const titles: TitleInput[] = [];
  for (const person of [1, 2] as const) {
    for (const placement of ['prefix', 'suffix'] as const) {
      for (const label of params.getAll(TITLE_PARAMS[person][placement])) {
        titles.push({ label, placement, person });
      }
    }
  }
  return normalizeRecipientTitles(titles);
}

function appendTitleParams(url: URL, titles: readonly TitleInput[] | undefined, person: TitlePerson): void {
  for (const placement of ['prefix', 'suffix'] as const) {
    for (const label of titlesFor(titles, person, placement)) {
      url.searchParams.append(TITLE_PARAMS[person][placement], label);
    }
  }
}
