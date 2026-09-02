# Phase 21 — Persistent Team Members Runtime

## Objective

Replace the configured Team Members page's deterministic mock membership with the already-secured persistent team membership model delivered in Phase 16.

## In scope

- Reuse `teams`, `team_members`, `organization_members`, and `profiles` without a new migration.
- Resolve configured team routes through the shared Phase 19 team store.
- Load real team members and workspace roles from `GET /api/teams/[teamId]`.
- Show real profile display names and avatars.
- Keep workspace role visible; team membership does not invent a second role system.
- Owners/admins can add existing workspace members through the existing team-membership POST route.
- Owners/admins can remove assigned team members through the existing membership DELETE route.
- Same-origin mutation protection and tenant scoping remain enforced by the existing API.
- Refresh the shared runtime team store after membership mutations so joined-team navigation and member counts update immediately.
- Restore Members to configured team header tabs and sidebar navigation.
- Preserve deterministic mock membership only in unconfigured demo mode.

## Database

No new Phase 21 database migration is required.

Phase 21 reuses the existing tables and RLS policies introduced in the SaaS foundation and exercised by Phase 16:

- `public.teams`
- `public.team_members`
- `public.organization_members`
- `public.profiles`

The existing membership mutation APIs require workspace owner/admin authorization and validate that any added user already belongs to the workspace.

## Permission boundary

- Workspace owners/admins: read and manage team membership.
- Workspace members: read team membership only.
- Workspace guests: read team membership only.
- Adding a person to a team never creates a workspace account or invitation.
- Removing a person from a team does not remove them from the workspace.
- Workspace role is authoritative; Phase 21 does not introduce team-specific admin roles.

## Safety and tenant boundaries

- Team references resolve to the tenant's persisted team before runtime use.
- Membership writes are scoped by team UUID and organization ID.
- Candidate additions must already exist in `organization_members` for the same organization.
- No mock member data is mixed into configured workspaces.
- Runtime team state is refreshed after successful writes so navigation cannot remain stale.

## Deferred

- Team-specific roles or permissions.
- Workspace invitations from the Team Members screen.
- Bulk membership operations.
- Group/directory synchronization.
- Member activity analytics.

## Release queue

- Base: `phase20-persistent-team-documents`
- GitHub CI is required.
- Do not merge until Phases 14–20 have been released and production-verified in order.
- Do not deliberately deploy Phase 21 to Vercel while the deployment quota freeze is active.
