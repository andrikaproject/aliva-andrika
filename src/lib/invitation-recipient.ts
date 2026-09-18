export type InvitationCategory = 'personal' | 'group' | 'titled';

export const INVITATION_CATEGORIES: readonly InvitationCategory[] = ['personal', 'group', 'titled'];

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

export function displayRecipientName(input: InvitationRecipientInput, locale: 'id' | 'en' = 'id'): string {
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
  const name = input.category === 'group' ? normalizeGroupName(input.name) : sanitizeRecipientPart(input.name);
  url.search = '';
  if (!name) return url.toString();

  url.searchParams.set('to', name);
  if (input.category === 'group') url.searchParams.set('type', 'group');
  if (input.category === 'titled') {
    url.searchParams.set('type', 'titled');
    normalizeTitles(input.titles).forEach((title) => url.searchParams.append('title', title));
  }
  return url.toString();
}
