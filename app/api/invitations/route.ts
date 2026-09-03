import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createWorkspaceInvitationSchema,
   type WorkspaceInvitationDto,
} from '@/lib/invitations/contracts';
import {
   invitationRpcErrorMessage,
   invitationRpcErrorStatus,
   workspaceInvitationStatus,
} from '@/lib/invitations/server';
import {
   generateWorkspaceInvitationToken,
   hashWorkspaceInvitationToken,
   workspaceInvitationExpiry,
} from '@/lib/invitations/token';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to load workspace invitations.'
   );
   if ('response' in context) return context.response;

   const [invitationsResult, teamsResult] = await Promise.all([
      context.supabase
         .from('organization_invitations')
         .select('id, email, role, invited_by, created_at, expires_at, accepted_at, revoked_at')
         .eq('organization_id', context.organizationId)
         .order('created_at', { ascending: false }),
      context.supabase
         .from('organization_invitation_teams')
         .select('invitation_id, team_id')
         .eq('organization_id', context.organizationId),
   ]);

   const error = invitationsResult.error ?? teamsResult.error;
   if (error) {
      return NextResponse.json({ error: 'Unable to load workspace invitations.' }, { status: 500 });
   }

   const teamIdsByInvitation = new Map<string, string[]>();
   for (const assignment of teamsResult.data ?? []) {
      const teamIds = teamIdsByInvitation.get(assignment.invitation_id) ?? [];
      teamIds.push(assignment.team_id);
      teamIdsByInvitation.set(assignment.invitation_id, teamIds);
   }

   const invitations: WorkspaceInvitationDto[] = (invitationsResult.data ?? []).map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      teamIds: teamIdsByInvitation.get(invitation.id) ?? [],
      invitedBy: invitation.invited_by,
      createdAt: invitation.created_at,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      revokedAt: invitation.revoked_at,
      status: workspaceInvitationStatus({
         acceptedAt: invitation.accepted_at,
         revokedAt: invitation.revoked_at,
         expiresAt: invitation.expires_at,
      }),
   }));

   return NextResponse.json(
      { invitations, actorRole: context.role },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createWorkspaceInvitationSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid invitation.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to create workspace invitation.'
   );
   if ('response' in context) return context.response;
   if (context.role === 'admin' && parsed.data.role === 'admin') {
      return NextResponse.json({ error: 'Only the workspace owner can invite another admin.' }, { status: 403 });
   }

   const token = generateWorkspaceInvitationToken();
   const tokenHash = hashWorkspaceInvitationToken(token);
   const expiresAt = workspaceInvitationExpiry();
   const { data, error } = await context.supabase.rpc('create_organization_invitation', {
      p_organization_id: context.organizationId,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
      p_team_ids: parsed.data.teamIds,
   });

   if (error) {
      const status = invitationRpcErrorStatus(error.message);
      return NextResponse.json(
         { error: invitationRpcErrorMessage(error.message, 'Unable to create workspace invitation.') },
         { status }
      );
   }

   const created = data?.[0];
   if (!created) {
      return NextResponse.json({ error: 'Unable to create workspace invitation.' }, { status: 500 });
   }

   const invitation: WorkspaceInvitationDto = {
      id: created.invitation_id,
      email: created.email,
      role: created.role,
      teamIds: parsed.data.teamIds,
      invitedBy: created.invited_by,
      createdAt: created.created_at,
      expiresAt: created.expires_at,
      acceptedAt: null,
      revokedAt: null,
      status: 'pending',
   };

   return NextResponse.json(
      {
         invitation,
         inviteToken: token,
         delivery: {
            status: 'not-sent',
            reason: 'Transactional invitation email delivery is added in R3B.',
         },
      },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } }
   );
}
