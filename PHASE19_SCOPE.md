# Phase 19 — Persistent Team Runtime Navigation & Overview

## Objective

Make teams created and managed through the persistent Phase 16 administration flow first-class runtime destinations instead of settings-only records.

## Included

- Add a tenant-scoped Zustand team store and SaaS team hydration provider.
- Refresh team runtime state when navigation changes so settings edits/creation are reflected when returning to the app.
- Extend the team collection response with the authenticated user's joined team IDs.
- Replace configured sidebar mock teams with persisted joined teams.
- Expose only persistent configured-team routes: Overview, Issues, Cycles, Projects, and Team settings.
- Keep demo-only shortcuts and mock team identities confined to unconfigured demo mode.
- Replace configured team headers with persisted team name/color identity.
- Replace configured team overview mock data with persisted metadata, usage counts, and member details.
- Keep mock documents/resources out of configured team overview.
- Resolve team routes by either team UUID or stable team key.
- Scope configured team issue pages to the resolved team's unique issue prefix so one team's route cannot display another team's issues.
- Scope team issue search to the already-scoped issue collection.
- Resolve configured team project routes to the persisted team key used by the existing project store.
- Reuse the shared team store in Cycles headers rather than independently fetching team identity.

## Database

No new Phase 19 database migration is required.

The phase reuses:

- `teams`
- `team_members`
- `organization_members`
- existing team RLS and grants
- existing per-organization unique `issue_prefix` and `key` constraints

Unique team issue prefixes make configured issue-route scoping deterministic without introducing a second runtime team identifier into the issue view model in this phase.

## Product safety rules

- Configured runtime navigation never falls back to mock Core when a team reference cannot be resolved.
- Team issue views fail closed to an empty/not-found state if the tenant team cannot be resolved.
- Configured team navigation does not expose mock Documents, Views, archive, subscription, leave-team, or fake current/upcoming cycle shortcuts.
- Team settings remains the source of administrative membership and metadata changes.
- Demo mode remains deterministic and mock-backed.

## Release queue

Phase 19 is stacked on the green Phase 18 head while Vercel deployment remains frozen.

- Base: `phase18-persistent-cycles`
- Head: `phase19-persistent-team-runtime`
- GitHub CI must pass before the phase is queue-ready.
- Do not merge until Phases 14–18 have been released and production-verified in order.
- Do not deliberately deploy Phase 19 to Vercel while the quota freeze is active.

## Deferred

- persistent team documents/resources
- team Views
- archive/retire/leave team lifecycle
- subscriptions/notifications
- automatic current/upcoming cycle shortcut pages backed by persisted cycles
- richer team descriptions
