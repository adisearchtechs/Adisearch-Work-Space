import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateInitiativeSchema } from '@/lib/initiatives/contracts';
import { authorizeInitiativeAccess, isUuid, loadInitiatives } from '@/lib/initiatives/server';
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

   const context = await authorizeInitiativeAccess(
      request,
      false,
      'Unable to load initiative.',
      initiativeId
   );
   if ('response' in context) return context.response;

   try {
      const [initiative] = await loadInitiatives(
         context.supabase,
         context.organizationId,
         initiativeId
      );
      if (!initiative) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      return NextResponse.json(
         { initiative },
         { headers: { 'Cache-Control': 'private, no-store' } }
      );
   } catch {
      return NextResponse.json({ error: 'Unable to load initiative.' }, { status: 500 });
   }
}

export async function PATCH(
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
   const parsed = updateInitiativeSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid initiative data.' }, { status: 400 });

   const context = await authorizeInitiativeAccess(
      request,
      true,
      'Unable to update initiative.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { error } = await context.supabase
      .from('initiatives')
      .update(parsed.data)
      .eq('id', initiativeId)
      .eq('organization_id', context.organizationId);
   if (error) return NextResponse.json({ error: 'Unable to update initiative.' }, { status: 500 });

   try {
      const [initiative] = await loadInitiatives(
         context.supabase,
         context.organizationId,
         initiativeId
      );
      if (!initiative) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      return NextResponse.json({ initiative });
   } catch {
      return NextResponse.json({ error: 'Unable to update initiative.' }, { status: 500 });
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId } = await params;
   if (!isUuid(initiativeId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   const context = await authorizeInitiativeAccess(
      request,
      true,
      'Unable to delete initiative.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiatives')
      .delete()
      .eq('id', initiativeId)
      .eq('organization_id', context.organizationId)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to delete initiative.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
