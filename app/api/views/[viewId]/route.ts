import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { hasIssueOnlySavedViewFilter, updateSavedViewSchema } from '@/lib/views/contracts';
import {
   authorizeSavedViewAccess,
   canManageSavedView,
   isSavedViewUuid,
   SAVED_VIEW_SELECT,
   toSavedViewDto,
} from '@/lib/views/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ viewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   const { viewId } = await params;
   if (!isSavedViewUuid(viewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeSavedViewAccess(request, false, 'Unable to load saved view.');
   if (!context.ok) return context.response;
   const { data: row, error } = await context.supabase
      .from('saved_views')
      .select(SAVED_VIEW_SELECT)
      .eq('id', viewId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to load saved view.' }, { status: 500 });
   if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { data: owner } = await context.supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', row.owner_id)
      .maybeSingle();
   return NextResponse.json(
      { view: toSavedViewDto(row, owner ?? undefined, context.userId, context.role) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ viewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { viewId } = await params;
   if (!isSavedViewUuid(viewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateSavedViewSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid saved view.' }, { status: 400 });

   const context = await authorizeSavedViewAccess(request, true, 'Unable to update saved view.');
   if (!context.ok) return context.response;
   const { data: existing, error: existingError } = await context.supabase
      .from('saved_views')
      .select(SAVED_VIEW_SELECT)
      .eq('id', viewId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to update saved view.' }, { status: 500 });
   if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   if (!canManageSavedView(context.userId, context.role, existing.owner_id)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
   }
   if (
      existing.view_type === 'project' &&
      parsed.data.filter !== undefined &&
      hasIssueOnlySavedViewFilter(parsed.data.filter)
   ) {
      return NextResponse.json({ error: 'Invalid saved view.' }, { status: 400 });
   }

   const update = {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.icon !== undefined && { icon: parsed.data.icon }),
      ...(parsed.data.filter !== undefined && { filter: parsed.data.filter }),
   };
   const { data: row, error } = await context.supabase
      .from('saved_views')
      .update(update)
      .eq('id', viewId)
      .eq('organization_id', context.organizationId)
      .select(SAVED_VIEW_SELECT)
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update saved view.' }, { status: 500 });
   if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { data: owner } = await context.supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', row.owner_id)
      .maybeSingle();
   return NextResponse.json({
      view: toSavedViewDto(row, owner ?? undefined, context.userId, context.role),
   });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ viewId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }
   const { viewId } = await params;
   if (!isSavedViewUuid(viewId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeSavedViewAccess(request, true, 'Unable to delete saved view.');
   if (!context.ok) return context.response;
   const { data: existing, error: existingError } = await context.supabase
      .from('saved_views')
      .select('owner_id')
      .eq('id', viewId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to delete saved view.' }, { status: 500 });
   if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   if (!canManageSavedView(context.userId, context.role, existing.owner_id)) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
   }

   const { data, error } = await context.supabase
      .from('saved_views')
      .delete()
      .eq('id', viewId)
      .eq('organization_id', context.organizationId)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to delete saved view.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
