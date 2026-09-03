import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { invitationRpcErrorMessage, invitationRpcErrorStatus } from '@/lib/invitations/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ invitationId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { invitationId } = await params;
   if (!isUuid(invitationId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to revoke workspace invitation.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase.rpc('revoke_organization_invitation', {
      p_invitation_id: invitationId,
      p_organization_id: context.organizationId,
   });
   if (error) {
      const status = invitationRpcErrorStatus(error.message);
      return NextResponse.json(
         { error: invitationRpcErrorMessage(error.message, 'Unable to revoke workspace invitation.') },
         { status }
      );
   }

   const revoked = data?.[0];
   if (!revoked) {
      return NextResponse.json({ error: 'Unable to revoke workspace invitation.' }, { status: 500 });
   }

   return NextResponse.json(
      { invitation: { id: revoked.invitation_id, revokedAt: revoked.revoked_at } },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
