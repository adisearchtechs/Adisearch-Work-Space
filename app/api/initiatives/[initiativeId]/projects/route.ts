import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { assignInitiativeProjectSchema } from '@/lib/initiatives/contracts';
import { authorizeInitiativeAccess, isUuid } from '@/lib/initiatives/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
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
   const parsed = assignInitiativeProjectSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 });

   const context = await authorizeInitiativeAccess(
      request,
      true,
      'Unable to assign project.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { data: project, error: projectError } = await context.supabase
      .from('projects')
      .select('id')
      .eq('id', parsed.data.projectId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (projectError) return NextResponse.json({ error: 'Unable to assign project.' }, { status: 500 });
   if (!project) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 });

   const { data: existing, error: existingError } = await context.supabase
      .from('initiative_projects')
      .select('project_id')
      .eq('initiative_id', initiativeId)
      .eq('project_id', parsed.data.projectId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (existingError) return NextResponse.json({ error: 'Unable to assign project.' }, { status: 500 });
   if (existing) return new NextResponse(null, { status: 204 });

   const { error } = await context.supabase.from('initiative_projects').insert({
      initiative_id: initiativeId,
      project_id: parsed.data.projectId,
      organization_id: context.organizationId,
   });
   if (error) return NextResponse.json({ error: 'Unable to assign project.' }, { status: 500 });

   return new NextResponse(null, { status: 204 });
}
