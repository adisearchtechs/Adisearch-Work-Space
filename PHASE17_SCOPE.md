# Phase 17 — Workspace Members & Permissions

## Goal

Replace the absence of workspace-member administration with tenant-safe visibility and role management using the existing `organization_members` and `profiles` foundation.

## Scope

- Add a dedicated Workspace → Members settings surface.
- List persisted organization members with profile, role, join date, team count, and historical issue-creator count.
- Allow owners/admins to manage existing memberships.
- Allow the owner to promote/demote admins.
- Allow admins to manage members/guests but not other admins.
- Protect owner membership and ownership transfer.
- Prevent self-role mutation/removal from this administrative endpoint.
- Remove eligible non-owner members with explicit confirmation.
- Fail member removal closed when historical issue creator references would violate database history.
- Keep non-admin users read-only.

## Existing database foundation

No new Phase 17 migration is required.

`organization_members` already has:
- tenant RLS,
- member SELECT,
- owner/admin INSERT/UPDATE,
- owner/admin DELETE with owner-row protection,
- explicit authenticated grants and anonymous denial.

`profiles` already permits shared-organization profile reads while restricting profile updates to the profile owner.

Phase 17 adds stricter application-level authorization than the raw update policy:
- owner rows cannot be modified,
- ownership cannot be assigned through the role endpoint,
- users cannot change/remove themselves through admin controls,
- admins cannot alter/remove other admins or promote a member to admin.

## Removal safety

Existing foreign keys behave as follows when organization membership is removed:
- issue assignee → `SET NULL`,
- project lead → `SET NULL`,
- team memberships → `CASCADE`,
- historical issue creator → `RESTRICT`.

The API preflights creator references and returns `409` rather than relying on a destructive or opaque database error.

## Invitations

Email invitation delivery is deferred. The current transactional email sender/domain is not verified, and implementing Supabase admin invitations would also require a protected server-side administrative credential path that is intentionally not introduced casually in this phase.

Existing-member role/permission administration is independent of invitation email delivery and can be queued safely now.

## Release train

Phase 17 is stacked on the exact Phase 16 head while Vercel's daily deployment quota is exhausted.
- GitHub CI is required.
- Do not merge until Phases 14–16 have been released sequentially and production-verified.
- Do not deliberately deploy Phase 17 to Vercel while quota is exhausted.

## Deferred

- email invitations,
- ownership transfer,
- self-service leave workspace,
- creator reassignment before member removal,
- SCIM/directory sync,
- enterprise permission groups.
