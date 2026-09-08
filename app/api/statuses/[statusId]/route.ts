import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';
import { updateWorkspaceStatusSchema } from '@/lib/workspace-statuses/contracts';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function readMutationBody(request: NextRequest) {
   try {
      return { input: await readJsonBody(request) } as const;
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return {
         response: NextResponse.json({ error: 'Invalid request body.' }, { status }),
      } as const;
   }
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ statusId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { statusId } = await params;
   if (!isUuid(statusId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const body = await readMutationBody(request);
   if ('response' in body) return body.response;

   const parsed = updateWorkspaceStatusSchema.safeParse(body.input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace status.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to update workspace status.'
   );
   if ('response' in context) return context.response;

   const updates = {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color.toUpperCase() } : {}),
      ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
   };

   const { data, error } = await context.supabase
      .from('statuses')
      .update(updates)
      .eq('id', statusId)
      .eq('organization_id', context.organizationId)
      .select('id, name, slug, color, category, position')
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to update workspace status.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({ status: data });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ statusId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { statusId } = await params;
   if (!isUuid(statusId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to delete workspace status.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('statuses')
      .delete()
      .eq('id', statusId)
      .eq('organization_id', context.organizationId)
      .select('id')
      .maybeSingle();

   if (error) {
      if (error.code === '23503') {
         return NextResponse.json(
            { error: 'Status is in use by one or more issues and cannot be deleted.' },
            { status: 409 }
         );
      }
      return NextResponse.json({ error: 'Unable to delete workspace status.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
