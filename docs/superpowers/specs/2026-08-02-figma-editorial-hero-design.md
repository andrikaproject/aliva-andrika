# Figma Editorial Hero Design

Date: 2026-08-02  
Status: Approved direction — Option 1 (faithful Figma replacement)

## Objective

Replace the current navigation and invitation-card hero with the editorial composition from Figma frame `305:111`, using `landing-page.json` as the structural source and the Figma screenshot as the visual reference. Preserve the cover-opening experience and every section after the hero.

## Scope

- Replace the current fixed navigation, desktop links, mobile hamburger, and dropdown menu.
- Replace the current centered invitation card, ornaments, CTA, glow, and scroll indicator.
- Preserve the cover screen and its opening transition into the hero.
- Preserve the verse, couple, event, countdown, location, RSVP, footer, music, personalization, and background effects unless a compatibility adjustment is required at the hero boundary.

## Structure

The new first viewport is one semantic hero with three vertical regions:

1. A non-interactive masthead containing `ANDRIKA & ALIVA` on the left and `WEDDING CELEBRATION / 2026` on the right.
2. A centered four-row editorial headline:
   - `MERAYAKAN` followed by a wide landscape crop.
   - A compact landscape crop followed by `HARI BAHAGIA`.
   - `ANDRIKA DAN` followed by a compact portrait crop.
   - A wide couple crop followed by `ALIVA`.
3. A metadata footer containing the Indonesian tagline, `ANDRIKA ❤️‍🔥 ALIVA`, and the save-the-date block.

The masthead is part of the hero rather than a persistent site-wide navigation. This matches the JSON's non-interactive signals and avoids carrying decorative labels over later content.

## Visual System

- Background: warm off-white sampled from the Figma reference.
- Primary text: near-black.
- Headline: bold grotesk treatment, uppercase, approximately 64 px on the 1305 px reference frame.
- Metadata: `DM Mono`, medium weight, with the letter spacing described by the JSON tokens.
- Image blocks: exact exported Figma assets, 12 px corner radius, with crop positions matching the source.
- Desktop layout: preserve the 607 px headline composition and the reference's 80 px vertical rhythm while allowing the hero to fill the viewport.
- Do not add shadows, borders, decorative ornaments, gradients, CTA buttons, or substitute illustrations to the new hero.

`Reflow Sans` is not currently present in the project. The implementation will declare it first and use a close bold system-sans fallback when it is unavailable; `DM Mono` will be loaded explicitly. No font file will be fabricated.

## Responsive Behavior

- Wide screens retain the Figma composition and left/right masthead alignment inside a balanced editorial inset.
- Desktop hero content uses fluid horizontal spacing of `clamp(24px, 3vw, 48px)` and 24 px vertical spacing so the masthead and metadata do not touch the viewport edges.
- Tablet hero content uses a 24 px inset; mobile uses 16 px.
- Headline type and image widths scale down fluidly with `clamp()` rather than wrapping individual phrases.
- On narrow screens, all four editorial rows remain intact and fit the viewport width. The masthead keeps two compact columns.
- The metadata footer becomes a compact grid: tagline across the first row, couple mark and date beneath it.
- Image crops keep their designed aspect and use `object-fit` plus tuned `object-position` values.
- The hero respects small-height devices without clipping by using a minimum viewport height and content-driven overflow.
- The inset does not introduce a card, border, corner radius, or separate surface; the warm background continues to fill the viewport.

## Components and Code Changes

- `index.html`: replace the current navbar and hero markup with a semantic masthead, reusable editorial rows, and hero metadata.
- `css/styles.css`: add narrowly scoped hero styles, responsive rules, crop behavior, and reduced-motion compatibility.
- `js/main.js`: remove the obsolete navbar-scroll and mobile-menu handlers so the page does not query deleted controls.
- `assets/hero/`: store the four exact Figma image exports locally because the MCP URLs expire.

No new framework or UI library will be introduced. Existing static HTML, CSS, JavaScript, Tailwind CDN usage, design tokens, and section architecture remain intact.

## Interaction and Accessibility

- The masthead contains no fake navigation controls because the Figma node is explicitly non-interactive.
- Decorative image crops use empty alternative text and are grouped with the headline so assistive technology reads the sentence once rather than interpreting the crops as content.
- The hero heading has one logical `h1` text alternative: `Merayakan hari bahagia Andrika dan Aliva`.
- The visual row fragments are hidden from assistive technology to prevent duplicate or disordered reading.
- Existing cover button, music control, section links outside the removed nav, and RSVP behavior remain functional.

## Validation

- Validate HTML/JavaScript for references to removed navigation elements.
- Serve the project locally and capture desktop and mobile screenshots.
- Compare desktop hierarchy, 607 px headline geometry, 80 px vertical rhythm, crop positions, text scale, and bottom metadata against Figma frame `305:111`.
- Verify at least a 1305×590 reference viewport and one narrow mobile viewport.
- Confirm the cover transition still reveals the hero, scrolling remains unlocked, music behavior is unchanged, and no console errors occur.

## Intentional Constraints

- The Figma frame specifies only desktop geometry. Mobile behavior is a responsive interpretation that preserves row order and editorial rhythm.
- Exact `Reflow Sans` rendering depends on the font being available or supplied later; the fallback will preserve scale, weight, and spacing as closely as possible.
