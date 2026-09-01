import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateInitiativeResourceSchema } from '@/lib/initiative-resources/contracts';
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

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string; resourceId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId, resourceId } = await params;
   if (!isUuid(initiativeId) || !isUuid(resourceId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateInitiativeResourceSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid initiative resource.' }, { status: 400 });
   }

   const context = await authorizeInitiativeResourceAccess(
      request,
      initiativeId,
      true,
      'Unable to update initiative resource.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_resources')
      .update(parsed.data)
      .eq('id', resourceId)
      .eq('organization_id', context.organizationId)
      .eq('initiative_id', initiativeId)
      .select(INITIATIVE_RESOURCE_SELECT)
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to update initiative resource.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({ resource: toInitiativeResourceDto(data) });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string; resourceId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId, resourceId } = await params;
   if (!isUuid(initiativeId) || !isUuid(resourceId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeInitiativeResourceAccess(
      request,
      initiativeId,
      true,
      'Unable to delete initiative resource.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_resources')
      .delete()
      .eq('id', resourceId)
      .eq('organization_id', context.organizationId)
      .eq('initiative_id', initiativeId)
      .select('id')
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to delete initiative resource.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
