# Phase 29 — Persistent Issue Relationships

## Goal
Turn the configured issue graph into durable tenant data: support parent/sub-issue hierarchy, blocking dependencies, and related-issue links without reintroducing inherited mock metadata.

## Scope
- Add one normalized `issue_relations` table for parent, blocking and related relationships.
- Support configured issue relationship reads, creates and removals through authenticated API routes.
- Present parent, sub-issue, blocked-by, blocks and related groups on configured issue details.
- Preserve the existing rich mock sub-issue behavior only in demo mode.
- Allow owner/admin/member roles to create and remove links; guests remain read-only.
- Reuse the hydrated tenant issue store for identifiers, titles and status display instead of duplicating issue DTOs.

## Data integrity
- Both relation endpoints are composite foreign keys to `(issues.id, organization_id)` so cross-tenant links cannot exist.
- Self-relations are rejected.
- Related links are canonicalized so A↔B cannot be duplicated in reverse order.
- A child can have only one parent.
- A database trigger rejects parent links that would create a hierarchy cycle.
- Deleting either issue cascades its relationships.
- Relation creator membership may be removed without destroying historical relationship data.

## Security boundary
- `issue_relations` has RLS enabled with explicit authenticated grants.
- Reads require organization membership.
- Inserts and deletes require `private.can_write_org(organization_id)`.
- Inserts force `created_by = auth.uid()` under RLS and the API also derives the creator from verified claims.
- POST and DELETE require same-origin mutation validation.
- API relation targets are UUID-validated and verified inside the authenticated organization before insertion.
- No UPDATE privilege is granted; relationship changes are modeled as remove + create.

## Database migration
- `20260902204100_add_issue_relations`

## Verification
- Phase 29 is intentionally stacked on the green Phase 28 head and its migration remains unapplied while production is behind the queued Phase 27 and Phase 28 migrations.
- Repository tests cover normalized relation semantics, tenant foreign keys, canonical related links, one-parent enforcement, cycle prevention, RLS/grants, API authorization, configured/demo rendering boundaries and the stacked database type chain.
- GitHub CI and the production application build are required before Phase 29 is considered green.

## Deferred
- persistent issue milestone links
- immutable issue audit-event generation for status, priority, assignee, project, cycle and relationship changes
- comment edit/delete, reactions, mentions and threaded replies
- Git provider / pull-request synchronization on issue details
- rich-text collaborative description editing
- cross-project dependency visualization and graph views

## Release queue
Phase 29 is stacked on Phase 28. Do not merge to `master` until queued phases before it have been released and production-verified in order. Do not apply the Phase 29 migration before Phase 27 and Phase 28, and do not deliberately trigger a Vercel production deployment while the release freeze is active.
