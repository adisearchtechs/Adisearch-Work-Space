# Phase 40 — Saved Status Snapshot Detail & Export

## Goal

Turn Phase 39's immutable status history into an inspectable operational record without changing the meaning of saved data.

## In scope

- Authenticated, tenant-scoped retrieval of one saved workspace or team status snapshot.
- Retrieval of the immediately previous saved snapshot in the same series for arithmetic comparison only.
- A stable `/{orgId}/status-history/{snapshotId}` detail route.
- Frozen metric, attention, persisted project-health, and unresolved-dependency rendering from the saved payload.
- Deterministic copy-ready text generated only from the saved payload.
- Client-side JSON export of the same authenticated frozen record.
- A `View saved snapshot` link from each Status history card.

## Security and data boundaries

- Snapshot IDs are validated as UUIDs before database access.
- Every snapshot lookup is constrained to the already-authorized organization ID.
- Existing RLS remains authoritative; no service-role path is introduced.
- The detail endpoint is read-only and does not expose UPDATE or DELETE behavior.
- JSON export occurs only after the signed-in user has loaded an authorized snapshot.
- No public/share token is created in this phase.

## Truthfulness boundary

The detail page renders the saved payload as historical fact. A delta is exactly:

`current saved value - immediately previous saved value in the same series`

The UI does **not** label a positive or negative delta as improvement, deterioration, trend, velocity, risk, forecast, performance, capacity, or delivery confidence.

Copy-ready text is deterministic and assembled only from saved fields. No AI-generated summary or inferred claim is added.

## Explicitly not included

Phase 40 does **not** add scheduled captures, email delivery, Slack delivery, public sharing, mutable snapshot history, automatic retention/deletion, forecast models, inferred trends, or historical backfill.
