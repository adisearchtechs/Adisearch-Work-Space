-- R3B: allow owners/admins to rotate unrecoverable invitation tokens for resend.

begin;

create or replace function public.reissue_organization_invitation(
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
language plpgsql
security definer
set search_path = ''
as $$
declare
   actor_id uuid := auth.uid();
   actor_role public.organization_role;
   invitation_row public.organization_invitations%rowtype;
begin
   if actor_id is null then
      raise exception 'UNAUTHORIZED';
   end if;

   select member.role
     into actor_role
     from public.organization_members member
    where member.organization_id = p_organization_id
      and member.user_id = actor_id;

   if actor_role is null or actor_role not in ('owner', 'admin') then
      raise exception 'FORBIDDEN';
   end if;
   if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'INVALID_TOKEN_HASH';
   end if;
   if p_expires_at <= now() + interval '5 minutes'
      or p_expires_at > now() + interval '30 days' then
      raise exception 'INVALID_EXPIRY';
   end if;

   select invitation.*
     into invitation_row
     from public.organization_invitations invitation
    where invitation.id = p_invitation_id
      and invitation.organization_id = p_organization_id
    for update;

   if invitation_row.id is null then
      raise exception 'INVITATION_NOT_FOUND';
   end if;
   if invitation_row.accepted_at is not null then
      raise exception 'INVITATION_ALREADY_ACCEPTED';
   end if;
   if invitation_row.revoked_at is not null then
      raise exception 'INVITATION_REVOKED';
   end if;
   if actor_role = 'admin' and invitation_row.role = 'admin' then
      raise exception 'ADMIN_CANNOT_MANAGE_ADMIN_INVITE';
   end if;

   update public.organization_invitations invitation
      set token_hash = p_token_hash,
          expires_at = p_expires_at
    where invitation.id = p_invitation_id
      and invitation.organization_id = p_organization_id;

   return query
   select
      invitation_row.id,
      invitation_row.email,
      invitation_row.role,
      p_expires_at;
end;
$$;

revoke all on function public.reissue_organization_invitation(uuid, uuid, text, timestamptz) from public;
revoke execute on function public.reissue_organization_invitation(uuid, uuid, text, timestamptz) from anon;
grant execute on function public.reissue_organization_invitation(uuid, uuid, text, timestamptz) to authenticated;

commit;
