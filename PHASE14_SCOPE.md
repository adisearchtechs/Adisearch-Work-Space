# Phase 14 — Persistent Initiative Labels

## Goal
Replace mock-only initiative labels with tenant-scoped persistent label assignments while reusing the existing workspace label catalog.

## In scope
- `initiative_labels` many-to-many persistence
- composite initiative/label tenancy foreign keys and covering indexes
- authenticated list/assign/remove APIs
- same-origin mutation protection
- guest read-only behavior
- initiative Overview label chips and assignment controls
- generated database type coverage and regression/security tests

## Out of scope
- creating/editing/deleting workspace labels
- initiative-specific label taxonomy
- label ordering
- bulk assignment
- file uploads or other initiative properties

## Merge gates
- repository checks and production build pass on the exact PR head
- Vercel exact-head preview is READY
- no unresolved GitHub/Vercel review threads
- Supabase security/performance advisors show no Phase 14 blocker
- production is verified after normal merge
