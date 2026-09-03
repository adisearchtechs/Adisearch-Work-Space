-- R5A: authoritative integration connection metadata registry.
-- Provider access/refresh tokens and secrets must never be stored in this public table.

begin;

create table public.integration_connections (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   owner_user_id uuid,
   provider text not null check (
      char_length(provider) between 2 and 64
      and provider ~ '^[a-z0-9][a-z0-9-]*$'
   ),
   connection_scope text not null check (connection_scope in ('organization', 'user')),
   status text not null default 'pending' check (status in ('pending', 'connected', 'degraded', 'revoked')),
   external_account_id text check (external_account_id is null or char_length(external_account_id) <= 255),
   external_account_label text check (external_account_label is null or char_length(external_account_label) <= 255),
   scopes text[] not null default '{}'::text[] check (
      cardinality(scopes) <= 50 and array_position(scopes, null) is null
   ),
   connected_at timestamptz,
   last_verified_at timestamptz,
   disconnected_at timestamptz,
   last_error_code text check (last_error_code is null or char_length(last_error_code) <= 120),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id),
   foreign key (owner_user_id, organization_id)
      references public.organization_members (user_id, organization_id) on delete cascade,
   check (
      (connection_scope = 'organization' and owner_user_id is null)
      or (connection_scope = 'user' and owner_user_id is not null)
   ),
   check (
      (status = 'connected' and connected_at is not null and disconnected_at is null)
      or (status <> 'connected')
   )
);

create unique index integration_connections_org_provider_unique
   on public.integration_connections (organization_id, provider)
   where connection_scope = 'organization';

create unique index integration_connections_user_provider_unique
   on public.integration_connections (organization_id, owner_user_id, provider)
   where connection_scope = 'user';

create index integration_connections_org_status_idx
   on public.integration_connections (organization_id, status, provider);

create index integration_connections_owner_idx
   on public.integration_connections (owner_user_id, organization_id)
   where owner_user_id is not null;

alter table public.integration_connections enable row level security;

create policy integration_connections_select_visible
on public.integration_connections
for select
to authenticated
using (
   private.is_org_member(organization_id)
   and (
      connection_scope = 'organization'
      or owner_user_id = (select auth.uid())
   )
);

revoke all on table public.integration_connections from public, anon, authenticated;
grant select on table public.integration_connections to authenticated;

comment on table public.integration_connections is
   'R5 integration connection metadata only. OAuth access/refresh tokens and provider secrets must never be stored in this public table.';

commit;
