# Phase 28 — Persistent Issue Details & Comments

## Goal
Make configured issue detail pages truthful and durable: render the issue description that is actually stored on the issue, persist discussion comments, and stop mixing production tenant data with inherited mock activity metadata.

## Scope
- Render configured issue descriptions from the persisted `issues.description` field.
- Allow non-guest members to edit configured issue descriptions through the existing authenticated issue persistence adapter.
- Add tenant-scoped, append-only issue comments in Supabase.
- Add authenticated comment list/create API routes with bounded input and same-origin mutation protection.
- Hydrate configured comments with real profile display names and avatars.
- Guests may read comments but cannot post them.
- Keep demo descriptions, activity events and local comments unchanged when Supabase is not configured.
- Remove configured-page leakage of mock sub-issues, milestones, blocked/related metadata, PR diffs, reaction controls and the duplicate inert activity subscribe control.

## Security boundary
- `issue_comments` is RLS protected and explicitly granted only `SELECT` and `INSERT` to `authenticated`.
- Comment reads require organization membership.
- Comment inserts require `private.can_write_org(organization_id)` and force `author_id = auth.uid()`.
- Composite tenant foreign keys bind comments to issues and authors inside the same organization.
- Comment author membership deletion preserves historical comments by nulling only `author_id`.
- The API derives the author from verified auth claims; clients cannot forge authors.
- Comment bodies are trimmed and bounded to 10,000 characters.
- POST requests require a valid same-origin mutation request.

## Database migration
- `20260902202259_add_issue_comments`

## Verification
- Production Supabase was inspected read-only before implementation: Phase 26 is present while Phase 27 and Phase 28 tables are not yet applied, so this migration is intentionally not applied out of order.
- Repository tests cover RLS/grants, composite tenant foreign keys, authenticated API behavior, configured/demo rendering boundaries, description persistence and the stacked database type chain.
- GitHub CI and the production application build are required before Phase 28 is considered green.

## Deferred
- immutable issue audit-event generation for status/priority/assignee/etc. changes
- comment editing and deletion
- comment reactions and mentions
- threaded replies
- persistent sub-issue relationships
- persistent blocked/related issue relationships
- persistent issue milestone links
- Git provider / pull-request synchronization on issue details
- rich-text collaborative description editing

## Release queue
Phase 28 is stacked on the green Phase 27 head. Do not merge to `master` until queued phases before it have been released and production-verified in order. Do not apply the Phase 28 migration before Phase 27, and do not deliberately trigger a Vercel production deployment while the release freeze is active.
