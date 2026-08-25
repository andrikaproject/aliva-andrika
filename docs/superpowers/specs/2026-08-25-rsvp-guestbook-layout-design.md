# RSVP Guestbook Layout

## Goal

Refine the public RSVP comments to follow the provided Figma reference while preserving the project's own typography, color tokens, and card styling.

## User-facing behavior

- Each comment card shows the guest name and date grouped on the left.
- The attendance status remains a pill aligned to the right.
- A thin divider separates the header from the italic message.
- The guestbook viewport shows roughly three cards at a time.
- Additional comments remain available through vertical scrolling.
- A subtle bottom fade appears when more comments are available and disappears at the end of the scroll.

## Design

The existing guestbook renderer will create a dedicated guest-info wrapper and divider element. Existing project fonts and tokens remain the source of truth: Cormorant Garamond for the display text, Jost for metadata and status, the existing warm card surface, gold border, and green attendance colors. A scroll viewport wrapper will provide the fade overlay without changing the underlying guestbook data or API.

## Verification

Verify the card hierarchy, the three-card viewport, keyboard/touch scrolling, the bottom fade state at the top and bottom of the list, empty/error states, and locale re-rendering.
