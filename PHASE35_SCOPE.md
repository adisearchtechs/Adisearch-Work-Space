# Phase 35 — Workspace Portfolio Dashboard

## Goal

Replace the configured workspace root redirect with a truthful organization-level operating dashboard built from the persistent planning data already released and populated in production.

Phase 35 rolls work up above individual teams without creating a second planning model. It turns `/{orgId}` into the workspace operating home for portfolio health, initiatives, milestones, and issue attention.

## In scope

- Add an authenticated, tenant-scoped `GET /api/dashboard?organization=<slug>` read endpoint.
- Replace the configured `/{orgId}` hard-coded redirect to `CORE/all` with a real workspace overview.
- Preserve the existing unconfigured/demo redirect to `CORE/all`.
- Add a stable Workspace → Overview sidebar destination.
- Summarize workspace-wide active and completed issue counts from persisted workflow categories.
- Surface a bounded workspace attention list for blocked, overdue, urgent, and next-seven-day due issues.
- Summarize project progress from persisted issue completion, including cross-team contributors linked to each project.
- Surface latest persisted project health updates only when they exist.
- Add a cross-project milestone horizon using persisted `project_milestones` and real milestone issue assignments.
- Flag overdue milestones strictly from persisted target dates and completion state.
- Summarize initiatives using their persisted status, priority, linked projects, and latest persisted health updates.
- Derive initiative completion from issues belonging to linked projects; this is completion progress, not an effort or schedule forecast.
- Keep configured responses `private, no-store`.

## Data model

No new database migration is required.

Phase 35 reuses already released tables and relationships:

- `organizations`
- `organization_members`
- `teams`
- `statuses`
- `issues`
- `projects`
- `project_updates`
- `project_milestones`
- `initiatives`
- `initiative_projects`
- `initiative_updates`

## Truthfulness rules

- Project and initiative progress are issue-completion ratios, not estimates of engineering effort, schedule probability, or business outcome.
- Canceled issues are excluded from completion denominators.
- Attention signals use persisted status, priority, and due-date fields only.
- An issue receives one highest-priority attention reason in this order: blocked, overdue, urgent, due soon.
- Project and initiative health is shown only from persisted health state; the dashboard does not infer health from counts.
- Milestone overdue state is derived only when an unfinished milestone has a persisted target date before today.
- No velocity, capacity, workload percentage, or predictive delivery score is fabricated from issue counts.
- Cross-team issues keep their team identity while still contributing to the project or initiative they are linked to.

## Deferred

- Capacity forecasts and member workload analytics after a real multi-member capacity model exists.
- Historical throughput, velocity, and cycle-trend analytics after production has enough real history.
- Scheduled workspace and team status summaries/reminders.
- Per-user customizable dashboard widgets and layouts.
- Git provider and pull-request status synchronization.
- External project-management imports.
- Rich-text collaborative editing and discussion reactions/threading.

## Release gate

Phase 35 is complete only when:

1. Workspace dashboard reads authenticate the user, verify organization membership, and scope every query to the organization.
2. Configured `/{orgId}` renders the workspace portfolio dashboard instead of redirecting to `CORE/all`.
3. Unconfigured/demo mode preserves the existing `CORE/all` redirect.
4. Workspace Overview is reachable from the sidebar.
5. Portfolio health, milestone horizon, initiatives, and workspace attention use persistent data only.
6. `pnpm check` passes.
7. The production Next.js build passes.
8. No production database migration is required or applied for this phase.
