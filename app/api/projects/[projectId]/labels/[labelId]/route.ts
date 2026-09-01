import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { authorizeProjectLabelAccess, isUuid } from '@/lib/project-labels/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string; labelId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });

   const { projectId, labelId } = await params;
   if (!isUuid(projectId) || !isUuid(labelId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeProjectLabelAccess(request, projectId, true, 'Unable to remove project label.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('project_labels')
      .delete()
      .eq('project_id', projectId)
      .eq('label_id', labelId)
      .eq('organization_id', context.organizationId)
      .select('label_id')
      .maybeSingle();

   if (error) return NextResponse.json({ error: 'Unable to remove project label.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
