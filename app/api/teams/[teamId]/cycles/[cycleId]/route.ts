import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateCycleSchema } from '@/lib/cycles/contracts';
import { authorizeCycleAccess, isCycleUuid } from '@/lib/cycles/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string; cycleId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { teamId, cycleId } = await params;
   if (!isCycleUuid(cycleId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateCycleSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid cycle data.' }, { status: 400 });

   const context = await authorizeCycleAccess(request, teamId, true, 'Unable to update cycle.');
   if (!context.ok) return context.response;

   const { data: existing, error: existingError } = await context.supabase
      .from('cycles')
      .select('id, name, starts_at, ends_at')
      .eq('id', cycleId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to update cycle.' }, { status: 500 });
   if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const nextStart = parsed.data.startDate ?? existing.starts_at;
   const nextEnd = parsed.data.endDate ?? existing.ends_at;
   if (nextEnd < nextStart) {
      return NextResponse.json({ error: 'Cycle end date must be on or after the start date.' }, { status: 400 });
   }

   const { data: overlap, error: overlapError } = await context.supabase
      .from('cycles')
      .select('id')
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .neq('id', cycleId)
      .lte('starts_at', nextEnd)
      .gte('ends_at', nextStart)
      .limit(1)
      .maybeSingle();
   if (overlapError) return NextResponse.json({ error: 'Unable to update cycle.' }, { status: 500 });
   if (overlap) {
      return NextResponse.json({ error: 'Cycle dates overlap an existing team cycle.' }, { status: 409 });
   }

   const changes = {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.startDate !== undefined && { starts_at: parsed.data.startDate }),
      ...(parsed.data.endDate !== undefined && { ends_at: parsed.data.endDate }),
   };
   const { data, error } = await context.supabase
      .from('cycles')
      .update(changes)
      .eq('id', cycleId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update cycle.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string; cycleId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { teamId, cycleId } = await params;
   if (!isCycleUuid(cycleId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   const context = await authorizeCycleAccess(request, teamId, true, 'Unable to delete cycle.');
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('cycles')
      .delete()
      .eq('id', cycleId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to delete cycle.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
