# Phase 25 — Persistent Reviews Foundation

## Goal
Replace configured-workspace deterministic review data with truthful, tenant-scoped in-app review requests while preserving the rich prototype review showcase only in demo mode.

## Scope
- Persist review requests, optional linked issues and optional external GitHub PR references.
- Provide real `For you` reviews from reviewer assignments and real `Created` reviews from the authenticated creator.
- Persist reviewer assignments and reviewer-owned verdicts (`approved` / `changes_requested`).
- Persist review discussion comments.
- Let review creators manage review status (`open` / `approved` / `closed`) and reviewer assignments.
- Reuse the existing workspace member directory for reviewer selection.
- Keep configured review metadata honest: title, summary, test/release evidence, branches, check counts and external URL are explicit stored fields.
- Seed the real Phase 24 PR #28 as an initial review record so the feature is immediately useful.
- Preserve mock review lists, commits, files, guides and diffs only for the unconfigured demo workspace.

## Truthfulness boundary
Configured workspaces do **not** render deterministic mock commits, file diffs, AI review notes or deployment evidence as if they came from GitHub. Guide and Diff routes explicitly state that Git-backed synchronization is not connected yet and link to the stored external PR when available.

## Security boundary
- `reviews`, `review_reviewers` and `review_comments` are organization-scoped with RLS enabled.
- Review creators must be current organization members; linked issues and reviewers use composite tenant foreign keys.
- Members may read review records; guests remain read-only for review/content creation.
- Only the review creator may edit/delete a review or assign/remove reviewers.
- Reviewers may update only their own verdict and response timestamp.
- Comment writes are limited to non-guest organization writers and comment authors can modify only their own comments.
- Mutation routes keep same-origin checks in addition to RLS.
- Anonymous table access is revoked and authenticated Data API grants are explicit and column-bounded for updates.

## Database migration
- `20260902082302_add_persistent_reviews`

## Verification
- Generated Supabase types include all three review tables and tenant relationships.
- Supabase security advisor reports only the pre-existing leaked-password-protection warning.
- Supabase performance advisor reports no missing Phase 25 foreign-key index; new review indexes appear only as ordinary unused-index INFO while fresh.

## Deferred
- GitHub OAuth/app installation management
- automatic PR/commit/check/file synchronization
- real code diff rendering
- generated review guides
- webhook/realtime synchronization
- review notifications and reminders
- inline file comments
- merge actions from Adisearch Workspace

## Release queue
Phase 25 is stacked on the green Phase 24 head while the Vercel deployment freeze remains active. GitHub CI and the production application build are required. Do not merge or deliberately deploy Phase 25 until the queued phases before it have been released and production-verified in order.
