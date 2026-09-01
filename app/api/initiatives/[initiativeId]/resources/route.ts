import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createInitiativeResourceSchema } from '@/lib/initiative-resources/contracts';
import {
   authorizeInitiativeResourceAccess,
   INITIATIVE_RESOURCE_SELECT,
   toInitiativeResourceDto,
} from '@/lib/initiative-resources/server';
import { isUuid } from '@/lib/initiatives/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   const { initiativeId } = await params;
   if (!isUuid(initiativeId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeInitiativeResourceAccess(
      request,
      initiativeId,
      false,
      'Unable to load initiative resources.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_resources')
      .select(INITIATIVE_RESOURCE_SELECT)
      .eq('organization_id', context.organizationId)
      .eq('initiative_id', initiativeId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
   if (error) {
      return NextResponse.json({ error: 'Unable to load initiative resources.' }, { status: 500 });
   }

   return NextResponse.json(
      { resources: (data ?? []).map(toInitiativeResourceDto) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId } = await params;
   if (!isUuid(initiativeId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createInitiativeResourceSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid initiative resource.' }, { status: 400 });
   }

   const context = await authorizeInitiativeResourceAccess(
      request,
      initiativeId,
      true,
      'Unable to create initiative resource.'
   );
   if ('response' in context) return context.response;

   const { data: lastResource, error: positionError } = await context.supabase
      .from('initiative_resources')
      .select('position')
      .eq('organization_id', context.organizationId)
      .eq('initiative_id', initiativeId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
   if (positionError) {
      return NextResponse.json({ error: 'Unable to create initiative resource.' }, { status: 500 });
   }

   const { data, error } = await context.supabase
      .from('initiative_resources')
      .insert({
         organization_id: context.organizationId,
         initiative_id: initiativeId,
         created_by: context.userId,
         label: parsed.data.label,
         url: parsed.data.url,
         position: (lastResource?.position ?? -1) + 1,
      })
      .select(INITIATIVE_RESOURCE_SELECT)
      .single();
   if (error || !data) {
      return NextResponse.json({ error: 'Unable to create initiative resource.' }, { status: 500 });
   }

   return NextResponse.json({ resource: toInitiativeResourceDto(data) }, { status: 201 });
}
