import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { cycleAssignmentSchema } from '@/lib/cycles/contracts';
import { authorizeCycleAccess } from '@/lib/cycles/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
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
   const parsed = cycleAssignmentSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid cycle assignment.' }, { status: 400 });
   }

   const { teamId } = await params;
   const context = await authorizeCycleAccess(request, teamId, true, 'Unable to update cycle assignment.');
   if (!context.ok) return context.response;

   const { data: issue, error: issueError } = await context.supabase
      .from('issues')
      .select('id')
      .eq('id', parsed.data.issueId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .maybeSingle();
   if (issueError) {
      return NextResponse.json({ error: 'Unable to update cycle assignment.' }, { status: 500 });
   }
   if (!issue) return NextResponse.json({ error: 'Issue not found in this team.' }, { status: 404 });

   if (parsed.data.cycleId) {
      const { data: cycle, error: cycleError } = await context.supabase
         .from('cycles')
         .select('id')
         .eq('id', parsed.data.cycleId)
         .eq('organization_id', context.organizationId)
         .eq('team_id', context.team.id)
         .maybeSingle();
      if (cycleError) {
         return NextResponse.json({ error: 'Unable to update cycle assignment.' }, { status: 500 });
      }
      if (!cycle) return NextResponse.json({ error: 'Cycle not found in this team.' }, { status: 404 });
   }

   const { data, error } = await context.supabase
      .from('issues')
      .update({ cycle_id: parsed.data.cycleId })
      .eq('id', parsed.data.issueId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update cycle assignment.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Issue not found in this team.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
