# Hero Photo Aspect-Ratio Correction

Date: 2026-08-02  
Status: Approved direction — Original Source + Corrected Crop

## Objective

Correct the visibly stretched photos beside “MERAYAKAN” and “ALIVA” while preserving the current editorial Hero grid, rounded frames, responsive spacing, and scroll-linked zoom.

## Root Cause

`celebration-stage.png` and `garden-couple.png` are portrait exports whose visible content has already been compressed horizontally. `object-fit: cover` preserves the exported file ratio, so it cannot restore the subjects' natural proportions by itself.

## Design

- Replace the “MERAYAKAN” image source with the existing undistorted original, `assets/cover/andrika-aliva-curtain.jpeg`.
- Keep its current frame dimensions and use a lower-center focal position so both subjects remain visible in the wide crop.
- Keep `assets/hero/garden-couple.png` for the “ALIVA” frame because no undistorted source of that scene exists in the repository.
- Correct the “ALIVA” image optically with a horizontal scale of `1.5`, contained by the existing overflow-hidden frame.
- Split the Hero scroll zoom so normal images continue toward `scale(1.08)`, while the corrected “ALIVA” image preserves its horizontal correction and receives an equivalent proportional zoom.
- Do not modify typography, grid proportions, frame dimensions, rounded corners, or other Hero images.

## Responsive Behavior

The same aspect correction applies at all breakpoints. Existing percentage-based Hero sizing remains the source of truth, so the correction cannot change line wrapping or text alignment.

## Accessibility and Performance

- Preserve the existing decorative empty `alt` text because the photos are supplementary to the accessible Hero heading.
- Use CSS transforms only; do not introduce another image asset or runtime image processing.
- Retain the existing reduced-motion behavior. The static aspect correction remains visible even when scroll animation is disabled.

## Validation

- Confirm faces and bodies no longer appear horizontally compressed at desktop and mobile widths.
- Confirm both images fully cover their frames without empty edges.
- Confirm the “ALIVA” correction remains intact through the Hero scroll zoom.
- Run JavaScript syntax and whitespace checks after implementation.
