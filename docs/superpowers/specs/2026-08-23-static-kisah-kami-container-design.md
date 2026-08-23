# Static Kisah Kami Container Design

## Context

The `Kisah Kami` photo band currently has two GSAP ScrollTriggers that animate the empty `.gallery-frame`: it starts inset with rounded corners, expands to full width while entering, then contracts again while leaving.

The requested behavior is for the brown container to be full-width by default with no container expansion/contract animation. The gallery's own scrolling behavior must remain intact.

## Chosen approach

Remove only the two GSAP timelines that animate `.gallery-frame` `left`, `right`, and `borderRadius`. Keep the existing CSS full-bleed frame as the permanent state.

Keep these behaviors unchanged:

- Gallery photo reveal animation.
- Desktop pinned `Kisah Kami` context column.
- Card hover motion and image transitions.
- Gallery layout, responsive columns, and scroll positioning.

Remove the now-unused frame animation constants and comments so the implementation reflects the static container behavior.

## Verification

- Confirm `.gallery-frame` remains `left: 0`, `right: 0`, and `border-radius: 0` in CSS.
- Confirm no GSAP tween or ScrollTrigger targets `.gallery-frame`.
- Confirm gallery context/card ScrollTriggers remain in `main.js`.
- Validate JavaScript syntax and whitespace.

## Acceptance criteria

- The brown gallery container is full-width immediately and remains full-width while scrolling.
- “Kisah Kami” scrolling/pinning and gallery photo reveals continue to work.
- No unrelated animation or layout behavior changes.
