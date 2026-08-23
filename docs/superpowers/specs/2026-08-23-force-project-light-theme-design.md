# Force Project Light Theme Design

## Context

Some mobile browsers inherit the device's dark/light system preference for native controls and browser chrome. This invitation has a fixed warm-light wedding palette and should not switch appearance based on the device theme.

## Chosen approach

Declare the project as light-only at the document and CSS levels:

- Add `color-scheme: light` with `color-scheme: only light` fallback protection on the root document.
- Add a fixed `theme-color` matching the invitation surface for supported browser chrome.
- Add the iOS web-app status bar metadata for installed/standalone launches.
- Mirror the CSS declaration in the design-system root so native controls retain the project theme after the full stylesheet loads.

No JavaScript theme detection or runtime class toggling is needed.

## Compatibility and accessibility

- Older browsers that do not understand `only` still receive the preceding `color-scheme: light` declaration.
- The project palette remains the same on every device; forced-colors/high-contrast accessibility modes may still override colors where the operating system requires it.
- Existing animations, responsive rules, and color tokens are unchanged.

## Verification

- Confirm the HTML contains the fixed light theme metadata.
- Confirm critical CSS and design-system CSS both declare the light-only color scheme.
- Confirm there are no `prefers-color-scheme` overrides.
- Validate JavaScript syntax and local HTTP responses after the change.
