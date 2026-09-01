# Phase 15 — Workspace Label Management

## Goal

Replace the mock-only Issue labels settings surface with the real shared workspace label catalog that already backs issue, project, and initiative label assignments.

## Scope

- List persisted workspace labels in configured workspaces.
- Show assignment counts across issues, projects, and initiatives.
- Create labels with a bounded name and six-digit hex color.
- Rename and recolor labels.
- Delete labels with explicit confirmation and assignment-impact messaging.
- Keep guest access read-only.
- Keep deterministic mock labels only for unconfigured/demo mode.
- Return conflict responses for duplicate workspace label names.

## Database

No new database migration is required for Phase 15.

The existing `public.labels` table already provides:

- organization scoping,
- row-level security,
- member reads,
- non-guest writes through `private.can_write_org`,
- authenticated SELECT/INSERT/UPDATE/DELETE grants,
- anonymous access denial,
- six-digit hex color validation,
- 1–60 character label-name validation,
- unique `(organization_id, name)` enforcement.

The Phase 14 `initiative_labels` relationship joins the existing `issue_labels` and `project_labels` relationships when calculating shared label usage.

## Release train

Phase 15 is stacked on the exact Phase 14 head while Vercel's daily deployment quota is exhausted.

- GitHub CI is required.
- Do not merge Phase 15 into `master` until Phase 14 has been previewed, merged, and production-verified.
- Do not deliberately trigger a Vercel deployment for Phase 15 while the quota is exhausted.

## Deferred

- label groups,
- label archiving,
- bulk label operations,
- per-team label catalogs,
- custom label ordering.
