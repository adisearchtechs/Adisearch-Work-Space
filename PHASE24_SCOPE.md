# Phase 24 — Persistent My Issues & Issue Subscriptions

## Goal
Make configured `My Issues` trustworthy by replacing prototype ownership/subscription heuristics with authenticated persisted data.

## Scope
- Persist personal issue subscriptions in `public.issue_subscriptions`.
- `Assigned` uses the authenticated workspace user's real assignee ID.
- `Created` uses persisted `issues.creator_id`.
- `Subscribed` uses the current user's persisted subscription rows only.
- `Activity` is a bounded recent-work view: issues assigned to, created by, or subscribed by the current user, ordered by persisted `updated_at` descending.
- Hydrate `creatorId` and `updatedAt` into configured issue runtime state.
- Add Subscribe / Unsubscribe to configured issue details.
- Preserve deterministic My Issues ownership/subscription heuristics only for unconfigured demo mode.

## Security boundary
- Subscriptions are personal state, not workspace-content edits, so any authenticated organization member including a guest may subscribe to an issue.
- RLS restricts SELECT / INSERT / DELETE to `user_id = auth.uid()` plus active organization membership.
- Subscription rows have composite tenant foreign keys to both the issue and organization membership.
- Authenticated clients receive only SELECT / INSERT / DELETE; no UPDATE grant exists.
- Subscription mutations retain same-origin protection and server-side organization + issue checks.
- Configured `Subscribed` and `Activity` fail closed while subscription state has not loaded; they never fall back to demo heuristics.

## Database migration
- `20260902075650_add_issue_subscriptions`

## Database verification
- Generated Supabase types include `issue_subscriptions` and both composite relationships.
- Security advisor reports only the pre-existing leaked-password-protection warning.
- Performance advisor reports no Phase 24 unindexed foreign-key warning; the fresh subscription indexes appear only as unused-index INFO.

## Deferred
- full issue audit/event history
- comment/mention-driven activity
- automatic subscription on assignment/comment/mention
- notification preferences
- Reviews persistence

## Release queue
Phase 24 is stacked on Phase 23 while the Vercel deployment freeze is active. GitHub CI and the production application build are required. Do not merge or deliberately deploy this phase until Phases 14–23 have been released and production-verified in order.
