# Phase 37 — Workspace Status Report

## Goal

Turn the persistent workspace portfolio and dependency read models already released into a concise, copy-ready operating update without introducing AI-generated claims, predictive delivery scoring, or a second planning model.

Phase 37 gives workspace members one place to review the current operating snapshot and copy a deterministic status update for use in an existing communication channel.

## In scope

- Add `/{orgId}/status-report` as an authenticated workspace surface.
- Reuse the existing tenant-scoped `GET /api/dashboard?organization=<slug>` and `GET /api/dependencies?organization=<slug>` read models.
- Load both snapshots concurrently and keep all configured reads same-origin and authenticated through the existing session.
- Summarize active and completed issues plus the bounded workspace attention list.
- Summarize active projects and only the latest persisted project health states that already exist in the portfolio read model.
- Summarize open and overdue milestones from persisted milestone dates and completion state.
- Summarize unresolved, cross-project, projectless, and overdue blocked dependencies from persisted `blocks` relationships.
- Surface a bounded list of attention items, persisted at-risk/off-track projects, upcoming or overdue milestones, and unresolved blockers.
- Add a deterministic **Copy status update** action that writes a plain-text snapshot to the clipboard. The copied text is assembled only from the loaded read-model fields.
- Add a stable Workspace → Status report sidebar destination.
- Preserve unconfigured/demo behavior without fabricating status data.
- Keep this phase read-only. No project, issue, milestone, dependency, health, or initiative mutation is added.

## Data model

No new database migration is required.

Phase 37 reuses the released read models backed by the current persistent schema. The status report does not add a reporting table, snapshot table, scheduled-job table, or alternate source of truth.

## Truthfulness rules

- Project and initiative progress remain issue-completion ratios, not effort estimates or schedule predictions.
- Project health is shown only when a persisted project health update exists; absence of a health update is not converted into a healthy state.
- At-risk and off-track counts are labeled as persisted health states, not inferred risk scores.
- Overdue milestones and blocked issues are derived only from persisted dates and current completion state.
- Dependencies come only from unresolved persisted `blocks` relationships.
- The copied status text is deterministic and does not call an AI model or generate conclusions that are absent from the loaded data.
- The report does not infer capacity, workload percentage, velocity, critical path, delivery probability, or predicted completion dates.
- Demo/unconfigured mode states that persistent status reporting is unavailable instead of showing mock operating metrics.

## Deferred

- Scheduled workspace and team status delivery until an intentional delivery channel and provider configuration are available.
- Email, Slack, or other outbound status delivery.
- Historical trend analytics until enough real production history exists.
- AI-authored executive summaries; any future AI summary must preserve source attribution and the same truthfulness boundaries.
- Capacity and workload forecasting until a real multi-member capacity model exists.
- Critical-path scheduling until duration and estimate semantics are intentionally modeled.

## Release gate

Phase 37 is complete only when:

1. `/{orgId}/status-report` is reachable from Workspace navigation.
2. Configured mode loads both existing authenticated tenant-scoped read models and does not introduce an unscoped data path.
3. The report distinguishes persisted health from inferred risk and does not fabricate forecasts or capacity metrics.
4. **Copy status update** produces deterministic plain text from the loaded snapshot only.
5. Demo/unconfigured mode does not fabricate workspace status data.
6. Source regression coverage verifies the route, both read-model calls, navigation, copy action, and truthfulness boundaries.
7. `pnpm check` passes.
8. The production Next.js build passes.
9. Exact-head CI, browser E2E, and authenticated E2E remain green before merge.
10. No production database migration is required or applied for this phase.
