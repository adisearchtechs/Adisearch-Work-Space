# Phase 20 — Persistent Team Documents & Pinned Resources

## Objective

Replace the configured team Documents surface's deterministic mock data with tenant-scoped persistent documents and make pinned documents available from Team Overview.

## In scope

- Add `public.team_documents` with organization/team composite tenancy.
- Persist bounded document titles and bodies.
- Persist pin/unpin state.
- Track creator and created/updated timestamps.
- Member-readable, non-guest writable RLS.
- Same-origin protected create/update/delete APIs.
- Team references may resolve from a UUID or stable team key.
- Configured Documents UI supports list, create, view, edit, pin/unpin and delete.
- Guests can read documents but cannot mutate them.
- Configured Team Overview renders real pinned documents.
- Restore Documents in configured team header tabs and sidebar navigation.
- Keep deterministic mock documents only in unconfigured demo mode.

## Database

Applied Supabase migration:

`20260902040516_add_team_documents`

The table has:

- `id uuid` primary key
- `organization_id uuid`
- `team_id uuid`
- `created_by uuid` nullable profile reference
- `title text` bounded to 160 characters
- `body text` bounded to 50,000 characters
- `pinned boolean`
- `created_at` / `updated_at`
- composite `(team_id, organization_id)` foreign key to `teams`
- FK-covering and team-list indexes
- automatic `updated_at` trigger
- explicit authenticated grants and anon revocation
- RLS using `private.is_org_member` and `private.can_write_org`

After migration, the Supabase security advisor reports only the pre-existing leaked-password-protection warning. The performance advisor reports unused-index INFO only; no unindexed foreign-key warning is present.

## Safety boundaries

- No file uploads, object storage, attachments or arbitrary binary content.
- No rich-text execution or HTML rendering; body content is stored/displayed as plain text.
- No cross-team document movement.
- No guest writes.
- Configured routes fail closed when the tenant team cannot be resolved.
- No deterministic mock documents are mixed into configured workspaces.

## Deferred

- File attachments and Supabase Storage.
- Rich-text/Markdown rendering.
- Folders and nested document trees.
- Document comments/history/versioning.
- Fine-grained per-document permissions.
- Full-text search.

## Release queue

- Base: `phase19-persistent-team-runtime`
- GitHub CI is required.
- Do not merge until Phases 14–19 have been released and production-verified in order.
- Do not deliberately deploy Phase 20 to Vercel while the deployment quota freeze is active.
