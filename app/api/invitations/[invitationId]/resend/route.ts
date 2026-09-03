import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import {
   invitationDeliveryReadiness,
   sendWorkspaceInvitationEmail,
} from '@/lib/invitations/email';
import { invitationRpcErrorMessage, invitationRpcErrorStatus } from '@/lib/invitations/server';
import {
   generateWorkspaceInvitationToken,
   hashWorkspaceInvitationToken,
   workspaceInvitationExpiry,
} from '@/lib/invitations/token';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function POST(
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
      'Unable to resend workspace invitation.'
   );
   if ('response' in context) return context.response;

   const delivery = invitationDeliveryReadiness();
   if (!delivery.available) {
      return NextResponse.json(
         { error: delivery.reason, delivery },
         { status: 503, headers: { 'Cache-Control': 'private, no-store' } }
      );
   }

   const { data: organization, error: organizationError } = await context.supabase
      .from('organizations')
      .select('name')
      .eq('id', context.organizationId)
      .maybeSingle();
   if (organizationError || !organization) {
      return NextResponse.json({ error: 'Unable to load workspace details.' }, { status: 500 });
   }

   const token = generateWorkspaceInvitationToken();
   const expiresAt = workspaceInvitationExpiry();
   const { data, error } = await context.supabase.rpc('reissue_organization_invitation', {
      p_invitation_id: invitationId,
      p_organization_id: context.organizationId,
      p_token_hash: hashWorkspaceInvitationToken(token),
      p_expires_at: expiresAt,
   });
   if (error) {
      const status = invitationRpcErrorStatus(error.message);
      return NextResponse.json(
         { error: invitationRpcErrorMessage(error.message, 'Unable to resend workspace invitation.') },
         { status }
      );
   }

   const invitation = data?.[0];
   if (!invitation) {
      return NextResponse.json({ error: 'Unable to resend workspace invitation.' }, { status: 500 });
   }

   try {
      await sendWorkspaceInvitationEmail({
         email: invitation.email,
         organizationName: organization.name,
         role: invitation.role,
         token,
      });
   } catch {
      const { error: revokeError } = await context.supabase.rpc('revoke_organization_invitation', {
         p_invitation_id: invitationId,
         p_organization_id: context.organizationId,
      });
      if (revokeError) {
         return NextResponse.json(
            {
               error:
                  'Invitation delivery failed and the rotated invitation could not be safely revoked. Review it before retrying.',
            },
            { status: 500 }
         );
      }
      return NextResponse.json(
         { error: 'Invitation email could not be delivered. The invitation was revoked safely.' },
         { status: 502 }
      );
   }

   return NextResponse.json(
      {
         invitation: {
            id: invitation.invitation_id,
            expiresAt: invitation.expires_at,
            status: 'pending',
         },
         delivery: { status: 'sent' },
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
