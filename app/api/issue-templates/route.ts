import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createIssueTemplateSchema,
   reorderIssueTemplatesSchema,
   type IssueTemplateDto,
} from '@/lib/issue-templates/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import type { Database } from '@/lib/supabase/database.types';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';

const unavailable = () =>
   NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
type IssueTemplateRow = Database['public']['Tables']['issue_templates']['Row'];
const dto = (row: IssueTemplateRow): IssueTemplateDto => ({
   id: row.id,
   name: row.name,
   description: row.description,
   title: row.title,
   body: row.body,
   active: row.active,
   position: row.position,
   createdAt: row.created_at,
   updatedAt: row.updated_at,
});

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeWorkspaceMemberAccess(
      request,
      false,
      'Unable to load issue templates.'
   );
   if ('response' in context) return context.response;
   const { data, error } = await context.supabase
      .from('issue_templates')
      .select('*')
      .eq('organization_id', context.organizationId)
      .order('position')
      .order('name');
   if (error)
      return NextResponse.json({ error: 'Unable to load issue templates.' }, { status: 500 });
   return NextResponse.json(
      { templates: (data ?? []).map(dto) },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request))
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      return NextResponse.json(
         { error: 'Invalid request body.' },
         { status: error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400 }
      );
   }
   const parsed = createIssueTemplateSchema.safeParse(input);
   if (!parsed.success)
      return NextResponse.json({ error: 'Invalid issue template.' }, { status: 400 });
   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to create issue template.'
   );
   if ('response' in context) return context.response;
   const { data: last } = await context.supabase
      .from('issue_templates')
      .select('position')
      .eq('organization_id', context.organizationId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
   const { data, error } = await context.supabase
      .from('issue_templates')
      .insert({
         organization_id: context.organizationId,
         created_by: context.userId,
         ...parsed.data,
         position: Math.min((last?.position ?? 0) + 10, 32767),
      })
      .select('*')
      .single();
   if (error?.code === '23505')
      return NextResponse.json(
         { error: 'A template with that name already exists.' },
         { status: 409 }
      );
   if (error)
      return NextResponse.json({ error: 'Unable to create issue template.' }, { status: 500 });
   return NextResponse.json({ template: dto(data) }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request))
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      return NextResponse.json(
         { error: 'Invalid request body.' },
         { status: error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400 }
      );
   }
   const parsed = reorderIssueTemplatesSchema.safeParse(input);
   if (!parsed.success)
      return NextResponse.json({ error: 'Invalid template order.' }, { status: 400 });
   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to reorder issue templates.'
   );
   if ('response' in context) return context.response;
   const { data: current, error: loadError } = await context.supabase
      .from('issue_templates')
      .select('*')
      .eq('organization_id', context.organizationId);
   if (loadError)
      return NextResponse.json({ error: 'Unable to reorder issue templates.' }, { status: 500 });
   const ids = new Set((current ?? []).map((item) => item.id));
   if (
      parsed.data.orderedTemplateIds.length !== ids.size ||
      parsed.data.orderedTemplateIds.some((id) => !ids.has(id))
   )
      return NextResponse.json(
         { error: 'Template order must contain every current workspace template exactly once.' },
         { status: 409 }
      );
   const byId = new Map((current ?? []).map((item) => [item.id, item]));
   const rows = parsed.data.orderedTemplateIds.map((id, index) => ({
      ...byId.get(id)!,
      position: (index + 1) * 10,
   }));
   const { error } = await context.supabase.from('issue_templates').upsert(rows);
   if (error)
      return NextResponse.json({ error: 'Unable to reorder issue templates.' }, { status: 500 });
   return NextResponse.json({ templates: rows.map(dto) });
}
