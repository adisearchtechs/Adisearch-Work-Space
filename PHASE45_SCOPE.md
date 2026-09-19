# Phase 45 — Persistent Issue Templates

## Goal

Replace the invented Issue templates settings component with a real tenant-scoped template catalog that workspace members can use when creating issues.

## Included

- persisted workspace issue-template records
- authenticated tenant-scoped template listing
- owner/admin-only creation, editing, ordering, and deletion
- template name, optional description, default issue title, and optional default issue description
- active/inactive state without deleting historical configuration
- stable ordering sourced only from persisted position
- Settings → Issue templates renders persisted data and never fabricated samples
- issue creation may explicitly apply a selected active template
- applying a template only pre-fills editable fields; it never bypasses normal issue validation or authorization
- demo mode remains read-only and clearly identified

## Data and security boundaries

- every record belongs to one organization
- all reads and writes require authenticated organization membership
- mutations require owner/admin membership and valid same-origin requests
- RLS is authoritative; no service-role credentials
- template application is server-validated against the issue's organization
- cross-tenant template ids return not found
- response caching is private/no-store
- request bodies use strict schemas and existing size limits

## Ordering rules

1. Persisted position is the only production ordering source.
2. New templates append after the current highest position.
3. Reordering must contain every current workspace template id exactly once.
4. Archived templates remain addressable in settings but are excluded from issue-creation choices.

## Explicitly out of scope

- per-team templates
- automation or workflow execution
- dynamic variables and executable expressions
- public template sharing
- external marketplace templates
- automatic issue creation
- attachment copying
- service-role access

## Release gate

- migration and generated database types remain aligned
- repository checks and production build pass on the exact head
- Browser E2E and Authenticated E2E pass on the exact PR head
- authenticated coverage verifies admin mutation, non-admin denial, tenant isolation, and inactive-template exclusion
- zero unresolved review threads
- normal exact-head merge only
- no CI bypass
