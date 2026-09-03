import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { acceptWorkspaceInvitationSchema } from '@/lib/invitations/contracts';
import { invitationRpcErrorMessage, invitationRpcErrorStatus } from '@/lib/invitations/server';
import { hashWorkspaceInvitationToken } from '@/lib/invitations/token';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
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

   const parsed = acceptWorkspaceInvitationSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid invitation.' }, { status: 400 });
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   if (!claimsData?.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
   }

   const { data, error } = await supabase.rpc('accept_organization_invitation', {
      p_token_hash: hashWorkspaceInvitationToken(parsed.data.token),
   });
   if (error) {
      const status = invitationRpcErrorStatus(error.message);
      return NextResponse.json(
         { error: invitationRpcErrorMessage(error.message, 'Unable to accept workspace invitation.') },
         { status }
      );
   }

   const accepted = data?.[0];
   if (!accepted) {
      return NextResponse.json({ error: 'Unable to accept workspace invitation.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         organization: {
            id: accepted.organization_id,
            slug: accepted.organization_slug,
         },
         role: accepted.role,
         acceptedAt: accepted.accepted_at,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
