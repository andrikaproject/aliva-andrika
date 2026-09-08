/**
 * Shape of every locale dictionary.
 *
 * Copy only. Dates, times, names, account numbers and URLs live in
 * `src/data/wedding.ts`, so a translation can never quietly disagree with
 * the invitation's facts.
 *
 * Every value is plain text and reaches the DOM through `textContent`.
 * Where the design needs emphasis inside a sentence, the sentence is split
 * into named parts instead of smuggling markup through the dictionary.
 */
export interface Dictionary {
  a11y: {
    languageGroup: string;
    guestbookRegion: string;
    musicToggle: string;
  };
  cover: {
    title: string;
    saveTheDate: string;
    date: string;
    openInvitation: string;
    guestGreeting: string;
    groupGuestGreeting: string;
  };
  hero: {
    celebration: string;
    celebrating: string;
    theWedding: string;
    ofAndrikaAnd: string;
    scrollForMore: string;
    tagline: string;
    saveTheDateUpper: string;
    title: string;
  };
  verse: {
    translation: string;
  };
  couple: {
    heading: string;
    intro: string;
    theGroom: string;
    theBride: string;
    groomParents: string;
    groomNote: string;
    brideParents: string;
    brideNote: string;
    quote: string;
  };
  date: {
    label: string;
    heading: string;
    friday: string;
    saturday: string;
    sunday: string;
    monthYear: string;
    countingDays: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    fullDate: string;
  };
  venue: {
    label: string;
    heading: string;
    mainVenue: string;
    openInMaps: string;
    scheduleOfEvents: string;
    guestArrival: string;
    lobbyWelcome: string;
    sacredVows: string;
    luncheonCelebration: string;
  };
  rsvp: {
    heading: string;
    introBefore: string;
    introAfter: string;
    fullName: string;
    fullNamePlaceholder: string;
    numberOfGuests: string;
    attendance: string;
    accepts: string;
    declines: string;
    message: string;
    messagePlaceholder: string;
    send: string;
    sending: string;
    thankYou: string;
    received: string;
    errorGeneric: string;
    errorRateLimited: string;
    errorNameRequired: string;
    errorMessageRequired: string;
    errorGuests: string;
    errorAttendance: string;
    errorOffline: string;
    retry: string;
    noScript: string;
  };
  guestbook: {
    label: string;
    heading: string;
    loading: string;
    empty: string;
    error: string;
    attending: string;
    notAttending: string;
    noScript: string;
  };
  gift: {
    label: string;
    heading: string;
    intro: string;
    bank: string;
    accountNumber: string;
    accountHolder: string;
    copyAccount: string;
    copied: string;
    copyHint: string;
    copiedStatus: string;
    copyError: string;
    deliveryLabel: string;
    deliveryHeading: string;
  };
  gallery: {
    label: string;
    heading: string;
    intro: string;
    photoCount: string;
  };
  music: {
    nowPlaying: string;
    trackTitle: string;
  };
  footer: {
    quote: string;
    quoteAuthor: string;
    madeWith: string;
  };
}

export type Locale = 'id' | 'en';
export const LOCALES: readonly Locale[] = ['id', 'en'];
export const DEFAULT_LOCALE: Locale = 'id';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
