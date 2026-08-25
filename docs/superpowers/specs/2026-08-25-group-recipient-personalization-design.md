# Group Recipient Personalization

## Goal

Support recipient links for groups without appending the personal “& Pasangan” suffix.

## User-facing behavior

- Personal link: `?to=Andrika` renders `Kepada Andrika & Pasangan`.
- Group link: `?to=Rekan-Rekan%20Puskesmas%20Cimahi%20Utara&type=group` renders `Kepada Yth. Rekan-Rekan Puskesmas Cimahi Utara`.
- Existing links without `type=group` remain unchanged.

## Design

The cover personalization code will read the existing `to` query parameter and a new `type` query parameter. When `type` equals `group`, it will use a dedicated bilingual translation string for the group greeting; all other values retain the current personal greeting. The existing character sanitization will continue to apply to the recipient name before rendering.

## Verification

Verify the default personal URL and the explicit group URL in the browser, including that the group greeting does not contain “& Pasangan” and that language switching updates the greeting.
