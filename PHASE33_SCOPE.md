# Phase 33 — Milestone Planning Views

## Goal

Turn the persistent project milestones and issue milestone assignments delivered in earlier phases into an actionable planning surface. A milestone should no longer be only a checkpoint/selector: workspace members can open it, understand progress, and work the exact issues assigned to it.

## Delivered

- Added a nested milestone plan route at `/:orgId/project/:projectId/milestones/:milestoneId`.
- Added real milestone summary metrics:
  - assigned issue count,
  - planned issue count excluding canceled work,
  - completed issue count,
  - completion percentage,
  - target date and milestone completion state.
- Added board and list presentations backed by the existing issue system.
- Reused the existing issue filter bar, issue grouping, ordering, drag/drop status behavior, and persistence adapter.
- Kept milestone planning strictly scoped to issues whose `project_id` and `milestone_id` match the opened project/milestone.
- Enhanced the milestone index with real assigned issue counts, progress, and direct links to each plan.
- Kept the Milestones project tab active for nested milestone routes.
- Added explicit loading, missing-milestone, empty-plan, and filtered states.

## Persistence and security

No new database migration is required for Phase 33.

Configured workspaces reuse the existing persistent model:

- `public.project_milestones` is the source of milestone records.
- `public.issues.milestone_id` is the source of milestone assignment.
- the existing composite database constraint continues to guarantee that an assigned milestone belongs to the issue's same project and organization.
- issue mutations continue through the existing secured issue API/persistence adapter; Phase 33 adds no bypass or alternate mutation endpoint.
- guest behavior remains governed by the existing issue and milestone permissions.

## Demo separation

Configured workspace planning reads the persistent milestone and issue stores only. Existing mock project milestones remain available only for the unconfigured demo experience and are not merged into configured workspace data.

## Deferred

- bulk milestone assignment,
- capacity forecasts and workload analytics,
- automated scheduling,
- cross-project milestone portfolios,
- arbitrary issue sets spanning multiple project milestones.

## Verification gate

Before merge:

1. `pnpm check`
2. production `pnpm build`
3. verify the exact PR head is green in GitHub Actions
4. merge normally to `master`
5. verify the Vercel production deployment reaches `READY`
