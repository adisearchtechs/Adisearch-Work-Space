# Phase 23 — Persistent Inbox & Notifications Foundation

## Goal
Replace the configured workspace Inbox's deterministic notification data with recipient-owned persisted notifications and establish a real issue event source.

## Scope
- Persist notifications in `public.notifications`.
- Recipient-only reads, read/unread changes, and deletion through RLS plus API scoping.
- Authenticated clients cannot insert arbitrary notifications.
- Authenticated clients can update only the `read_at` column.
- Generate assignment and status notifications from an `issues` database trigger.
- Do not notify a user about their own issue mutation.
- Persist issue assignee changes and hydrate real assignee profiles into configured issue state.
- Use the existing workspace member directory for configured assignee selection.
- Replace configured Inbox with persisted all/unread views, mark read/unread, mark all read, delete one, delete read, and delete all.
- Use persisted unread counts in configured sidebar navigation.
- Preserve the deterministic Inbox and mock assignee directory only for unconfigured demo mode.

## Security boundary
- `notifications` has direct organization, recipient+organization, and issue+organization referential integrity.
- `SELECT`, `UPDATE`, and `DELETE` policies require `recipient_id = auth.uid()` and active organization membership.
- There is no client `INSERT` grant.
- A hardening migration revokes table-wide update and grants only `UPDATE(read_at)`.
- Notification generation is database-side through `private.enqueue_issue_notifications()`.
- Notification and issue mutation APIs retain same-origin protection.
- Non-null issue assignees are validated as members of the issue's organization.
- Every Phase 23 notification foreign key has a covering index; the direct organization FK is covered by `notifications_organization_idx`.

## Database migrations
- `20260902065001_add_persistent_notifications`
- `20260902065223_restrict_notification_update_columns`
- `20260902070548_cover_notifications_organization_foreign_key`

## Database verification
- Supabase security advisor: only the pre-existing leaked-password-protection warning.
- Supabase performance advisor: no Phase 23 unindexed-foreign-key warning; fresh notification indexes appear only as ordinary unused-index INFO.

## Deferred
- realtime subscriptions / push delivery
- email notification delivery
- notification preferences
- mentions and comment notifications
- project / initiative / cycle notifications
- snooze / reminder scheduling
- Reviews persistence
- digest generation

## Release queue
Phase 23 is stacked on Phase 22 while the Vercel deployment freeze is active. GitHub CI and the production application build are required. Do not merge or deliberately deploy this phase until Phases 14–22 have been released and production-verified in order.
