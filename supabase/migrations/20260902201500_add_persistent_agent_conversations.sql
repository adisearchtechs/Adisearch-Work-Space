create table public.agent_conversations (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations(id) on delete cascade,
   created_by uuid not null,
   title text not null check (char_length(btrim(title)) between 1 and 120),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id),
   constraint agent_conversations_creator_organization_fkey foreign key (created_by, organization_id)
      references public.organization_members(user_id, organization_id) on delete cascade
);

create table public.agent_messages (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations(id) on delete cascade,
   conversation_id uuid not null,
   sequence bigint generated always as identity,
   role text not null check (role in ('user', 'assistant')),
   content text not null check (char_length(content) between 1 and 50000),
   created_at timestamptz not null default now(),
   constraint agent_messages_conversation_organization_fkey foreign key (conversation_id, organization_id)
      references public.agent_conversations(id, organization_id) on delete cascade
);

create index agent_conversations_owner_recent_idx
   on public.agent_conversations (organization_id, created_by, updated_at desc);
create index agent_conversations_created_by_idx on public.agent_conversations (created_by);
create index agent_messages_conversation_sequence_idx
   on public.agent_messages (conversation_id, sequence);
create index agent_messages_organization_idx on public.agent_messages (organization_id);

alter table public.agent_conversations enable row level security;
alter table public.agent_messages enable row level security;

create policy agent_conversations_select_owner on public.agent_conversations
for select to authenticated
using (
   private.is_org_member(organization_id)
   and created_by = (select auth.uid())
);

create policy agent_conversations_insert_owner on public.agent_conversations
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy agent_conversations_update_owner on public.agent_conversations
for update to authenticated
using (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
)
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy agent_conversations_delete_owner on public.agent_conversations
for delete to authenticated
using (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy agent_messages_select_owner on public.agent_messages
for select to authenticated
using (
   exists (
      select 1
      from public.agent_conversations conversation
      where conversation.id = agent_messages.conversation_id
        and conversation.organization_id = agent_messages.organization_id
        and conversation.created_by = (select auth.uid())
   )
);

create policy agent_messages_insert_owner on public.agent_messages
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and exists (
      select 1
      from public.agent_conversations conversation
      where conversation.id = agent_messages.conversation_id
        and conversation.organization_id = agent_messages.organization_id
        and conversation.created_by = (select auth.uid())
   )
);

revoke all on table public.agent_conversations from anon, authenticated;
revoke all on table public.agent_messages from anon, authenticated;
grant select, insert, update, delete on table public.agent_conversations to authenticated;
grant select, insert on table public.agent_messages to authenticated;
