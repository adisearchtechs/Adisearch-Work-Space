# Phase 18 — Persistent Cycles / Sprints

## Objective

Replace the configured-workspace mock cycle timeline with the existing tenant-scoped Supabase `cycles` model and make cycles operational enough to plan work.

## Included

- Load real cycles for the current workspace team.
- Resolve configured teams by either database UUID or stable team key so legacy team routes such as `CORE` continue to work during the runtime-team migration.
- Derive cycle status from persisted start/end dates: upcoming, current, or completed.
- Calculate live scope, started, completed, canceled, and success metrics from persisted issue workflow state.
- Create cycles with bounded names and valid ISO dates.
- Reject overlapping cycle windows within the same team.
- Edit cycle name and dates with the same overlap protection.
- Delete cycles with explicit UI confirmation.
- Rely on the existing issue → cycle foreign key `ON DELETE SET NULL`, so deleted-cycle issues safely return to the team backlog.
- Assign unplanned team issues to a cycle and remove assigned issues back to backlog.
- Keep guests read-only while owner/admin/member roles follow the existing `private.can_write_org` policy.
- Keep deterministic mock cycles and burn-up visuals only for unconfigured demo mode.
- Remove configured header fallback to the mock Core team.

## Database

No new Phase 18 production migration is required.

The existing `public.cycles` table already provides:

- tenant identity through `organization_id`
- team identity through `team_id`
- bounded `name`
- `starts_at` / `ends_at` date fields with `ends_at >= starts_at`
- composite tenant foreign key to `teams`
- RLS enabled
- authenticated member reads
- owner/admin/member writes through `private.can_write_org`
- anonymous access denied

The existing `issues_cycle_id_organization_id_fkey` uses `ON DELETE SET NULL (cycle_id)`.

## Product rules

- Cycle windows may not overlap within one team.
- Cycle status is date-derived rather than persisted as a second source of truth.
- Configured cycle metrics are live aggregates, not fabricated historical analytics.
- Historical burn-up charts remain demo-only until event/snapshot history is persisted.
- Cycle deletion is allowed only after user confirmation and returns assigned issues to backlog.

## Release queue

Phase 18 is stacked on the green Phase 17 head while Vercel deployment quota remains frozen.

- Base: `phase17-workspace-members-permissions`
- Head: `phase18-persistent-cycles`
- GitHub CI is required before this phase is considered queued-ready.
- Do not merge until Phases 14–17 have been previewed, released in order, and production-verified.
- Do not deliberately create a Vercel deployment while the quota freeze is active.

## Deferred

- historical burn-up snapshots / scope-change event history
- automatic recurring cycle generation
- cycle capacity planning by individual member
- cycle goals and retrospectives
- persistent team overview/sidebar runtime migration for newly created teams
