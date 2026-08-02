# New Form–Inspired Scroll Motion Design

Date: 2026-08-02  
Status: Approved direction — GSAP Faithful Adaptation

## Objective

Adapt the motion language observed on New Form Capital into the Andrika and Aliva wedding invitation without copying its proprietary implementation or visual identity. The result should combine smooth native scrolling, pinned storytelling, and scroll-scrubbed transitions while preserving the invitation's existing content, palette, cover interaction, music, and accessibility.

## Reference Findings

The public New Form Capital build uses GSAP ScrollSmoother for global scroll interpolation and ScrollTrigger timelines for pinned and scrubbed sections. Its larger sequences extend section scroll distance by roughly 1000–3000 px, pin a viewport-height stage, and map text, imagery, and horizontal marquees to scroll progress.

This project will reproduce those interaction principles with wedding-specific pacing and content. No source code, brand assets, typography, or proprietary visual elements from New Form Capital will be copied.

## Architecture

- Load GSAP, ScrollTrigger, and ScrollSmoother from the official GSAP CDN before `js/main.js`.
- Wrap the normal document journey—from Hero through the existing footer—in `#smooth-wrapper` and `#smooth-content`.
- Keep `#petalCanvas`, `#bloom`, `#grain`, `#cover-screen`, the audio element, and the music widget outside the transformed smooth-content layer so fixed positioning remains reliable.
- Register all motion in one isolated `initScrollStory()` module in `js/main.js`.
- Create timelines only after the cover and page assets are ready, then refresh ScrollTrigger after the invitation opens and after viewport changes.
- Preserve the existing IntersectionObserver reveal system as the non-GSAP fallback.

## Global Smooth Scrolling

- Desktop uses ScrollSmoother with a restrained interpolation around `0.8` seconds.
- Touch devices use a lighter value around `0.1–0.2` so native touch intent remains immediate.
- ScrollSmoother remains paused while the cover screen locks the document.
- The `invitation-opened` event resumes the smoother and refreshes ScrollTrigger after the cover transition releases the page.
- Anchor navigation, form controls, music controls, and normal browser scrolling remain functional.

## Motion Sequence

### 1. Hero Exit

- The Hero is not pinned for an additional long sequence.
- As its first viewport leaves, the masthead and metadata drift upward subtly.
- The four editorial headline rows move at slightly different vertical rates, creating depth without breaking the Figma composition at rest.
- Image crops receive a restrained scale and crop-position shift.
- The complete Hero fades only near the end of its exit so the transition into the verse remains readable.

### 2. Verse Bridge

- The verse remains a normal-flow breathing space.
- Its attribution, Arabic verse, divider, and translation reveal in a short stagger tied to viewport entry.
- No pinning is used here to respect the reading experience.

### 3. Pinned Couple Story

- `#couple` becomes a scroll-story wrapper with an approximately 1600–1800 px extended scroll distance on desktop.
- A viewport-height inner stage remains pinned while the sequence progresses.
- The section heading establishes first.
- Andrika's card enters from the left with a light upward component.
- Aliva's card enters from the right with a matched but slightly delayed movement.
- Both cards settle together while their portrait crops receive a subtle parallax shift.
- The closing quote reveals last, then the stage releases naturally into the photo band.
- Existing couple text and images remain unchanged.

### 4. Photo Band Scrub

- Replace the current scroll listener with a GSAP scrub timeline.
- Background crop travels vertically while the content drifts horizontally by a small amount.
- The overlay opacity changes slightly to keep text contrast stable.
- The section is not pinned; it acts as a kinetic transition into the date section.

### 5. Remaining Sections

- `#when`, `#where`, and `#rsvp` retain normal document flow.
- Their existing reveal groups use GSAP entrance timelines when GSAP is available: short rise, fade, and stagger with no long scroll lock.
- Countdown updates, map links, RSVP controls, and focus behavior are unaffected.

## Responsive Behavior

- Desktop and landscape tablet receive the full pinned Couple sequence.
- Mobile uses a shorter pinned distance of approximately 900–1100 px and smaller translation values.
- On short-height devices, Couple falls back to a sticky stage with reduced travel rather than forcing oversized content off-screen.
- Horizontal overflow remains clipped within the relevant motion wrapper.
- Resizing invalidates cached geometry and triggers a debounced ScrollTrigger refresh.

## Accessibility and Failure Modes

- When `prefers-reduced-motion: reduce` is active, do not create ScrollSmoother, pinning, parallax, or scrub timelines.
- Reduced-motion users retain the current readable static layout and immediate reveal states.
- If GSAP or one of its plugins fails to load, the page remains scrollable and uses the existing IntersectionObserver reveals and photo-band fallback.
- The cover must never remain locked because of a motion initialization error.
- Keyboard focus, anchor movement, form fields, and fixed music controls must not be trapped inside a transformed layer.

## Performance

- Animate only `transform`, `opacity`, clip/crop-related properties, and the existing background position where necessary.
- Avoid per-element scroll listeners after GSAP initializes.
- Scope `will-change` to active motion elements and remove it when timelines are not running where practical.
- Reuse the existing images; do not add decorative video or large animation assets.
- Kill and rebuild relevant timelines when responsive mode changes instead of stacking duplicate ScrollTriggers.

## Validation

- Verify the cover still locks the page, starts music from the trusted click gesture, and then releases scrolling.
- Verify Hero rest state still matches Figma frame `305:111` before scrolling.
- Verify smooth scroll, Hero exit, pinned Couple sequence, and photo-band scrub at desktop and mobile widths.
- Verify `prefers-reduced-motion`, keyboard focus, anchors, music controls, countdown, map link, and RSVP form.
- Check for console errors, duplicate triggers after resize, horizontal overflow, pin jumps, and section overlap.
- Run `node --check`, `git diff --check`, and local HTTP asset checks.

## Intentional Differences from the Reference

- The reference uses several long pinned sequences up to roughly 3000 px. This invitation uses one primary pinned sequence and shorter travel to maintain emotional pacing.
- The reference's aggressive horizontal marquees and technical visuals are replaced with subtle portrait, typography, and photo movement.
- The wedding invitation's warm visual system, Figma Hero, and existing content remain the source of truth.
