# Golden Hour Garden — Storytelling Refinement Design

**Date:** 2026-07-08
**Project:** Wedding invitation — Andrika & Aliva (17 October 2026)
**Scope:** UI/UX refinement of the existing single-page invitation. Section structure is unchanged; the *feel* of scrolling through it changes.

## Goal

Make the invitation feel like a soft, romantic journey ("dreamy") rather than a static template page — distinctive enough that guests remember it, while keeping the existing warm parchment-and-gold identity.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Improvement focus | Storytelling experience; content structure stays |
| Mood | Soft & romantic (dreamy) |
| Scroll model | Free scroll + subtle special moments (no snap, no scroll-driven scenes) |
| Visual direction | **A — Golden Hour Garden**: refine current parchment/gold palette, layered parallax petals, soft light |
| Special moment | **Light-bloom opening** only (Date Moment, living timeline, and veil reveal were considered and rejected) |
| Photos | Prewedding photos will come later — design ships with an elegant placeholder photo band |
| Language | Full English narrative |
| Tech constraints | No new libraries; Tailwind CDN + vanilla JS + CSS only. RSVP stays frontend-only. |

## Design

### 1. Narrative & language pass (full English)

All user-facing text becomes consistent English with a soft narrative tone:

- "Buka Undangan" → *Open the Invitation*
- "Kepada: {name} & Pasangan" → *Dear {name} & Partner*
- "Ketuk untuk membuka" → *Tap to open*
- "Undangan Pernikahan" → *The Wedding Invitation*
- "Waktu Mundur" → *Counting the Days*
- Countdown labels: Hari/Jam/Menit/Detik → *Days / Hours / Minutes / Seconds*
- Date display: "17 · Oktober · 2026" → "17 · October · 2026"; "Sabtu" → "Saturday"; "Okt" → "Oct"
- Event copy (Akad Nikah / Resepsi section body text, schedule items) → English equivalents; the terms *Akad Nikah* and *Resepsi* themselves stay as proper nouns
- Q.S. Ar-Rūm 21: Arabic text stays; the Indonesian translation is replaced by an English translation
- Section intros lightly rewritten so labels read as story beats, consistent with the existing "Two Hearts, One Story" tone

### 2. Atmosphere layer (foundation)

Upgrade the existing single-canvas petal animation into a depth-layered, site-wide system:

- **Depth:** each petal gets a `depth` value driving size, blur, opacity, and fall speed — background petals are larger, softer, slower; foreground petals smaller, sharper, faster.
- **Scroll parallax:** petal positions shift subtly with `scrollY`, scaled by depth, so layers separate while scrolling.
- **Site-wide:** the canvas becomes `position: fixed` behind all content (low density everywhere, denser look in the hero via spawn weighting) instead of hero-only.
- **Golden light:** each section gets a soft radial "sunlight from above" gradient consistent with the golden-hour feel (CSS only, reusing design-system tokens).
- **Performance & accessibility:** petal count reduced on small screens / low `devicePixelRatio`; animation fully disabled (static, no canvas loop) under `prefers-reduced-motion`; canvas is `pointer-events: none` and `aria-hidden`.

### 3. Light-bloom opening (the special moment)

When the guest taps *Open the Invitation* on the cover screen:

1. A golden radial bloom expands from the button and fills the viewport (~1.5 s total).
2. The cover content dissolves into the light; music starts (this tap is the autoplay-unlocking interaction, as today).
3. The hero emerges from the light: names and date reveal with a gentle staggered fade.

Fallback: under `prefers-reduced-motion`, a simple cross-fade replaces the bloom. The cover element is removed from the DOM after the transition, as today. Body scroll stays locked until the transition starts.

### 4. Reveal & rhythm polish

- Existing `.reveal` upgraded: children stagger in sequence (label → heading → divider → body), softer easing, subtle blur-to-sharp (`filter: blur(6px) → 0`).
- Section vertical padding increased for a calmer scroll rhythm.
- All motion respects `prefers-reduced-motion` (elements appear without animation).

### 5. Prewedding photo band (placeholder-ready)

A full-width photo strip between the Couple and The Date sections:

- Soft parallax movement (background-position shift on scroll, CSS/JS-light).
- Ships with an elegant gradient placeholder and the caption *"our story in frames — coming soon"*.
- Swapping in real photos later = replacing one image path; no layout work needed.

### 6. Small fixes

- Footer: "Made with love · 2027" → "Made with love · 2026".
- Music widget "Now Playing" title updated to match the file actually played (끝나지 않을 이야기), removing the CINEMA mismatch in comments.
- The hard `currentTime` reset at 100 s is removed; the track loops naturally via the `loop` attribute.

## Out of scope

- No backend for RSVP (stays frontend-only success state).
- No new sections, no gallery grid, no guestbook/gift features.
- No animation libraries (GSAP etc.); no build tooling changes (Tailwind CDN stays).
- No date-moment, living-timeline, or veil-reveal animations (explicitly rejected).

## Files affected

- `index.html` — English copy, photo band section, light gradients, cover markup tweaks
- `css/styles.css` — bloom animation, reveal stagger, photo band, section rhythm
- `css/design-system.css` — only if a token needs a small addition (no palette overhaul)
- `js/main.js` — layered petal system, bloom sequence, parallax hooks, music fixes

## Testing

- Manual: mobile-width first (guests open via WhatsApp), then desktop; verify cover → bloom → hero flow, music autoplay after tap, petal performance while scrolling, reveal stagger on every section.
- `prefers-reduced-motion` emulation: no bloom, no petal loop, content still fully readable.
- Regression: RSVP form success state, mobile menu, countdown accuracy, `?to=` guest personalization still work.
