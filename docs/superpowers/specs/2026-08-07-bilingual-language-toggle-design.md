# Bilingual Language Toggle Design

## Goal

Allow wedding invitation visitors to switch between Bahasa Indonesia and English from a compact `ID / EN` control in the page header.

## Design

- Add a fixed, accessible language toggle near the top-right of the invitation.
- Use `data-i18n` keys on visible text and a translation dictionary in `js/main.js`.
- Default to Bahasa Indonesia, while persisting the visitor's selection in `localStorage`.
- Translate static copy, date/day labels, form labels and placeholders, music panel text, accessibility labels, dynamic guest greeting, and RSVP success feedback.
- Keep names, dates, times, venue names, Arabic verse, animations, music behavior, form submission behavior, and map URL unchanged.

## Behavior

1. On load, read a valid saved locale (`id` or `en`), otherwise use `id`.
2. Apply translations to all elements with `data-i18n` and `data-i18n-attr`.
3. Update the document language, toggle active state, and persist changes.
4. Re-render the guest greeting and RSVP success message when the locale changes.

## Validation

- Confirm both locales update without a reload.
- Confirm saved locale survives reload.
- Confirm guest greeting, RSVP success, and placeholders update.
- Confirm existing cover opening, countdown, music, and form interactions remain functional.
