# Phase 38 — Team Status Report

## Goal

Give each team a concise, copy-ready operating update built only from the persistent team dashboard and explicit workspace dependency records already released.

Phase 38 narrows the Phase 37 reporting pattern to a single team so leads and members can communicate current work, cycle state, persisted project health, and blockers without introducing a second planning model or AI-authored conclusions.

## In scope

- Add `/{orgId}/team/{teamId}/status-report` as an authenticated team surface.
- Reuse the existing tenant-scoped `GET /api/teams/{teamId}/dashboard?organization=<slug>` read model.
- Reuse the existing tenant-scoped `GET /api/dependencies?organization=<slug>` read model and include only unresolved dependency edges where the selected team owns either endpoint.
- Summarize active and completed work, blocked/overdue/urgent counts, and bounded attention items.
- Summarize the current persisted cycle state when a cycle is active.
- Summarize owned projects and only their latest persisted project health states.
- Summarize unresolved team-related blockers, including cross-project and overdue-blocked relationships.
- Add a deterministic **Copy team update** action assembled only from loaded read-model fields.
- Add Team → Status report navigation for configured teams.
- Keep the reporting surface unavailable in demo/unconfigured mode instead of fabricating team operating data.
- Keep this phase read-only.

## Data model

No new database migration is required.

Phase 38 composes released persistent read models and does not create a report snapshot table, delivery queue, schedule table, or alternate source of truth.

## Truthfulness rules

- Current-cycle completion is the persisted issue completion ratio already produced by the team dashboard; it is not velocity or a forecast.
- Project progress remains an issue-completion ratio, not an effort estimate.
- Project health is displayed only when a persisted project health update exists.
- Team attention counts are based only on persisted blocked status, due dates, urgency, and the existing due-soon window.
- Team dependencies are only unresolved persisted `blocks` relationships touching the selected team.
- The copied team update is deterministic and does not call an AI model.
- The report does not infer capacity, member utilization, workload percentage, velocity, critical path, delivery probability, or predicted completion dates.

## Deferred

- Scheduled team status delivery until an intentional outbound provider/channel is configured.
- Email, Slack, or other automatic delivery.
- Historical cycle trend analytics until sufficient production history exists.
- AI-authored team summaries unless they preserve source attribution and the same truthfulness boundaries.
- Member workload and capacity analytics until a real capacity model exists.

## Release gate

Phase 38 is complete only when:

1. `/{orgId}/team/{teamId}/status-report` is reachable from team navigation.
2. Configured mode resolves the selected runtime team and loads both existing authenticated tenant-scoped read models.
3. Dependency output is filtered to edges touching that team.
4. Persisted health is clearly distinguished from inferred risk.
5. **Copy team update** is deterministic and sourced only from the loaded snapshot.
6. Demo/unconfigured mode does not fabricate team status data.
7. Source regression coverage verifies the route, both read-model calls, team filter, navigation, copy action, and truthfulness boundaries.
8. `pnpm check` and the production build pass.
9. Exact-head CI, browser E2E, and authenticated E2E remain green before merge.
10. No database migration is required or applied for this phase.
