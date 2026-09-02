# Phase 26 — Persistent Files & Attachments Foundation

## Goal
Give configured issues, projects and initiatives one secure shared file layer instead of inert paperclip controls or link-only resources.

## Scope
- Private Supabase Storage bucket `workspace-attachments`.
- Tenant-scoped attachment metadata in `public.attachments`.
- Exactly one parent per attachment: issue, project or initiative.
- Upload, list, signed download and delete APIs.
- Reusable configured attachment UI across issues, projects and initiatives.
- Guests are read-only; non-guest organization members may upload and delete.
- Maximum file size: 25 MB.
- Allow common images, PDF, text/CSV/JSON, ZIP and Office document formats.
- Preserve demo-only inert attachment affordances only in unconfigured demo mode.

## Security boundary
- Bucket is private; no public download URLs.
- Downloads use short-lived signed URLs after tenant membership and metadata lookup.
- Storage paths begin with organization ID then uploader user ID.
- Storage RLS requires organization membership for reads and non-guest membership for writes/deletes.
- Metadata table uses RLS plus composite tenant FKs to issue/project/initiative parents.
- Anonymous table access is revoked and authenticated grants are explicit.
- Uploads are immutable (`upsert: false`); no Storage UPDATE policy is granted.
- Same-origin checks protect upload/delete mutation routes in addition to RLS.
- MIME types and size are allowlisted server-side and again constrained at the bucket.

## Database migration
- `20260902194631_add_workspace_attachments`

## Verification
- Supabase security advisor reports only the pre-existing leaked-password-protection warning.
- Performance advisor reports no missing Phase 26 foreign-key index warning; fresh attachment indexes appear only as expected unused-index INFO.
- Repository tests cover private bucket policies, tenant parent constraints, API mutation checks and configured/demo rendering boundaries.

## Deferred
- malware/virus scanning and content inspection
- OCR / AI indexing or summarization
- attachment versioning
- review-comment and team-document attachments
- direct drag/drop and multi-file batching
- external object-storage providers

## Release queue
Phase 26 is stacked on the green Phase 25 head. GitHub CI and the production application build are required. Do not merge to `master` until the queued phases before it have been released and production-verified in order. Do not deliberately trigger a Vercel deployment while the release freeze is active.
