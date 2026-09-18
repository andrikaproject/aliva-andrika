# Private Guest Manager Design

**Project:** Wedding invitation for Andrika and Aliva  
**Date:** 18 September 2026  
**Status:** Approved design, pending implementation plan  
**Repository:** `Wedding-andrika01`

## Summary

Add a private guest-management dashboard to the existing wedding invitation project. Andrika and Aliva will use it to enter guests manually, generate personalized invitation links, copy one formal message template, and track whether each invitation has not been sent, has been copied, or has been sent.

The dashboard will share the existing Astro frontend, Node API, SQLite database, same-origin proxy, domain, and VPS deployment. The public invitation and RSVP guestbook remain available and keep their existing contracts.

## Goals

- Manage approximately 200 to 300 invitation recipients from a phone or desktop.
- Make the guest list available to Andrika and Aliva across devices.
- Protect guest data with one shared access code and server-side sessions.
- Support Personal, Group, and Personal Bergelar invitation categories.
- Organize guests into four fixed relationship groups.
- Generate a personalized invitation URL without requiring a public database lookup.
- Copy one user-supplied formal message template containing the recipient name and link.
- Track delivery status accurately without claiming that a copied message was sent.
- Preserve the current public invitation, RSVP data, guestbook API, bilingual behavior, and deployment architecture.

## Non-goals

- Accounts for multiple users or role-based permissions.
- Phone-number storage or direct WhatsApp integration.
- CSV or spreadsheet import.
- Sending messages from the application.
- Real-time WebSocket synchronization.
- Multiple wedding templates, tenants, or reusable customer-facing products.
- Analytics, campaign metrics, or fabricated delivery confirmation.

## Existing Behavior

The invitation currently reads `?to=` in `src/scripts/invitation.ts`. A missing `type` is treated as Personal. `?type=group` selects separate localization keys, but the caller currently has to include words such as `Keluarga Besar` in the `to` value.

The existing application uses:

- Astro static output for the public invitation.
- A Node HTTP API under `/api`.
- SQLite for RSVP guestbook entries.
- Caddy and Compose deployment on the existing VPS.
- `site.url` in `src/data/wedding.ts` as the canonical invitation origin.

The new feature extends these patterns instead of adding a cloud database or a second application.

## Product Model

### Invitation categories

| Category | Stored input | Public display | URL shape |
|---|---|---|---|
| Personal | `Budi Santoso` | `Budi Santoso & Pasangan` | `?to=Budi%20Santoso` |
| Group | `Cimahi` | `Keluarga Besar Cimahi` | `?to=Cimahi&type=group` |
| Personal Bergelar | name plus ordered titles | `Bapak Dr. Budi Santoso & Pasangan` | `?to=Budi%20Santoso&type=titled&title=Bapak&title=Dr.` |

The examples describe formatting behavior. They are not seed guest records.

Repeated `title` query parameters preserve title order and avoid encoding a custom JSON structure. The invitation stays compatible with existing Personal and Group links.

### Relationship groups

Every guest belongs to exactly one of these fixed groups:

1. Teman Andrika
2. Teman Aliva
3. Teman Orang Tua Andrika
4. Teman Orang Tua Aliva

The last two mean guests invited by the respective parents.

### Delivery status

Every guest has one current status:

- `pending`: Belum dikirim
- `copied`: Sudah disalin
- `sent`: Sudah dikirim

Status transitions follow these rules:

- A new guest starts as `pending`.
- Successful clipboard writing changes `pending` to `copied` and records `copied_at`.
- Clipboard failure does not change status.
- Copying a guest already marked `sent` does not downgrade the status.
- `sent` is always selected manually and records `sent_at`.
- Edit mode can correct or reset a status when the user made a mistake.

This model does not claim that the application can observe WhatsApp delivery.

## User Experience

### Login

`/guest-manager` first checks the current session. An unauthenticated visitor sees only the shared-code form. No guest data or message template is embedded in the static HTML.

A valid code opens the guest list. Logout invalidates the current session. An expired session returns the user to login with a clear message.

### Main list

The approved layout is one master list rather than four separate boards. It includes:

- A primary `Tambah Tamu` action.
- Search by recipient name and rendered display name.
- One relationship-group filter.
- One invitation-category filter.
- One delivery-status filter.
- A real total derived from stored data.
- Flat rows optimized for scanning hundreds of names.
- Per-row status, relationship group, category, and relevant action.

The default view shows all guests. Filters are combinable and remain in the dashboard query string so browser navigation does not unexpectedly clear the current view.

### Guest form

The form contains:

- Raw recipient name.
- Invitation category.
- One relationship group.
- Ordered title selection when the category is Personal Bergelar.
- A live preview of the rendered recipient line.
- A live preview of the generated invitation URL.

The title control supports one or more selections. Its initial reference values are:

- Bapak
- Ibu
- Saudara
- Saudari
- H.
- Hj.
- Dr.
- dr.
- Prof.
- Ir.

Selecting `Lainnya` reveals a manual title field. A valid custom title becomes a reusable title record. Users can reorder selected titles before saving.

Before saving a normalized duplicate name, the dashboard warns the user and shows the similar record. It still allows the save because distinct recipients can share a name.

### Row actions

- `Salin Pesan` copies the rendered formal message.
- `Tandai Dikirim` moves the record to `sent` after explicit confirmation.
- `Edit` opens the populated guest form.
- `Hapus` requires confirmation and identifies the exact recipient.
- A sent guest keeps access to details, copy, edit, and status correction.

### Message template

One protected settings view stores one formal message template for every category. It supports exactly these placeholders in version one:

```text
{{nama_tamu}}
{{link_undangan}}
```

`{{nama_tamu}}` uses the final rendered line, including `Keluarga Besar`, titles, and `& Pasangan` where applicable. `{{link_undangan}}` uses `site.url` and the encoded query parameters.

The product owner will supply the formal copy later. Until a non-empty valid template is saved, the interface explains that the template is not configured and disables `Salin Pesan`. No invented formal text is shipped as a default.

## Visual Direction

**Design Read:** a private wedding guest manager for Andrika and Aliva, using a warm editorial utility language with `ENERGY 1 / RHYTHM 1 / MOTION 1`.

Major visual decisions and reasons:

| Decision | Reason |
|---|---|
| Warm parchment base and restrained dark-red accent | Connect the private tool to the existing wedding identity without decorating every control. |
| Existing serif family for identity and section headings | Preserve the invitation voice at low visual volume. |
| Existing readable sans family for forms, filters, and rows | Keep operational text easy to scan at small sizes. |
| One master list with flat rows | Let users search and compare 200 to 300 guests faster than large cards allow. |
| Dark-red accent reserved for primary action and current focus | Give the screen one clear focal point without spreading the accent everywhere. |
| Fixed light theme | Match the established light parchment wedding identity and avoid shipping an unrelated theme system. |
| Motion limited to dialogs, status feedback, and short state transitions | Confirm actions without slowing repetitive list work. |

The design does not use dashboard stat cards, decorative icons, gradients, glass effects, fabricated numbers, or ornamental animations.

## Responsive and Accessible Behavior

Desktop uses a compact multi-column row. Mobile is a separate reflowed layout:

- Search and filter controls stack according to available width.
- Each guest row becomes a two-column summary with one primary action.
- Secondary actions move into an accessible detail view instead of crowding the row.
- Long group names and titled recipient names wrap without horizontal overflow.
- Controls have a minimum 44 by 44 pixel touch area with spacing between targets.
- Dialogs trap focus, close with Escape, return focus to their trigger, and become full-height sheets on narrow screens when needed.
- All interactive controls are keyboard reachable with visible focus indicators.
- Status never relies on color alone.
- Text and component boundaries meet WCAG AA contrast requirements.
- Text can reach 200 percent zoom without clipping.
- Focused form fields remain visible above the mobile keyboard.

Every data view implements meaningful loading, empty, and error states. Empty states explain why the list is empty and distinguish no stored guests from filters that match nothing.

## Architecture

### Frontend

Add an Astro page at `/guest-manager` and focused client modules for:

- Session bootstrap and login.
- Guest-list querying, filtering, and rendering.
- Guest creation and editing.
- Title selection and ordering.
- Message-template settings.
- Clipboard and delivery-status transitions.

The public invitation continues to render as static HTML. The dashboard shell can also be static because all protected data comes from authenticated same-origin API requests.

### API

Add protected endpoints under a distinct namespace:

```text
POST   /api/invitation-admin/login
POST   /api/invitation-admin/logout
GET    /api/invitation-admin/session

GET    /api/invitation-admin/guests
POST   /api/invitation-admin/guests
PATCH  /api/invitation-admin/guests/:id
DELETE /api/invitation-admin/guests/:id

GET    /api/invitation-admin/titles
POST   /api/invitation-admin/titles

GET    /api/invitation-admin/settings
PUT    /api/invitation-admin/settings/message-template
```

The list endpoint accepts validated search and filter parameters. Responses return raw fields, ordered titles, rendered display name, generated invitation URL, status, version, and timestamps. Display rendering and URL construction live in a shared pure module so frontend previews, API responses, and public invitation tests use the same rules.

### Database

Use tables separate from `guestbook_entries`:

#### `invitation_admin_sessions`

- `id`
- `token_hash`, unique
- `created_at`
- `expires_at`
- `last_seen_at`

#### `invitation_guests`

- `id`
- `raw_name`
- `category`, constrained to `personal`, `group`, or `titled`
- `relationship_group`, constrained to the four approved groups
- `status`, constrained to `pending`, `copied`, or `sent`
- `version`, incremented on every update
- `copied_at`, nullable
- `sent_at`, nullable
- `created_at`
- `updated_at`

#### `invitation_titles`

- `id`
- `label`
- `normalized_label`, unique
- `is_default`
- `is_active`
- `created_at`

#### `invitation_guest_titles`

- `guest_id`
- `title_id`
- `position`
- Composite uniqueness for guest and position

#### `invitation_settings`

- Singleton key
- `message_template`
- `updated_at`
- `version`

Foreign keys use explicit deletion behavior. Deleting a guest removes only its title relations. Deleting or deactivating a title must not erase titles already associated with guests.

## Authentication and Security

- Store the access-code verifier in an environment variable as a salted Node `crypto.scrypt` hash. Never commit the code or plain verifier input.
- Generate a cryptographically random session token after successful login.
- Store only the token hash in SQLite.
- Send the raw token only in an `HttpOnly`, `Secure`, `SameSite=Strict`, path-scoped cookie.
- Give sessions an explicit expiration and reject expired or missing sessions.
- Rate-limit login attempts by the proxy-derived client address using a conservative fixed window.
- Verify same-origin requests for state-changing endpoints.
- Validate category, relationship group, status transitions, title count, title order, allowed placeholders, and length limits on the server.
- Return generic login failure text so responses do not expose verifier details.
- Set protected API responses to `Cache-Control: no-store`.
- Never include guest records, template content, session tokens, or access-code material in logs.

The existing proxy trust model remains the source of the client address. The implementation must not weaken the current guestbook rate-limit behavior.

## Synchronization and Concurrency

SQLite on the VPS is the single source of truth.

The dashboard refreshes data:

- On initial authenticated load.
- After every successful mutation.
- When a hidden tab becomes visible again.
- When the user activates the explicit refresh action.

No background WebSocket or permanent polling connection is required.

Every mutation sends the last known `version`. The server updates only when the stored version matches. A mismatch returns a conflict response containing no silent overwrite. The interface preserves the user's attempted values, explains that another device changed the record, and offers to load the latest version.

## Public Invitation Changes

Personal rendering remains the default for backward compatibility.

For Group:

- Read raw `to` text.
- Sanitize and trim it using the existing safety limits.
- Render `Keluarga Besar {name}` in Indonesian.
- Render `The {name} Family` through the English dictionary when the locale changes.
- Do not duplicate the prefix when an old link already contains `Keluarga Besar`; compatibility logic normalizes the legacy value before rendering.

For Personal Bergelar:

- Read repeated `title` parameters in order.
- Apply the same sanitization and length limits to each title.
- Reject empty entries and cap the number and total rendered length.
- Render `{titles} {name} & Pasangan` in Indonesian and the existing partner equivalent in English.

The invitation does not call the admin API. A shared URL remains sufficient to render the cover.

## Error Handling

- Login failure keeps the code field focused and reports a neutral error.
- API loading shows what is being loaded, not a bare spinner.
- Empty guest list and no filter results use different messages and actions.
- Save errors preserve every form value.
- Clipboard errors leave status unchanged and expose a selectable message fallback.
- Session expiry redirects to login and preserves a safe return path.
- Validation errors identify the exact field and move focus to it.
- Concurrent-edit conflicts preserve attempted values until the user chooses whether to reload.
- Delete failure leaves the row in place.
- Public invitation parsing falls back to the existing non-personalized cover when the name is empty after sanitization.

## Migration and Deployment

1. Add idempotent database migrations for the new tables and default titles.
2. Back up the production SQLite database and verify its integrity before migration.
3. Configure the access-code verifier through production environment settings.
4. Deploy to the isolated staging Compose stack.
5. Verify public HTML, assets, RSVP guestbook, old Personal links, legacy Group links, new Group links, and Personal Bergelar links.
6. Verify authenticated CRUD and cross-device refresh using staging-only guest records.
7. Deploy the existing static and API services through the documented release process.
8. Confirm database integrity, health endpoint, protected API behavior, and public invitation behavior after cutover.
9. Keep the prior application image and database backup available for rollback.

## Testing

### Unit tests

- Display-name rendering for every category and locale.
- Ordered multiple titles and custom titles.
- Group prefix normalization for new and legacy URLs.
- Query-string encoding and decoding.
- Message placeholder validation and interpolation.
- Status transition rules.
- Normalized duplicate detection.

### API tests

- Login success, failure, rate limit, expiry, logout, and unauthorized access.
- Guest create, read, filter, search, update, conflict, and delete.
- Relationship-group and category validation.
- Default title retrieval and custom-title uniqueness.
- Message-template reads and updates.
- Cache and cookie headers.
- Existing guestbook contract and rate-limit regression.

### Browser verification

- Login and logout on desktop and mobile.
- Add each invitation category.
- Add and reorder multiple titles.
- Search and combine every filter.
- Copy a configured message and observe the correct status transition.
- Exercise the clipboard-failure fallback.
- Mark sent, copy again, and confirm status is not downgraded.
- Edit, delete, duplicate warning, session expiry, and conflict handling.
- Empty, loading, validation, server-error, and filtered-empty states.
- Keyboard-only operation and visible focus order.
- Mobile reflow, 200 percent zoom, touch targets, and on-screen keyboard behavior.
- Console remains free of application errors during the click-through.

## Acceptance Criteria

- Andrika and Aliva can access the same current list from separate devices using one shared code.
- An unauthenticated request cannot read or modify guest, title, or template data.
- A guest can be added manually to one of the four approved relationship groups.
- Personal, Group, and Personal Bergelar links render the approved recipient line.
- Group users enter only the raw group name, such as `Cimahi`.
- Personal Bergelar supports ordered multiple titles and reusable custom titles.
- One user-supplied template produces a copyable message with the rendered name and correct link.
- A successful copy records `copied` without claiming `sent`.
- Sent status is manual and is never downgraded by another copy action.
- Search and filters remain usable with 200 to 300 records.
- A concurrent edit cannot silently overwrite a newer version.
- Existing RSVP, guestbook, old `?to=` links, language switching, countdown, and public invitation behavior pass regression tests.
- Desktop and mobile implementations pass the antislop delivery gate, including responsive layout, keyboard access, contrast, real UI states, and recorded interaction verification.

## Implementation Boundary

This document defines one implementation cycle. The only external content dependency is the final formal message supplied by the product owner. Its absence does not block implementation because the product explicitly supports an unconfigured-template state with copying disabled.
