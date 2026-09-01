import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateProjectMilestoneSchema } from '@/lib/project-milestones/contracts';
import {
   authorizeProjectMilestoneAccess,
   isUuid,
   PROJECT_MILESTONE_SELECT,
   toProjectMilestoneDto,
} from '@/lib/project-milestones/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { projectId, milestoneId } = await params;
   if (!isUuid(projectId) || !isUuid(milestoneId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = updateProjectMilestoneSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid project milestone.' }, { status: 400 });
   }

   const context = await authorizeProjectMilestoneAccess(
      request,
      projectId,
      true,
      'Unable to update project milestone.'
   );
   if ('response' in context) return context.response;

   const updates: {
      name?: string;
      target_date?: string | null;
      completed?: boolean;
   } = {};
   if (parsed.data.name !== undefined) updates.name = parsed.data.name;
   if (parsed.data.targetDate !== undefined) updates.target_date = parsed.data.targetDate;
   if (parsed.data.completed !== undefined) updates.completed = parsed.data.completed;

   const { data, error } = await context.supabase
      .from('project_milestones')
      .update(updates)
      .eq('id', milestoneId)
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .select(PROJECT_MILESTONE_SELECT)
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to update project milestone.' }, { status: 500 });
   }
   if (!data) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   return NextResponse.json({ milestone: toProjectMilestoneDto(data) });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { projectId, milestoneId } = await params;
   if (!isUuid(projectId) || !isUuid(milestoneId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeProjectMilestoneAccess(
      request,
      projectId,
      true,
      'Unable to delete project milestone.'
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('project_milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('organization_id', context.organizationId)
      .eq('project_id', projectId)
      .select('id')
      .maybeSingle();

   if (error) {
      return NextResponse.json({ error: 'Unable to delete project milestone.' }, { status: 500 });
   }
   if (!data) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   return new NextResponse(null, { status: 204 });
}
