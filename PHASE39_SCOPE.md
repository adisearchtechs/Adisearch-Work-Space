# Phase 39 — Status Report History & Snapshots

## Objective

Turn the current workspace and team status-report read models into a secure historical record without inventing forecasts, trends, capacity, velocity, or AI-generated operating claims.

## Shipped surface

- Add an immutable `status_report_snapshots` persistence table.
- Support two explicit scopes: `workspace` and `team`.
- Capture snapshots server-side from the already released authenticated dashboard and dependency read models; clients never submit snapshot payloads.
- Store the exact generated source timestamp, schema version, creator, scope, optional team, and JSON payload.
- Add `GET /api/status-report-snapshots` for tenant-scoped history reads.
- Add `POST /api/status-report-snapshots` for same-origin, authenticated, non-guest snapshot capture.
- Add `/{orgId}/status-history` with workspace and team capture controls, historical metrics, and arithmetic comparison against the immediately previous snapshot in the same series.
- Add a stable Workspace → Status history navigation entry.

## Security and integrity

- Row Level Security is enabled on the snapshot table.
- Organization members may read snapshots only inside organizations they belong to.
- Only users allowed to write to the organization may insert, and `created_by` must equal `auth.uid()`.
- Anonymous access is revoked.
- Authenticated clients receive only `SELECT` and `INSERT`; no `UPDATE` or `DELETE` grant is provided, so saved snapshot content is immutable through the application role.
- Team foreign keys are organization-scoped to prevent cross-tenant team references.
- Snapshot creation enforces the existing same-origin mutation check.
- Snapshot payloads are assembled on the server by invoking the released authenticated read models. A caller cannot persist a fabricated dashboard payload.

## Comparison semantics

Comparison is deliberately narrow and deterministic:

- Workspace snapshots compare persisted counts such as active issues, attention, active projects, recorded at-risk/off-track project health, open milestones, and unresolved dependencies.
- Team snapshots compare persisted active/completed work, attention, blocked/overdue counts, and unresolved dependency edges touching that team.
- A displayed delta is only `current snapshot value - previous snapshot value`.
- Positive or negative deltas are not labeled as improvement, deterioration, trend, velocity, risk, forecast, or performance.

## Explicit non-goals

Phase 39 does **not** add:

- scheduled snapshot creation,
- email or Slack delivery,
- predictive delivery dates,
- inferred health or risk scoring,
- team capacity or workload percentages,
- velocity analytics,
- AI-written status summaries,
- historical backfill fabricated from current records.

Those capabilities require separate product and trust decisions in later phases.
