# Mobile Cover Button Position

## Goal

Keep the cover invitation button tappable on mobile devices with shorter or constrained viewports.

## Design

On viewports below 48rem, shift the complete `.cover-ticket` upward by 2.5rem (40px) using a Y transform. Desktop positioning remains unchanged. The ticket dimensions, internal spacing, button size, and short-height positioning rules remain unchanged.

The critical inline styles and the full stylesheet will contain the same mobile override so the first paint and loaded CSS render consistently.

## Verification

Check the cover at mobile width and confirm the button is visible and tappable with sufficient bottom clearance. Confirm desktop positioning and ticket-opening transition behavior remain unchanged.
