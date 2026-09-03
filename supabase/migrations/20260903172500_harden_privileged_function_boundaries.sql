-- R7: remove exposed SECURITY DEFINER implementations while preserving the public RPC surface.
-- Public functions remain callable by authenticated users, but now execute as SECURITY INVOKER
-- wrappers that delegate to private SECURITY DEFINER implementations.

begin;

-- Trigger-only helpers must never be directly invokable by application roles.
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.bootstrap_workspace() from public, anon, authenticated;
revoke all on function private.assign_issue_number() from public, anon, authenticated;

-- Move existing privileged implementations out of the exposed public schema. ALTER FUNCTION
-- preserves each implementation exactly, including its SECURITY DEFINER behavior and validation.
alter function public.create_organization_invitation(
   uuid, text, public.organization_role, text, timestamptz, uuid[]
) set schema private;
alter function public.revoke_organization_invitation(uuid, uuid) set schema private;
alter function public.accept_organization_invitation(text) set schema private;
alter function public.reissue_organization_invitation(uuid, uuid, text, timestamptz) set schema private;

alter function public.create_integration_authorization_state(uuid, text, text, timestamptz)
   set schema private;
alter function public.get_integration_authorization_state(text) set schema private;
alter function public.record_integration_authorization_candidate(text, text) set schema private;
alter function public.complete_github_integration_authorization(text, text, text, text[])
   set schema private;

-- Private implementations are unreachable through the normal PostgREST exposed schema.
-- Authenticated callers only receive EXECUTE because the SECURITY INVOKER public wrappers below
-- need to delegate while preserving auth.uid() from the caller's JWT.
revoke all on function private.create_organization_invitation(
   uuid, text, public.organization_role, text, timestamptz, uuid[]
) from public, anon, authenticated;
revoke all on function private.revoke_organization_invitation(uuid, uuid)
   from public, anon, authenticated;
revoke all on function private.accept_organization_invitation(text)
   from public, anon, authenticated;
revoke all on function private.reissue_organization_invitation(uuid, uuid, text, timestamptz)
   from public, anon, authenticated;
revoke all on function private.create_integration_authorization_state(uuid, text, text, timestamptz)
   from public, anon, authenticated;
revoke all on function private.get_integration_authorization_state(text)
   from public, anon, authenticated;
revoke all on function private.record_integration_authorization_candidate(text, text)
   from public, anon, authenticated;
revoke all on function private.complete_github_integration_authorization(text, text, text, text[])
   from public, anon, authenticated;

grant execute on function private.create_organization_invitation(
   uuid, text, public.organization_role, text, timestamptz, uuid[]
) to authenticated;
grant execute on function private.revoke_organization_invitation(uuid, uuid) to authenticated;
grant execute on function private.accept_organization_invitation(text) to authenticated;
grant execute on function private.reissue_organization_invitation(uuid, uuid, text, timestamptz)
   to authenticated;
grant execute on function private.create_integration_authorization_state(uuid, text, text, timestamptz)
   to authenticated;
grant execute on function private.get_integration_authorization_state(text) to authenticated;
grant execute on function private.record_integration_authorization_candidate(text, text)
   to authenticated;
grant execute on function private.complete_github_integration_authorization(text, text, text, text[])
   to authenticated;

-- Stable public RPC contracts. These are intentionally SECURITY INVOKER and contain no privileged
-- data access of their own.
create function public.create_organization_invitation(
   p_organization_id uuid,
   p_email text,
   p_role public.organization_role,
   p_token_hash text,
   p_expires_at timestamptz,
   p_team_ids uuid[] default '{}'::uuid[]
)
returns table (
   invitation_id uuid,
   organization_id uuid,
   email text,
   role public.organization_role,
   invited_by uuid,
   created_at timestamptz,
   expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.create_organization_invitation(
      p_organization_id,
      p_email,
      p_role,
      p_token_hash,
      p_expires_at,
      p_team_ids
   );
$$;

create function public.revoke_organization_invitation(
   p_invitation_id uuid,
   p_organization_id uuid
)
returns table (
   invitation_id uuid,
   revoked_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.revoke_organization_invitation(p_invitation_id, p_organization_id);
$$;

create function public.accept_organization_invitation(
   p_token_hash text
)
returns table (
   organization_id uuid,
   organization_slug text,
   role public.organization_role,
   accepted_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select * from private.accept_organization_invitation(p_token_hash);
$$;

create function public.reissue_organization_invitation(
   p_invitation_id uuid,
   p_organization_id uuid,
   p_token_hash text,
   p_expires_at timestamptz
)
returns table (
   invitation_id uuid,
   email text,
   role public.organization_role,
   expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.reissue_organization_invitation(
      p_invitation_id,
      p_organization_id,
      p_token_hash,
      p_expires_at
   );
$$;

create function public.create_integration_authorization_state(
   p_organization_id uuid,
   p_provider text,
   p_state_hash text,
   p_expires_at timestamptz
)
returns table (
   authorization_id uuid,
   expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.create_integration_authorization_state(
      p_organization_id,
      p_provider,
      p_state_hash,
      p_expires_at
   );
$$;

create function public.get_integration_authorization_state(
   p_state_hash text
)
returns table (
   authorization_id uuid,
   organization_id uuid,
   provider text,
   candidate_external_id text,
   expires_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
   select * from private.get_integration_authorization_state(p_state_hash);
$$;

create function public.record_integration_authorization_candidate(
   p_state_hash text,
   p_external_id text
)
returns table (
   authorization_id uuid,
   organization_id uuid,
   candidate_external_id text
)
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.record_integration_authorization_candidate(p_state_hash, p_external_id);
$$;

create function public.complete_github_integration_authorization(
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
language sql
security invoker
set search_path = ''
as $$
   select *
   from private.complete_github_integration_authorization(
      p_state_hash,
      p_installation_id,
      p_account_label,
      p_scopes
   );
$$;

-- Public RPCs are opt-in for authenticated users only.
revoke all on function public.create_organization_invitation(
   uuid, text, public.organization_role, text, timestamptz, uuid[]
) from public, anon, authenticated;
revoke all on function public.revoke_organization_invitation(uuid, uuid)
   from public, anon, authenticated;
revoke all on function public.accept_organization_invitation(text)
   from public, anon, authenticated;
revoke all on function public.reissue_organization_invitation(uuid, uuid, text, timestamptz)
   from public, anon, authenticated;
revoke all on function public.create_integration_authorization_state(uuid, text, text, timestamptz)
   from public, anon, authenticated;
revoke all on function public.get_integration_authorization_state(text)
   from public, anon, authenticated;
revoke all on function public.record_integration_authorization_candidate(text, text)
   from public, anon, authenticated;
revoke all on function public.complete_github_integration_authorization(text, text, text, text[])
   from public, anon, authenticated;

grant execute on function public.create_organization_invitation(
   uuid, text, public.organization_role, text, timestamptz, uuid[]
) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid, uuid) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.reissue_organization_invitation(uuid, uuid, text, timestamptz)
   to authenticated;
grant execute on function public.create_integration_authorization_state(uuid, text, text, timestamptz)
   to authenticated;
grant execute on function public.get_integration_authorization_state(text) to authenticated;
grant execute on function public.record_integration_authorization_candidate(text, text)
   to authenticated;
grant execute on function public.complete_github_integration_authorization(text, text, text, text[])
   to authenticated;

-- Prevent future functions from being executable by application roles unless a migration opts in.
alter default privileges for role postgres in schema public
   revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private
   revoke execute on functions from public, anon, authenticated;

commit;
