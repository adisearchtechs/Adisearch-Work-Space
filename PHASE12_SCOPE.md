# Phase 12 — Persistent Initiative Updates

This bounded phase adds persistent initiative activity for configured workspaces.

## Scope

- tenant-scoped append-only initiative updates and comments
- health required for update posts and omitted for comments
- authenticated GET/POST initiative update API
- configured-workspace Activity composer and monthly timeline
- guests remain read-only
- deterministic demo initiative behavior remains unchanged for unconfigured mode

## Out of scope

- initiative resources
- initiative labels
- editing or deleting historical activity entries

## Database

- `20260901221047_add_initiative_updates.sql`
