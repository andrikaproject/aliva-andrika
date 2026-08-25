# Non-Blocking First-Party CSS Design

## Context

After removing Tailwind and Google Fonts CDN requests, Lighthouse still reports three first-party stylesheets as render-blocking: `styles.css`, `design-system.css`, and the generated static Tailwind CSS.

The invitation opens on a full-screen cover. Only the cover, language switcher, base tokens, and atmosphere need to be styled before the first paint. The complete CSS is still required after the invitation opens and must remain unchanged in behavior.

## Chosen approach

Inline a small critical CSS layer in `index.html` for the initial cover state, then load the three existing stylesheets with `rel="preload" as="style"` and promote each to a stylesheet on load. Include `noscript` stylesheet fallbacks.

The full stylesheets remain separate and in their current cascade order:

1. Static Tailwind utilities and preflight.
2. Design-system tokens and reusable components.
3. Page styles, fonts, cover transition, responsive rules, and animations.

The inline layer mirrors only the rules needed before those files arrive. It does not replace or duplicate the full page styling contract.

## Critical CSS scope

- Box sizing, document/body reset, smooth scrolling, and hidden utility.
- Design tokens needed by the cover and language switcher.
- Local font-face declarations for early font discovery.
- Fixed atmosphere (`#petalCanvas`, `#grain`).
- Cover photo, ticket, ticket contents, open button, responsive cover sizing, and dismissed state.
- Language switcher and accessible button states.

Ticket-tear keyframes and all post-cover styles remain in the full stylesheet; the preload request is initiated immediately so the existing animation rules are available before user interaction under normal network conditions.

## Compatibility and error handling

- `onload` promotion uses `this.onload = null` to avoid repeated execution.
- `noscript` restores normal stylesheet loading when JavaScript is disabled.
- Existing stylesheet URLs and cache-busting query strings are preserved.
- No JavaScript logic, class names, DOM structure, or animation timing is changed.
- If a preload fails, the browser still retains the inline cover styling and the page remains usable; the `noscript` fallback covers non-JavaScript clients.

## Verification

- Confirm the document has no ordinary render-blocking stylesheet links for the three local CSS files.
- Confirm all three preload links have the expected `as="style"` and `onload` promotion.
- Confirm CSS and JavaScript syntax, local asset resolution, and HTTP responses.
- Confirm the critical layer contains the initial cover selectors and required variables.
- Run Lighthouse after deployment and verify the render-blocking audit no longer lists the three local stylesheets.

## Acceptance criteria

- Initial cover is styled before the first paint without a visible unstyled state under normal loading.
- Existing CSS files, responsive behavior, and animations continue to be used unchanged.
- Lighthouse no longer reports the three local CSS files as render-blocking requests.
- JavaScript-disabled clients still receive the full CSS through `noscript` fallbacks.
