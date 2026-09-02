import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateWorkspaceLabelSchema } from '@/lib/workspace-labels/contracts';
import { authorizeWorkspaceLabelAccess, isUuid } from '@/lib/workspace-labels/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ labelId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { labelId } = await params;
   if (!isUuid(labelId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateWorkspaceLabelSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace label.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceLabelAccess(request, true, 'Unable to update workspace label.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('labels')
      .update(parsed.data)
      .eq('id', labelId)
      .eq('organization_id', context.organizationId)
      .select('id, name, color, created_at, updated_at')
      .maybeSingle();

   if (error) {
      if (error.code === '23505') {
         return NextResponse.json({ error: 'A label with that name already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Unable to update workspace label.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({
      label: {
         id: data.id,
         name: data.name,
         color: data.color,
         createdAt: data.created_at,
         updatedAt: data.updated_at,
      },
   });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ labelId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { labelId } = await params;
   if (!isUuid(labelId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeWorkspaceLabelAccess(request, true, 'Unable to delete workspace label.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('labels')
      .delete()
      .eq('id', labelId)
      .eq('organization_id', context.organizationId)
      .select('id')
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to delete workspace label.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
