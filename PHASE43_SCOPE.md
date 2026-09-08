# Phase 43 — Persistent Status Catalog & Milestone Planning Truthfulness

## Goal

Remove the remaining configured milestone-planning dependency on deterministic demo project/status data and render the authenticated workspace workflow from the persisted `statuses` catalog.

Phase 43 is a runtime truthfulness milestone. It does not add or modify database schema.

## Included

- authenticated `GET /api/statuses?organization=...` backed by the existing tenant-scoped `statuses` table
- status responses preserve persisted `position` ordering and include id, name, slug, color, category, and position
- configured milestone planning loads the persisted workspace status catalog
- configured milestone planning never calls `getProjectDetail()`
- configured milestone planning never uses `displayOrderedStatus` as a fallback
- status-catalog failures fail closed with an explicit workflow-load error
- persisted status categories/colors receive lightweight runtime glyphs without fabricating extra workflow metadata
- unconfigured demo mode retains deterministic project details and display-ordered demo statuses

## Security and data boundaries

- the status API reuses authenticated workspace membership authorization
- status rows are scoped by the resolved organization id
- response caching is `private, no-store`
- guests may read the status catalog because they are workspace members with read access
- no mutation endpoint, service-role credential, schema change, grant change, or RLS change is introduced

## Truthfulness rules

1. Configured milestone planning must render persisted status ids/names/categories/colors in persisted order.
2. Failure to load the authenticated status catalog must never fall back to demo statuses.
3. `getProjectDetail()` remains demo-only and must not execute for configured workspaces.
4. `displayOrderedStatus` remains demo-only and must not supply configured workflow columns.
5. Demo behavior may remain deterministic when Supabase is not configured.

## Explicitly out of scope

- status creation/editing/reordering settings
- database migration or new status fields
- custom status icon persistence
- workflow automation
- cross-team status templates
- new milestone fields or milestone assignment semantics
- inferred project/milestone health

## Release gate

- repository checks pass on the exact Phase 43 head
- production application build passes on the exact Phase 43 head
- Browser E2E and Authenticated E2E pass when triggered by the PR
- no unresolved review threads
- no database migration is required
- do not deliberately trigger an extra Vercel deployment as part of this phase
