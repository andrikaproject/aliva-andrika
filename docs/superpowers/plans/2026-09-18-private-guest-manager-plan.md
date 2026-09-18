# Private Guest Manager Implementation Plan

## Phase 1: Domain rules and regression coverage

1. Add a pure invitation-recipient formatter for Personal, Group, and Personal Bergelar.
2. Add tests for group prefix generation, legacy group values, ordered titles, URL encoding, and status-safe display rules.
3. Update public invitation dictionaries and runtime parsing while keeping existing `?to=` links valid.

## Phase 2: API persistence and authentication

1. Extend the existing SQLite initialization with isolated invitation-admin tables and indexes.
2. Add seeded title records and an empty singleton message-template setting.
3. Add shared-code login, server-side hashed sessions, logout, expiry, rate limiting, same-origin checks, and no-store responses.
4. Add protected guest, title, settings, and session endpoints with validation and optimistic version checks.
5. Add API tests for authentication, CRUD, filters, title order, template validation, status transitions, conflict handling, and regression of the public guestbook.

## Phase 3: Dashboard UI

1. Add the static Astro dashboard shell at `/guest-manager`.
2. Add focused browser modules for session bootstrap, list filters, guest form, titles, message-template settings, clipboard feedback, and status updates.
3. Add responsive styles following the approved warm editorial direction and mobile reflow.
4. Implement empty, loading, error, conflict, validation, and expired-session states.
5. Add keyboard focus, dialog Escape handling, touch targets, and clipboard fallback behavior.

## Phase 4: Verification and release safety

1. Run unit, API, typecheck, and production build tests.
2. Run a browser click-through at desktop and mobile widths, including the public invitation URL variants.
3. Verify database migration and backup behavior in a temporary database.
4. Update deployment documentation with the access-code verifier setup and release checks.
5. Review the antislop delivery gate and record evidence before handoff.
