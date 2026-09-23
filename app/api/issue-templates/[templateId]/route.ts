import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateIssueTemplateSchema } from '@/lib/issue-templates/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeWorkspaceMemberAccess, isUuid } from '@/lib/workspace-members/server';

const unavailable = () =>
   NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ templateId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request))
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { templateId } = await params;
   if (!isUuid(templateId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      return NextResponse.json(
         { error: 'Invalid request body.' },
         { status: error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400 }
      );
   }
   const parsed = updateIssueTemplateSchema.safeParse(input);
   if (!parsed.success)
      return NextResponse.json({ error: 'Invalid issue template.' }, { status: 400 });
   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to update issue template.'
   );
   if ('response' in context) return context.response;
   const { data, error } = await context.supabase
      .from('issue_templates')
      .update(parsed.data)
      .eq('id', templateId)
      .eq('organization_id', context.organizationId)
      .select('*')
      .maybeSingle();
   if (error?.code === '23505')
      return NextResponse.json(
         { error: 'A template with that name already exists.' },
         { status: 409 }
      );
   if (error)
      return NextResponse.json({ error: 'Unable to update issue template.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return NextResponse.json({
      template: { ...data, createdAt: data.created_at, updatedAt: data.updated_at },
   });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ templateId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request))
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { templateId } = await params;
   if (!isUuid(templateId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   const context = await authorizeWorkspaceMemberAccess(
      request,
      true,
      'Unable to delete issue template.'
   );
   if ('response' in context) return context.response;
   const { data, error } = await context.supabase
      .from('issue_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', context.organizationId)
      .select('id')
      .maybeSingle();
   if (error)
      return NextResponse.json({ error: 'Unable to delete issue template.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   return new NextResponse(null, { status: 204 });
}
