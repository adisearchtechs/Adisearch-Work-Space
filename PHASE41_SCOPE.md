# Phase 41 — Saved Status Snapshot Comparison

## Goal

Compare any two immutable saved status snapshots from the same workspace or team series without converting factual differences into inferred performance or forecasting claims.

## In scope

- A stable `/{orgId}/status-history/compare` workspace route.
- Workspace and team series selection from the authenticated Phase 39 snapshot history.
- Selection of any two saved snapshots from the same series.
- Arithmetic metric comparison where `difference = Snapshot A - Snapshot B`.
- Factual set-membership comparison for saved attention items and unresolved dependency edges.
- Deterministic copy-ready comparison text assembled only from the two selected saved payloads.
- Stable Workspace → Compare snapshots navigation.

## Security and data boundaries

- The comparison screen reuses the authenticated, tenant-scoped Phase 39 history API.
- No service-role credential is introduced.
- No snapshot is mutated, deleted, re-generated, or made public.
- No new database table, grant, policy, or migration is required.
- The browser compares only records already authorized and returned for the current workspace.

## Truthfulness boundary

A numeric difference means exactly:

`Snapshot A saved value - Snapshot B saved value`

Attention and dependency differences mean only that a saved entity ID appears in one selected payload and not the other.

The UI does **not** describe differences as improvement, deterioration, progress, regression, trend, performance, risk, velocity, capacity, productivity, health inference, delivery confidence, or forecast.

No AI-generated interpretation is added.

## Explicitly not included

Phase 41 does **not** add scheduled captures, automatic reporting, public share links, email or Slack delivery, mutable history, retention policies, inferred trend analytics, forecast models, or historical backfill.
