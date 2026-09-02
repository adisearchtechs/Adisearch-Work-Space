# Phase 22 — Persistent Saved Views

## Objective

Replace configured workspace/team saved-view mocks with tenant-scoped persisted saved views while retaining deterministic mock views only for unconfigured demo mode.

## Delivered scope

- `saved_views` persists workspace- or team-scoped issue/project view definitions.
- Saved views have bounded name, description and icon fields, an immutable owner, and a bounded JSON filter contract.
- Workspace members can read saved views; guests are read-only.
- Non-guests can create views they own.
- A view owner or workspace owner/admin can update or delete that view.
- Team scope is validated against the current organization before creation.
- Workspace-level views have a direct organization foreign key; team-scoped views additionally use a composite `(team_id, organization_id)` foreign key.
- Configured workspace/team Views lists use the persistent API and real owner/team metadata.
- Configured view details filter the already-hydrated tenant issue/project stores instead of deterministic mock datasets.
- Team-scoped view details fail closed if the referenced tenant team cannot be resolved.
- Configured view headers use persistent metadata and only expose delete to authorized managers.
- Team Views is reachable from configured team tabs and sidebar navigation.
- The configured workspace Views header no longer exposes an inert create button; creation is provided by the persistent list.

## Filter boundary

Issue views support:
- status categories
- status slugs
- persisted issue priority
- whether an issue has a project

Project views support status categories only in Phase 22. Project priority is intentionally not exposed because project priority is not currently persisted by the configured project model.

## Database migrations

1. `20260902042336_add_saved_views`
   - creates `saved_views`
   - bounded fields and JSON-object filter constraint
   - owner/profile linkage
   - composite team/tenant linkage
   - tenant/type/update indexes
   - updated-at trigger
   - RLS and authenticated grants
2. `20260902050138_add_saved_views_organization_foreign_key`
   - adds the direct organization FK required for workspace-level views where `team_id` is null

Post-migration Supabase advisors report no Phase 22 security/RLS/FK warning. The only security warning remains the pre-existing leaked-password-protection setting; performance notices are unused-index INFO only.

## Safety / tenancy rules

- Every API request resolves the organization from the authenticated request.
- Every saved-view query is scoped by `organization_id`.
- Mutations require same-origin requests.
- Guest writes are rejected.
- Ownership, team scope, view type and tenant IDs are not mutable through PATCH.
- Invalid project filters are rejected on both create and update.
- Configured routes never fall back to mock saved views or widen a missing team-scoped view to the whole workspace.

## Deferred

- arbitrary visual filter builder
- label/assignee/cycle saved-view filters
- persisted project priority filters
- shared/private per-view visibility
- favorites/star persistence
- view duplication
- view ordering/pinning persistence
- saved-view collaboration/history

## Release queue

Phase 22 is stacked on Phase 21. GitHub CI and production build are required before queue-ready status. Do not merge until the preceding queued phases have been released and production-verified in order. Do not deliberately deploy Phase 22 to Vercel while the deployment quota freeze remains active.
