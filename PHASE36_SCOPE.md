# Phase 36 — Workspace Dependency Map

## Goal

Turn the normalized issue relationships already released in production into a truthful workspace-level dependency view without inventing schedule forecasts or a second planning model.

Phase 36 focuses only on persisted `blocks` relationships. It rolls unresolved blockers up across projects so the workspace can see where work is waiting on other work and which project boundaries are involved.

## In scope

- Add an authenticated, tenant-scoped `GET /api/dependencies?organization=<slug>` read endpoint.
- Read only persisted `issue_relations` rows whose `relation_type` is `blocks`.
- Treat a dependency as unresolved only while both the blocking and blocked issues are not completed or canceled.
- Hydrate both ends of each dependency with real issue identifiers, titles, status, due date, team, and project context.
- Detect cross-project dependencies only when both issues have project assignments and the projects differ.
- Roll unresolved cross-project blockers up into project-level inbound and outbound dependency counts.
- Show the unique projects blocking each project and the unique projects each project blocks.
- Flag a blocked issue as overdue only when its persisted due date is before today.
- Surface unresolved dependencies that include at least one issue without a project, but exclude those edges from project rollups.
- Add `/{orgId}/dependencies` and a stable Workspace → Dependencies sidebar destination.
- Preserve unconfigured/demo behavior without fabricating dependency data.
- Keep configured responses `private, no-store` and bounded.

## Data model

No new database migration is required.

Phase 36 reuses the released schema:

- `organizations`
- `organization_members`
- `teams`
- `statuses`
- `issues`
- `projects`
- `issue_relations`

The existing `issue_relations` table already constrains relationship types, enforces same-organization issue foreign keys, indexes both relationship directions, and protects reads/writes with RLS.

## Truthfulness rules

- Only explicit persisted `blocks` edges are treated as dependencies.
- `parent` and `related` relationships are not converted into blocking dependencies.
- Completed or canceled blocking issues resolve the dependency for this view.
- Completed or canceled blocked issues are excluded because they no longer represent active blocked work.
- Project rollups count persisted issue-level blocking edges; they are not estimates of effort, duration, critical path, or probability.
- Overdue means a persisted due date is earlier than today. No delivery forecast is inferred.
- Issues without projects remain visible at issue level and are never silently assigned to a project.
- The view does not infer capacity, velocity, workload percentage, or predicted completion dates.

## Deferred

- Historical dependency trend analytics after enough real production history exists.
- Critical-path scheduling once duration/estimate semantics are intentionally modeled.
- Capacity and member workload analytics after a real multi-member capacity model exists.
- Scheduled workspace and team status summaries/reminders.
- Git provider and pull-request status synchronization.
- External project-management imports.
- Rich-text collaborative editing and discussion reactions/threading.

## Release gate

Phase 36 is complete only when:

1. Dependency reads authenticate the user, verify organization membership, and scope every query to the organization.
2. Only unresolved persisted `blocks` relationships appear.
3. Cross-project rollups preserve each issue's real project and team identity.
4. Projectless dependencies remain visible without being included in project rollups.
5. The dependency page is reachable from workspace navigation.
6. Demo/unconfigured mode does not fabricate relationship data.
7. `pnpm check` passes.
8. The production Next.js build passes.
9. No production database migration is required or applied for this phase.
