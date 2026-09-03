-- R9 production release hardening: add covering indexes for every foreign key
-- currently reported by the Supabase performance advisor as unindexed.
-- These indexes reduce lock amplification and table scans during parent-row
-- updates/deletes without changing application-visible behavior.

create index if not exists agent_conversations_created_by_organization_idx
   on public.agent_conversations (created_by, organization_id);

create index if not exists agent_messages_conversation_organization_idx
   on public.agent_messages (conversation_id, organization_id);

create index if not exists integration_authorization_states_organization_idx
   on public.integration_authorization_states (organization_id);

create index if not exists issue_comments_author_organization_idx
   on public.issue_comments (author_id, organization_id);

create index if not exists issue_relations_source_organization_idx
   on public.issue_relations (source_issue_id, organization_id);

create index if not exists issue_relations_target_organization_idx
   on public.issue_relations (target_issue_id, organization_id);

create index if not exists organization_invitation_teams_invitation_org_idx
   on public.organization_invitation_teams (invitation_id, organization_id);

create index if not exists organization_invitation_teams_team_org_idx
   on public.organization_invitation_teams (team_id, organization_id);
