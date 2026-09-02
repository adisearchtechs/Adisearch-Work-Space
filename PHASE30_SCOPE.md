# Phase 30 — Persistent Issue Audit Activity

## Goal
Make configured issue Activity a durable record of what changed, not only a comment stream. Persist immutable, actor-attributed audit events for issue lifecycle changes and relationship changes, then merge those events chronologically with persistent comments.

## Scope
- Add append-only `issue_audit_events` records for issue creation and supported field changes.
- Capture title, description, status, priority, assignee, project, cycle and due-date changes from database triggers so audit writes stay atomic with issue mutations.
- Capture issue relationship additions and removals for parent/sub-issue, blocking and related links.
- Preserve actor display-name snapshots while allowing actor membership to be removed later.
- Backfill one truthful `created` event for existing issues; do not fabricate historical changes that happened before this migration.
- Add authenticated tenant-scoped read API for issue audit activity.
- Merge configured audit events and comments by persisted timestamp in the issue Activity feed.
- Keep the existing rich mock activity timeline isolated to demo mode.

## Security boundary
- `issue_audit_events` has RLS enabled and grants authenticated users `SELECT` only.
- Reads require `private.is_org_member(organization_id)`.
- Clients receive no INSERT, UPDATE or DELETE privilege on audit events.
- Audit writes are produced only by private trigger functions that run with a locked search path and have no executable grant for `public`, `anon` or `authenticated`.
- Trigger actor identity comes from `auth.uid()` for authenticated mutations; issue creation may fall back to the persisted creator, and non-user/system mutations remain labeled as System.
- Composite foreign keys bind events and actors to the same organization.
- Description audit details store only length changes, not historical description contents.

## Database migration
- `20260902230608_add_issue_audit_activity`

## Verification
- Supabase's current RLS guidance was rechecked before implementation: exposed tables require RLS plus least-privilege grants; this phase follows that model with read-only Data API access to the audit table.
- Production Supabase was inspected read-only before implementation and remains applied only through Phase 26. Phase 27, Phase 28 and Phase 29 migrations are still queued, so the Phase 30 migration is intentionally not applied out of order.
- Repository tests cover immutable grants, tenant foreign keys, locked private trigger functions, actor attribution, field/relation event capture, API membership checks, configured/demo rendering boundaries, chronological comment/event merging and the stacked database type chain.
- GitHub CI and the production application build are required before Phase 30 is considered green.

## Deferred
- persistent issue milestone links and milestone-change audit events
- label editing and label-change audit events
- comment edit/delete, reactions, mentions and threaded replies
- Git provider / pull-request synchronization and PR activity events
- rich-text collaborative description editing
- cross-project dependency visualization and graph views
- retention/export policy for long-lived audit history

## Release queue
Phase 30 is stacked on Phase 29. Do not merge to `master` until queued phases before it have been released and production-verified in order. Do not apply the Phase 30 migration before Phase 27, Phase 28 and Phase 29, and do not deliberately trigger a Vercel production deployment while the release freeze is active.
