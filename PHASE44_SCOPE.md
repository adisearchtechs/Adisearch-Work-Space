# Phase 44 — Persistent Status Administration

## Goal

Turn the truthful-but-unavailable Project statuses settings surface into real tenant-scoped workflow administration backed by the persisted `statuses` catalog introduced to configured runtime surfaces in Phase 43.

Phase 44 is a persistence and permissions milestone. It uses the existing `statuses` schema and RLS policies; no database migration or privilege expansion is required.

## Included

- Settings → Project statuses loads the authenticated persisted workspace status catalog
- owner/admin-only creation of statuses with validated name, category, color, generated stable slug, and appended persisted position
- owner/admin-only editing of status name, category, and color without silently changing the stable slug
- owner/admin-only persisted reordering of the complete status catalog
- owner/admin-only deletion when the status is not referenced by issues
- referenced statuses fail deletion closed with a conflict response instead of cascading issue state loss
- members and guests may read the status catalog but cannot mutate it
- configured failures never fall back to demo statuses
- demo mode remains explicitly read-only and uses the deterministic demo catalog only

## Security and data boundaries

- all mutation requests require a valid same-origin request
- mutations require authenticated owner/admin workspace membership at the API layer
- existing `statuses_*_admins` RLS policies remain authoritative in the database
- every query is constrained to the server-resolved organization id
- no service-role credentials are introduced
- response caching remains private/no-store for catalog reads

## Ordering rules

1. Persisted `position` is the sole configured-workspace ordering source.
2. New statuses append after the current highest position.
3. Reorder requests must contain every current status id exactly once.
4. Reordering writes the whole verified catalog in one tenant-scoped upsert statement so a failed request does not intentionally publish a partial client order.
5. Demo ordering remains isolated to unconfigured mode.

## Deletion rules

- status deletion never cascades to issues
- a status referenced by any issue returns `409 Conflict`
- unknown or cross-tenant status ids return `404 Not found`

## Explicitly out of scope

- custom persisted status icons
- workflow automation
- cross-team workflow templates
- status archival/restore semantics
- per-team status catalogs
- automatic issue migration when deleting a status
- inferred status behavior from status names

## Release gate

- repository checks pass on the exact Phase 44 head
- production application build passes on the exact Phase 44 head
- Browser E2E and Authenticated E2E pass on the exact PR head
- authenticated regression verifies admin mutation plus non-admin denial and tenant isolation
- zero unresolved review threads
- exact-head merge only
- post-merge CI, Browser E2E, and Authenticated E2E certify the merge commit
- do not deliberately trigger an extra Vercel deployment as part of this phase
