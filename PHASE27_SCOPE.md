# Phase 27 — Persistent Agent Conversations Foundation

## Goal
Move configured Agent conversations out of volatile browser memory without pretending that the workspace already has a production AI execution layer.

## Scope
- Persist Agent conversations and messages in Supabase for configured workspaces.
- Keep each conversation private to its creator inside the current organization.
- Hydrate conversation history when the Agent surface opens.
- Persist new user messages and the currently deterministic assistant reply while preserving the existing streamed UI.
- Keep the inherited client-only Agent behavior available when Supabase is not configured.
- Use client-generated UUID conversation IDs so optimistic first-message rendering and persistence share one identity.
- Limit loaded history to the 50 most recently active conversations and bound user prompts to 8,000 characters.

## Security boundary
- Server authorization requires an authenticated organization member.
- Guests may read their own historical conversations but cannot create new Agent messages.
- Conversation RLS limits reads and mutations to the authenticated creator.
- Message RLS allows access only through a conversation owned by the authenticated creator.
- Same-origin validation protects Agent POST mutations in addition to RLS.
- Anonymous table access is revoked and authenticated grants are explicit.
- The server derives titles and placeholder assistant replies; clients cannot persist arbitrary assistant roles through the Agent API.

## Database migration
- `20260902201500_add_persistent_agent_conversations`

## Verification
- Repository tests cover creator-private RLS, tenant-safe foreign keys, mutation-origin checks, authenticated membership checks, configured hydration/persistence, demo fallback behavior and the stacked database type chain.
- GitHub CI and the production application build are required before Phase 27 is considered green.

## Deferred
- OpenAI or other model-provider execution
- streaming model responses from the server
- tool calling / workspace mutations by the Agent
- retrieval over issues, projects, files or documents
- long-term semantic memory / embeddings
- provider connection management
- conversation rename, archive, delete and export controls
- usage metering, quotas and model-cost controls
- safety/evaluation harnesses for autonomous actions

## Release queue
Phase 27 is stacked on the green Phase 26 head. Do not merge to `master` until queued phases before it have been released and production-verified in order. Do not deliberately trigger a Vercel deployment while the release freeze is active.
