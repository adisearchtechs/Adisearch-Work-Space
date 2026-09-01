import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createProjectResourceSchema } from '@/lib/project-resources/contracts';
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
   if (!isSupabaseConfigured()) return unavailable();
   const { projectId } = await params;
   if (!isUuid(projectId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeProjectResourceAccess(request, projectId, false, 'Unable to load project resources.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('project_resources')
      .select(PROJECT_RESOURCE_SELECT)
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
   if (error) return NextResponse.json({ error: 'Unable to load project resources.' }, { status: 500 });

   return NextResponse.json(
      { resources: (data ?? []).map(toProjectResourceDto) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });

   const { projectId } = await params;
   if (!isUuid(projectId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createProjectResourceSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid project resource.' }, { status: 400 });

   const context = await authorizeProjectResourceAccess(request, projectId, true, 'Unable to create project resource.');
   if ('response' in context) return context.response;

   const { data: lastResource, error: positionError } = await context.supabase
      .from('project_resources')
      .select('position')
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
   if (positionError) return NextResponse.json({ error: 'Unable to create project resource.' }, { status: 500 });

   const { data, error } = await context.supabase
      .from('project_resources')
      .insert({
         organization_id: context.organizationId,
         project_id: projectId,
         created_by: context.userId,
         label: parsed.data.label,
         url: parsed.data.url,
         position: (lastResource?.position ?? -1) + 1,
      })
      .select(PROJECT_RESOURCE_SELECT)
      .single();
   if (error || !data) return NextResponse.json({ error: 'Unable to create project resource.' }, { status: 500 });

   return NextResponse.json({ resource: toProjectResourceDto(data) }, { status: 201 });
}
