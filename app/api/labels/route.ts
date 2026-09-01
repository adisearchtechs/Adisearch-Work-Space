import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createWorkspaceLabelSchema,
   type WorkspaceLabelDto,
   type WorkspaceLabelUsage,
} from '@/lib/workspace-labels/contracts';
import { authorizeWorkspaceLabelAccess } from '@/lib/workspace-labels/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function increment(counts: Map<string, number>, labelId: string) {
   counts.set(labelId, (counts.get(labelId) ?? 0) + 1);
}

function usageFor(
   labelId: string,
   issueCounts: Map<string, number>,
   projectCounts: Map<string, number>,
   initiativeCounts: Map<string, number>
): WorkspaceLabelUsage {
   const issues = issueCounts.get(labelId) ?? 0;
   const projects = projectCounts.get(labelId) ?? 0;
   const initiatives = initiativeCounts.get(labelId) ?? 0;
   return { issues, projects, initiatives, total: issues + projects + initiatives };
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const context = await authorizeWorkspaceLabelAccess(request, false, 'Unable to load workspace labels.');
   if ('response' in context) return context.response;

   const [labelsResult, issuesResult, projectsResult, initiativesResult] = await Promise.all([
      context.supabase
         .from('labels')
         .select('id, name, color, created_at, updated_at')
         .eq('organization_id', context.organizationId)
         .order('name'),
      context.supabase.from('issue_labels').select('label_id').eq('organization_id', context.organizationId),
      context.supabase.from('project_labels').select('label_id').eq('organization_id', context.organizationId),
      context.supabase.from('initiative_labels').select('label_id').eq('organization_id', context.organizationId),
   ]);

   const error =
      labelsResult.error ?? issuesResult.error ?? projectsResult.error ?? initiativesResult.error;
   if (error) {
      return NextResponse.json({ error: 'Unable to load workspace labels.' }, { status: 500 });
   }

   const issueCounts = new Map<string, number>();
   const projectCounts = new Map<string, number>();
   const initiativeCounts = new Map<string, number>();
   for (const row of issuesResult.data ?? []) increment(issueCounts, row.label_id);
   for (const row of projectsResult.data ?? []) increment(projectCounts, row.label_id);
   for (const row of initiativesResult.data ?? []) increment(initiativeCounts, row.label_id);

   const labels: WorkspaceLabelDto[] = (labelsResult.data ?? []).map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      createdAt: label.created_at,
      updatedAt: label.updated_at,
      usage: usageFor(label.id, issueCounts, projectCounts, initiativeCounts),
   }));

   return NextResponse.json(
      { labels },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }

   const parsed = createWorkspaceLabelSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid workspace label.' }, { status: 400 });
   }

   const context = await authorizeWorkspaceLabelAccess(request, true, 'Unable to create workspace label.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('labels')
      .insert({
         organization_id: context.organizationId,
         name: parsed.data.name,
         color: parsed.data.color,
      })
      .select('id, name, color, created_at, updated_at')
      .single();

   if (error) {
      if (error.code === '23505') {
         return NextResponse.json({ error: 'A label with that name already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Unable to create workspace label.' }, { status: 500 });
   }

   const label: WorkspaceLabelDto = {
      id: data.id,
      name: data.name,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      usage: { issues: 0, projects: 0, initiatives: 0, total: 0 },
   };

   return NextResponse.json({ label }, { status: 201 });
}
