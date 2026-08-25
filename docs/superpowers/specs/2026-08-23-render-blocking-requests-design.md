# Render-Blocking Requests Performance Design

## Context

The Lighthouse audit reports render-blocking requests on the invitation page:

- Tailwind Play CDN (`cdn.tailwindcss.com`), approximately 123.8 KiB.
- Three first-party stylesheets, including the main design stylesheet.
- Google Fonts CSS, approximately 1.1 KiB, which then triggers external font files.

The page is a static HTML invitation with important visual styling and motion implemented in `css/styles.css`. The fix must preserve the current visual design, responsive behavior, and animations.

## Goals

- Remove the Tailwind runtime CDN from the initial render path.
- Keep all Tailwind utility classes currently used by the page working through a generated static stylesheet.
- Serve the Google font families used by the page locally to remove third-party font requests.
- Preserve the existing CSS cascade, responsive breakpoints, JavaScript class toggles, and animation timing.
- Verify that the page still renders and that no CDN font/Tailwind request remains in `index.html`.

## Non-goals

- Redesigning the invitation.
- Rewriting `css/styles.css` or changing animation behavior.
- Removing first-party CSS that is required by the page.
- Optimizing images, audio, API behavior, or unrelated Lighthouse findings.

## Chosen approach

Generate a static Tailwind stylesheet from the existing HTML and configuration, then load it as a normal local CSS asset. Download and store the exact Google font families/weights currently requested by the page, and declare them with local `@font-face` rules. Remove the runtime Tailwind script, Tailwind config script, Google Fonts stylesheet, and external preconnects from the document head.

The existing `css/design-system.css` and `css/styles.css` remain in their current order after the generated Tailwind stylesheet. This keeps the existing custom CSS as the final override layer and minimizes cascade changes.

## Asset and loading flow

1. `index.html` loads the generated local Tailwind CSS.
2. The design-system tokens load next.
3. `styles.css` loads after the utility layer and continues to define the page's components and motion.
4. `styles.css` defines local font faces for Cormorant Garamond, Jost, and DM Mono, with the existing fallback stacks retained.
5. JavaScript continues to load at the end of the document as before.

No runtime Tailwind compilation or third-party font CSS fetch remains.

## Compatibility and error handling

- The generated stylesheet must include the utilities used in `index.html`, including arbitrary values such as `z-[70]` and responsive/state variants.
- Local font declarations must preserve the existing family names and requested weights/styles. If a local font cannot load, the existing Georgia/sans-serif/monospace fallbacks remain active.
- Existing `?v=` cache-busting query strings on project CSS/JS are preserved or updated so browsers do not retain the removed CDN-based page state.
- No JavaScript behavior is changed; missing optional font files must not prevent the invitation from opening.

## Verification

- Search the source to confirm there are no `cdn.tailwindcss.com` or `fonts.googleapis.com` references.
- Confirm every Tailwind class used by the HTML has a matching generated rule or is covered by existing custom CSS.
- Serve the project locally and check the page loads without console errors.
- Exercise the invitation open action, language toggle, and responsive layout at mobile and desktop widths.
- Inspect the network list to confirm Tailwind and Google Fonts are no longer requested.
- Run a production-style Lighthouse audit where available and compare the render-blocking section.

## Acceptance criteria

- The page looks and behaves the same as before, including responsive layout and animations.
- The two third-party render-blocking sources shown in the audit are removed.
- Tailwind utilities remain available without a runtime CDN script.
- Fonts load from local project assets or fallbacks only.
- No new console/runtime errors are introduced.
