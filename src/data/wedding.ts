/**
 * Facts about the wedding. Single source for names, times, places, accounts
 * and links.
 *
 * Nothing here is translated: a date or an account number that drifts between
 * languages is a defect, not a nuance. Copy lives in `src/i18n`.
 */

/** West Indonesia Time. Every published moment carries it explicitly. */
export const TIMEZONE_OFFSET = '+07:00' as const;

export const couple = {
  groom: {
    firstName: 'Andrika',
    fullName: 'Andrika Zainal Ibrahim',
  },
  bride: {
    firstName: 'Aliva',
    fullName: 'Nur Aliva Ike Purwati',
  },
} as const;

export const weddingDay = {
  /** ISO date of the celebration. */
  date: '2026-10-17',
  /** Displayed as a compact stamp in the hero and footer. */
  stamp: '17 · 10 · 2026',
  /** Neighbouring days shown on the calendar strip. */
  calendar: { previous: 16, day: 17, next: 18 },
} as const;

/**
 * Moment the countdown runs to, with the offset spelled out so a guest in
 * Jakarta and a guest abroad see the same number.
 *
 * 08:30 is the value the live invitation has been counting to. The akad
 * itself is listed at 08:00 and doors open at 07:00, so this target is a
 * product decision the couple still needs to confirm — see
 * docs/verification/2026-09-08-phase0-baseline.md §6.
 */
export const countdownTarget = `${weddingDay.date}T08:30:00${TIMEZONE_OFFSET}` as const;

export const venue = {
  hall: 'Ballroom',
  name: 'V Hotel & Residence',
  city: 'Bandung',
  addressLines: ['Jl. Setrawangi, Sukagalih', 'Kec. Sukajadi, Kota Bandung', 'Jawa Barat 40163'],
  mapsUrl: 'https://maps.app.goo.gl/2s4H3gJi14MV8KGx7',
} as const;

/** Ceremony blocks as printed on the cards. */
export const ceremonies = [
  { id: 'akad', name: 'Akad Nikah', time: '07:00 – 10:00 WIB', accent: 'rose' },
  { id: 'resepsi', name: 'Resepsi', time: '10:30 – 14:00 WIB', accent: 'gold' },
] as const;

/**
 * Running order beside the venue card. `nameKey` points at the dictionary;
 * entries with a literal `name` are proper nouns that stay in Indonesian.
 */
export const schedule = [
  { time: '07:00', nameKey: 'venue.guestArrival', noteKey: 'venue.lobbyWelcome' },
  { time: '08:00', name: 'Akad Nikah', noteKey: 'venue.sacredVows' },
  { time: '10:30', until: '14:00', name: 'Resepsi', noteKey: 'venue.luncheonCelebration' },
] as const;

export const rsvp = {
  /** Printed in the RSVP intro; the API does not enforce it. */
  deadlineDate: '2026-10-01',
  minGuests: 1,
  maxGuests: 4,
  maxMessageLength: 500,
  maxNameLength: 80,
} as const;

export const gift = {
  accounts: [
    { bank: 'BNI', holder: couple.groom.fullName, number: '459408723' },
    { bank: 'BNI', holder: couple.bride.fullName, number: '0727960012' },
  ],
  delivery: {
    recipient: 'Aliva Eka / Andrika',
    addressLines: [
      'Jl. Gunung Batu Dalam No. 51',
      'RT 03 / RW 01, Kel. Pasirkaliki',
      'Kec. Cimahi Utara, Kota Cimahi',
      'Jawa Barat 40514',
    ],
  },
} as const;

export const music = {
  src: '/audio/backsound-wedding.mp3',
  type: 'audio/mpeg',
} as const;

export const site = {
  url: 'https://andrika-aliva.my.id',
  title: 'Undangan Pernikahan Andrika & Aliva',
  description:
    'Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada pernikahan Andrika dan Aliva, 17 Oktober 2026 di V Hotel & Residence, Bandung.',
  ogDescription:
    'Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan memberikan doa restu pada pernikahan Andrika dan Aliva, 17 Oktober 2026 di V Hotel & Residence, Bandung.',
  themeColor: '#F5EFE4',
} as const;
