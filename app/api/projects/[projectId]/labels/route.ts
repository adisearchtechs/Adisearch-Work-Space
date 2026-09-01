import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { assignProjectLabelSchema, type ProjectLabelDto } from '@/lib/project-labels/contracts';
import { authorizeProjectLabelAccess, isUuid } from '@/lib/project-labels/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
   if (!isSupabaseConfigured()) return unavailable();
   const { projectId } = await params;
   if (!isUuid(projectId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeProjectLabelAccess(request, projectId, false, 'Unable to load project labels.');
   if ('response' in context) return context.response;

   const [{ data: labels, error: labelsError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
         context.supabase
            .from('labels')
            .select('id, name, color')
            .eq('organization_id', context.organizationId)
            .order('name'),
         context.supabase
            .from('project_labels')
            .select('label_id')
            .eq('organization_id', context.organizationId)
            .eq('project_id', projectId),
      ]);

   if (labelsError || assignmentsError) {
      return NextResponse.json({ error: 'Unable to load project labels.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         labels: (labels ?? []) as ProjectLabelDto[],
         assignedLabelIds: (assignments ?? []).map((item) => item.label_id),
      },
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

   const parsed = assignProjectLabelSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid project label.' }, { status: 400 });

   const context = await authorizeProjectLabelAccess(request, projectId, true, 'Unable to assign project label.');
   if ('response' in context) return context.response;

   const { data: label, error: labelError } = await context.supabase
      .from('labels')
      .select('id')
      .eq('id', parsed.data.labelId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (labelError) return NextResponse.json({ error: 'Unable to assign project label.' }, { status: 500 });
   if (!label) return NextResponse.json({ error: 'Invalid label.' }, { status: 400 });

   const { data: existing, error: existingError } = await context.supabase
      .from('project_labels')
      .select('label_id')
      .eq('project_id', projectId)
      .eq('label_id', parsed.data.labelId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to assign project label.' }, { status: 500 });
   if (existing) return new NextResponse(null, { status: 204 });

   const { error } = await context.supabase.from('project_labels').insert({
      project_id: projectId,
      label_id: parsed.data.labelId,
      organization_id: context.organizationId,
   });
   if (error) return NextResponse.json({ error: 'Unable to assign project label.' }, { status: 500 });

   return new NextResponse(null, { status: 204 });
}
