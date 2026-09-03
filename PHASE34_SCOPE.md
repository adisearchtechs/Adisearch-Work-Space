# Phase 34 — Team Operating Dashboard

## Goal

Turn configured team overview pages into truthful operating dashboards using the persistent workspace data already released and populated in production.

Phase 34 is intentionally a read-model and UI phase. It does not create a parallel planning system and does not invent capacity assumptions that the workspace cannot yet support.

## In scope

- Add a tenant-scoped, authenticated `GET /api/teams/[teamId]/dashboard` read endpoint.
- Derive the current team cycle from persisted `cycles` using the server date.
- Report current-cycle scope, started, completed, canceled, and completion rate from persisted issue workflow categories.
- Summarize team-owned work using persisted issue status, priority, and due dates.
- Surface a bounded attention list for blocked, overdue, urgent, and next-seven-day due work.
- Summarize projects whose primary `team_id` is the current team.
- Derive each owned project's issue completion rate across all issues linked to that project, including valid cross-team contributors.
- Surface the latest persisted project health update from `project_updates` when one exists.
- Preserve the existing configured-team member and pinned-document experience.
- Preserve demo mode and its existing mock behavior.
- Keep configured responses `private, no-store` and enforce organization membership plus team scope through the existing authorization path.

## Data model

No new database migration is required.

Phase 34 reuses already released tables and relationships:

- `teams`
- `team_members`
- `cycles`
- `issues`
- `statuses`
- `projects`
- `project_updates`
- `team_documents`

The production population completed immediately before this phase gives all 20 intended teams a member, current cycle, pinned operating charter, and real work context, so the dashboard can render meaningful data without seed-only fallbacks.

## Truthfulness rules

- Attention counts are derived only from persisted issue state; the dashboard does not manufacture risk scores.
- Project progress is issue-completion progress, not an estimate of engineering effort or schedule probability.
- Project health is shown only when a persisted health update exists; otherwise the UI says there is no health update.
- Cross-team issues keep their immutable team identity while still contributing to project progress when they reference a project owned by this team.
- A current cycle is shown only when today's date is within its persisted date range.
- Capacity forecasts and workload percentages are deliberately not inferred from issue counts. Production currently has one real workspace member, so such numbers would be misleading.

## Deferred

- Capacity forecasts and workload analytics after a real multi-member capacity model exists.
- Historical throughput, velocity, and cycle-trend analytics.
- Cross-project milestone portfolio views.
- Scheduled team status summaries and reminders.
- Per-team custom dashboard widgets/layouts.
- Git provider and pull-request status synchronization.
- External project-management imports.
- Rich-text collaborative editing and discussion reactions/threading.

## Release gate

Phase 34 is complete only when:

1. The dashboard endpoint is authenticated and tenant-scoped.
2. Configured team overview renders current cycle, attention, owned projects, members, and pinned documents from persistent data.
3. Demo mode remains unchanged.
4. `pnpm check` passes.
5. The production Next.js build passes.
6. No production database migration is required or applied for this phase.
