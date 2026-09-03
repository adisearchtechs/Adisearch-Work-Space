-- R3A follow-up: Supabase exposes public-schema functions to anon unless explicitly revoked.
-- Keep invitation lifecycle RPCs callable only by signed-in users.

begin;

revoke execute on function public.create_organization_invitation(
   uuid,
   text,
   public.organization_role,
   text,
   timestamptz,
   uuid[]
) from anon;
revoke execute on function public.revoke_organization_invitation(uuid, uuid) from anon;
revoke execute on function public.accept_organization_invitation(text) from anon;

commit;
