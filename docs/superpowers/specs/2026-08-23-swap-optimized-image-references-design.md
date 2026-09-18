# Swap Optimized Image References Design

## Context

The project contains new optimized image files prepared by the user. The HTML still points to the previous large assets for the hero portrait and four gallery photos.

## Chosen approach

Update only the affected `src` values in `index.html`:

- `couple-portrait.webp` → `couple-portrait1.webp`.
- `DSC00177.webp` → `DSC00177_11zon.webp`.
- `DSC00189.webp` → `DSC00189_11zon.webp`.
- `DSC00255.webp` → `DSC00255_11zon.webp`.
- `DSC00424.webp` → `DSC00424_11zon.webp`.

Keep all existing alt text, lazy-loading attributes, intrinsic dimensions, layout, and animation behavior unchanged. Do not modify or delete the user-provided asset files.

## Verification

- Confirm each new asset exists.
- Confirm the five old references are gone from page source.
- Confirm each new reference resolves to a local file.
- Validate HTML-adjacent source checks and JavaScript syntax.
