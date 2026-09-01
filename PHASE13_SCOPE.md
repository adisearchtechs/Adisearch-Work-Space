# Phase 13 — Persistent Initiative Resources

## Goal
Persist initiative-level reference links so configured workspaces can keep briefs, plans, dashboards, documents and other HTTP(S) resources attached to an initiative.

## In scope
- `initiative_resources` tenant-scoped persistence
- explicit authenticated grants and row-level security
- ordered initiative resource list
- create, update and delete resource APIs
- HTTP/HTTPS-only URL validation
- configured initiative overview resource UI
- guest read-only behavior
- regression coverage for contracts, tenancy, origin checks, RLS and UI routing

## Out of scope
- file uploads or Supabase Storage
- initiative labels
- drag-and-drop resource reordering
- resource permissions that differ from initiative membership

## Merge gate
Merge only when the exact Phase 13 head passes CI, has a READY Vercel preview, has no unresolved review threads, and Supabase security/performance advisors show no Phase 13 blocker.
