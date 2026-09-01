import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateProjectResourceSchema } from '@/lib/project-resources/contracts';
import {
   authorizeProjectResourceAccess,
   isUuid,
   PROJECT_RESOURCE_SELECT,
   toProjectResourceDto,
} from '@/lib/project-resources/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string; resourceId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });

   const { projectId, resourceId } = await params;
   if (!isUuid(projectId) || !isUuid(resourceId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateProjectResourceSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid project resource.' }, { status: 400 });

   const context = await authorizeProjectResourceAccess(request, projectId, true, 'Unable to update project resource.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('project_resources')
      .update(parsed.data)
      .eq('id', resourceId)
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .select(PROJECT_RESOURCE_SELECT)
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to update project resource.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({ resource: toProjectResourceDto(data) });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string; resourceId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });

   const { projectId, resourceId } = await params;
   if (!isUuid(projectId) || !isUuid(resourceId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeProjectResourceAccess(request, projectId, true, 'Unable to delete project resource.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('project_resources')
      .delete()
      .eq('id', resourceId)
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .select('id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to delete project resource.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
