# Pre-wedding gallery source design

## Goal

Replace the existing gallery imagery with the complete collection in `assets/pict/Pre-wedd-Gredding/`.

## Design

- Keep the current gallery layout, lazy-loading behavior, metadata structure, and category filters.
- Discover the image files from `assets/pict/Pre-wedd-Gredding/` at runtime and render one gallery card per image.
- Keep the existing static card markup as a safe fallback for environments that do not expose directory listings.
- Update the nearby implementation comment so future additions point to the new folder.

## Validation

- Confirm no gallery card references the old folder.
- Confirm every new image path points to an existing file.
- Run the project's available static checks or preview validation if present.
