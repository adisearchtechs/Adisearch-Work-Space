import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createInitiativeSchema } from '@/lib/initiatives/contracts';
import {
   authorizeInitiativeAccess,
   INITIATIVE_SELECT,
   loadInitiatives,
   toInitiativeDto,
} from '@/lib/initiatives/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeInitiativeAccess(request, false, 'Unable to load initiatives.');
   if ('response' in context) return context.response;

   try {
      const initiatives = await loadInitiatives(context.supabase, context.organizationId);
      return NextResponse.json(
         { initiatives },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load initiatives.' }, { status: 500 });
   }
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

   const parsed = createInitiativeSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid initiative data.' }, { status: 400 });
   }

   const context = await authorizeInitiativeAccess(request, true, 'Unable to create initiative.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiatives')
      .insert({
         organization_id: context.organizationId,
         name: parsed.data.name,
         description: parsed.data.description ?? '',
         icon: parsed.data.icon ?? '🎯',
         status: parsed.data.status ?? 'planned',
         priority: parsed.data.priority ?? 'no-priority',
         owner_id: context.userId,
         target: parsed.data.target ?? null,
         health: parsed.data.health ?? 'no-update',
      })
      .select(INITIATIVE_SELECT)
      .single();
   if (error || !data) {
      return NextResponse.json({ error: 'Unable to create initiative.' }, { status: 500 });
   }

   const { data: profile } = await context.supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', context.userId)
      .maybeSingle();

   return NextResponse.json(
      { initiative: toInitiativeDto(data, [], profile ?? undefined) },
      { status: 201 }
   );
}
