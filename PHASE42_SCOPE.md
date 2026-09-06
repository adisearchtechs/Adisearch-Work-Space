# Phase 42 — Control Truthfulness & Project Runtime Hardening

## Goal

Remove remaining visible controls and configured-project surfaces that can mislead a signed-in workspace user by showing deterministic demo data, dead interactions, or malformed mutation paths.

Phase 42 is a hardening milestone. It does not add a new persistence domain or database table.

## Included

- configured Project Activity uses persisted `project_updates` and the existing authenticated project attachment surface
- configured project side panels use persisted project data, real issue membership/counts, and persisted project milestones
- configured project Activity must not call `getProjectDetail()` or otherwise hydrate deterministic mock project detail data
- project resource edit/delete requests build the item path before the organization query string
- configured Settings → Teams navigation uses the hydrated tenant team store instead of `mock-data/teams`
- Help exposes only working destinations; inert help search and keyboard-shortcut controls are removed
- unreleased Slack authorization remains explicitly unavailable and routes users to the authoritative Connected accounts surface
- demo mode may retain deterministic mock content for the local showcase

## Explicitly out of scope

- new database schema or migration
- new project activity/audit event model
- Slack OAuth or messaging
- new attachment storage behavior
- Agent behavior changes
- new team permissions
- new project fields
- new analytics or inferred project health

## Truthfulness rules

1. Configured workspaces must never fall back to deterministic project detail content.
2. Loading persistent milestone data must render a loading state, not a false empty state.
3. A visible mutation control must target a valid tenant-scoped API path.
4. A visible Help/Settings control must navigate or perform a released action.
5. Demo-only behavior must remain isolated to unconfigured workspaces.

## Release gate

- repository checks pass on the exact Phase 42 head
- production application build passes on the exact Phase 42 head
- Browser E2E and Authenticated E2E pass when triggered by the PR
- no unresolved review threads
- no database migration is required
- do not deliberately trigger an extra Vercel deployment as part of this hardening pass
