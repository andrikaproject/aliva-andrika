# Pre-wedding gallery source design

## Goal

Replace the existing gallery imagery with the complete collection in `assets/pict/Pre-wedd-Gredding/`.

## Design

- Keep the current gallery layout, lazy-loading behavior, and metadata structure.
- Remove the category filter controls and their associated filtering behavior.
- Register every `.webp` photo from `assets/pict/Pre-wedd-Gredding/` explicitly in the gallery markup so the same image set works on static hosting without directory listings.
- Keep the photo count as a localized, informational label.
- Update the nearby implementation comment so future additions point to the new folder.

## Validation

- Confirm no gallery card references the old folder.
- Confirm every new image path points to an existing file.
- Confirm no filter controls or filter scripts remain.
- Run the project's available static checks or preview validation if present.
