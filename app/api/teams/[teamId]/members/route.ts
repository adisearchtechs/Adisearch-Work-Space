import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateTeamMembershipSchema } from '@/lib/teams/contracts';
import { authorizeTeamAccess, isUuid } from '@/lib/teams/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { teamId } = await params;
   if (!isUuid(teamId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateTeamMembershipSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid team member.' }, { status: 400 });

   const context = await authorizeTeamAccess(request, true, 'Unable to add team member.', teamId);
   if ('response' in context) return context.response;

   const { data: organizationMember, error: organizationMemberError } = await context.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', context.organizationId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
   if (organizationMemberError) {
      return NextResponse.json({ error: 'Unable to add team member.' }, { status: 500 });
   }
   if (!organizationMember) {
      return NextResponse.json({ error: 'User is not a workspace member.' }, { status: 400 });
   }

   const { data: existing, error: existingError } = await context.supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('organization_id', context.organizationId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to add team member.' }, { status: 500 });
   if (existing) return new NextResponse(null, { status: 204 });

   const { error } = await context.supabase.from('team_members').insert({
      team_id: teamId,
      organization_id: context.organizationId,
      user_id: parsed.data.userId,
   });
   if (error) return NextResponse.json({ error: 'Unable to add team member.' }, { status: 500 });
   return new NextResponse(null, { status: 204 });
}
