import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { authorizeTeamAccess, isUuid } from '@/lib/teams/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { teamId, userId } = await params;
   if (!isUuid(teamId) || !isUuid(userId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeTeamAccess(request, true, 'Unable to remove team member.', teamId);
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', userId)
      .select('user_id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to remove team member.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
