-- R5B: one-time GitHub App authorization state. Only hashes are persisted;
-- plaintext OAuth state, PKCE verifiers, user access tokens, and provider secrets never enter this table.

begin;

create table public.integration_authorization_states (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   actor_user_id uuid not null,
   provider text not null check (provider = 'github'),
   state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
   candidate_external_id text check (
      candidate_external_id is null
      or candidate_external_id ~ '^[1-9][0-9]{0,19}$'
   ),
   created_at timestamptz not null default now(),
   expires_at timestamptz not null,
   consumed_at timestamptz,
   foreign key (actor_user_id, organization_id)
      references public.organization_members (user_id, organization_id) on delete cascade,
   check (expires_at > created_at),
   check (consumed_at is null or consumed_at >= created_at)
);

create index integration_authorization_states_actor_idx
   on public.integration_authorization_states (actor_user_id, organization_id, provider, expires_at);

alter table public.integration_authorization_states enable row level security;
revoke all on table public.integration_authorization_states from public, anon, authenticated;

create or replace function public.create_integration_authorization_state(
   p_organization_id uuid,
   p_provider text,
   p_state_hash text,
   p_expires_at timestamptz
)
returns table (
   authorization_id uuid,
   expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
   actor_id uuid := auth.uid();
   actor_role public.organization_role;
   created_id uuid;
begin
   if actor_id is null then
      raise exception 'UNAUTHORIZED';
   end if;

   if p_provider <> 'github' then
      raise exception 'UNSUPPORTED_PROVIDER';
   end if;

   if p_state_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'INVALID_STATE';
   end if;

   if p_expires_at <= now() or p_expires_at > now() + interval '20 minutes' then
      raise exception 'INVALID_EXPIRY';
   end if;

   select member.role
      into actor_role
   from public.organization_members member
   where member.organization_id = p_organization_id
     and member.user_id = actor_id;

   if actor_role is null then
      raise exception 'FORBIDDEN';
   end if;

   if actor_role not in ('owner', 'admin') then
      raise exception 'FORBIDDEN';
   end if;

   update public.integration_authorization_states prior
      set consumed_at = now()
   where prior.organization_id = p_organization_id
     and prior.actor_user_id = actor_id
     and prior.provider = p_provider
     and prior.consumed_at is null;

   insert into public.integration_authorization_states (
      organization_id,
      actor_user_id,
      provider,
      state_hash,
      expires_at
   )
   values (
      p_organization_id,
      actor_id,
      p_provider,
      p_state_hash,
      p_expires_at
   )
   returning id into created_id;

   return query select created_id, p_expires_at;
end;
$$;

create or replace function public.get_integration_authorization_state(
   p_state_hash text
)
returns table (
   authorization_id uuid,
   organization_id uuid,
   provider text,
   candidate_external_id text,
   expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
   actor_id uuid := auth.uid();
begin
   if actor_id is null then
      raise exception 'UNAUTHORIZED';
   end if;

   return query
   select state.id,
          state.organization_id,
          state.provider,
          state.candidate_external_id,
          state.expires_at
   from public.integration_authorization_states state
   join public.organization_members member
     on member.organization_id = state.organization_id
    and member.user_id = actor_id
   where state.state_hash = p_state_hash
     and state.actor_user_id = actor_id
     and state.consumed_at is null
     and state.expires_at > now()
     and member.role in ('owner', 'admin')
   limit 1;
end;
$$;

create or replace function public.record_integration_authorization_candidate(
   p_state_hash text,
   p_external_id text
)
returns table (
   authorization_id uuid,
   organization_id uuid,
   candidate_external_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
   actor_id uuid := auth.uid();
   updated_state public.integration_authorization_states%rowtype;
   actor_role public.organization_role;
begin
   if actor_id is null then
      raise exception 'UNAUTHORIZED';
   end if;

   if p_external_id !~ '^[1-9][0-9]{0,19}$' then
      raise exception 'INVALID_EXTERNAL_ID';
   end if;

   select state.*
      into updated_state
   from public.integration_authorization_states state
   where state.state_hash = p_state_hash
     and state.actor_user_id = actor_id
     and state.provider = 'github'
     and state.consumed_at is null
     and state.expires_at > now()
   for update;

   if updated_state.id is null then
      raise exception 'INVALID_INTEGRATION_STATE';
   end if;

   select member.role
      into actor_role
   from public.organization_members member
   where member.organization_id = updated_state.organization_id
     and member.user_id = actor_id;

   if actor_role not in ('owner', 'admin') then
      raise exception 'FORBIDDEN';
   end if;

   update public.integration_authorization_states state
      set candidate_external_id = p_external_id
   where state.id = updated_state.id;

   return query
   select updated_state.id, updated_state.organization_id, p_external_id;
end;
$$;

create or replace function public.complete_github_integration_authorization(
   p_state_hash text,
   p_installation_id text,
   p_account_label text,
   p_scopes text[]
)
returns table (
   connection_id uuid,
   organization_id uuid,
   status text,
   external_account_id text,
   external_account_label text,
   connected_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
   actor_id uuid := auth.uid();
   state_row public.integration_authorization_states%rowtype;
   actor_role public.organization_role;
   connection_row public.integration_connections%rowtype;
begin
   if actor_id is null then
      raise exception 'UNAUTHORIZED';
   end if;

   if p_installation_id !~ '^[1-9][0-9]{0,19}$' then
      raise exception 'INVALID_EXTERNAL_ID';
   end if;

   if p_account_label is null or char_length(btrim(p_account_label)) < 1 or char_length(p_account_label) > 255 then
      raise exception 'INVALID_ACCOUNT_LABEL';
   end if;

   if p_scopes is null or cardinality(p_scopes) > 50 or array_position(p_scopes, null) is not null then
      raise exception 'INVALID_SCOPES';
   end if;

   select state.*
      into state_row
   from public.integration_authorization_states state
   where state.state_hash = p_state_hash
     and state.actor_user_id = actor_id
     and state.provider = 'github'
     and state.consumed_at is null
     and state.expires_at > now()
   for update;

   if state_row.id is null or state_row.candidate_external_id is null then
      raise exception 'INVALID_INTEGRATION_STATE';
   end if;

   if state_row.candidate_external_id <> p_installation_id then
      raise exception 'INSTALLATION_MISMATCH';
   end if;

   select member.role
      into actor_role
   from public.organization_members member
   where member.organization_id = state_row.organization_id
     and member.user_id = actor_id;

   if actor_role not in ('owner', 'admin') then
      raise exception 'FORBIDDEN';
   end if;

   insert into public.integration_connections (
      organization_id,
      owner_user_id,
      provider,
      connection_scope,
      status,
      external_account_id,
      external_account_label,
      scopes,
      connected_at,
      last_verified_at,
      disconnected_at,
      last_error_code,
      updated_at
   ) values (
      state_row.organization_id,
      null,
      'github',
      'organization',
      'connected',
      p_installation_id,
      btrim(p_account_label),
      p_scopes,
      now(),
      now(),
      null,
      null,
      now()
   )
   on conflict (organization_id, provider)
      where connection_scope = 'organization'
   do update set
      status = 'connected',
      external_account_id = excluded.external_account_id,
      external_account_label = excluded.external_account_label,
      scopes = excluded.scopes,
      connected_at = excluded.connected_at,
      last_verified_at = excluded.last_verified_at,
      disconnected_at = null,
      last_error_code = null,
      updated_at = excluded.updated_at
   returning * into connection_row;

   update public.integration_authorization_states state
      set consumed_at = now()
   where state.id = state_row.id;

   return query
   select connection_row.id,
          connection_row.organization_id,
          connection_row.status,
          connection_row.external_account_id,
          connection_row.external_account_label,
          connection_row.connected_at;
end;
$$;

revoke all on function public.create_integration_authorization_state(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_integration_authorization_state(text) from public, anon, authenticated;
revoke all on function public.record_integration_authorization_candidate(text, text) from public, anon, authenticated;
revoke all on function public.complete_github_integration_authorization(text, text, text, text[]) from public, anon, authenticated;

grant execute on function public.create_integration_authorization_state(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.get_integration_authorization_state(text) to authenticated;
grant execute on function public.record_integration_authorization_candidate(text, text) to authenticated;
grant execute on function public.complete_github_integration_authorization(text, text, text, text[]) to authenticated;

comment on table public.integration_authorization_states is
   'One-time hashed provider authorization state. Never stores plaintext OAuth state, PKCE verifiers, access tokens, refresh tokens, or provider secrets.';

commit;
