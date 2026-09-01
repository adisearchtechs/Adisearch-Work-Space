# Phase 16 — Teams & Team Membership

## Goal

Replace mock-only team administration with the existing tenant-scoped `teams` and `team_members` foundation, without widening this phase into workflow, cycle, or team-overview persistence.

## Scope

- List persisted teams and usage counts in configured workspaces.
- Create teams with name, key, issue prefix, and color.
- Automatically add the creating owner/admin as the first team member.
- Persist team name, key, issue-prefix, and color edits.
- List team members and available organization members.
- Allow workspace owners/admins to add and remove team members.
- Keep ordinary members and guests read-only for team administration.
- Keep deterministic demo teams only in unconfigured mode.
- Preserve database uniqueness/format constraints and return conflict responses for duplicate keys/prefixes.

## Existing database foundation

No new Phase 16 database migration is required.

`public.teams` already has:
- organization scoping and RLS,
- member SELECT policy,
- owner/admin INSERT, UPDATE, and DELETE policies,
- authenticated CRUD grants and anon denial,
- 2–80 character team-name validation,
- uppercase 2–10 character key and issue-prefix validation,
- six-digit hex color validation,
- organization-unique team key and issue prefix.

`public.team_members` already has:
- tenant-safe composite foreign keys to teams and organization members,
- member SELECT policy,
- owner/admin INSERT and DELETE policies,
- authenticated SELECT/INSERT/DELETE grants and anon denial.

## Safety boundary

Hard team deletion is intentionally not exposed in Phase 16. Current foreign-key behavior is inconsistent for an administrative delete:
- issues: `ON DELETE RESTRICT`,
- projects: `ON DELETE CASCADE`,
- cycles: `ON DELETE CASCADE`,
- team memberships: `ON DELETE CASCADE`.

A retirement/archive model should be designed before destructive lifecycle operations are enabled.

The existing team Overview/header remains mock-backed, so configured team administration does not link newly created database team IDs into that route in this phase.

## Release train

Phase 16 is stacked on the exact Phase 15 head while the Vercel deployment quota is exhausted.
- GitHub CI is required.
- Do not merge until Phases 14 and 15 have been released sequentially and production-verified.
- Do not deliberately trigger a Vercel deployment for Phase 16 while the quota is exhausted.

## Deferred

- team retirement/archive,
- hard team deletion,
- persistent team Overview/header/runtime navigation,
- team-specific workflow settings,
- team-specific labels,
- cycle configuration,
- Slack/agent settings,
- workspace invitation/member lifecycle (Phase 17).
