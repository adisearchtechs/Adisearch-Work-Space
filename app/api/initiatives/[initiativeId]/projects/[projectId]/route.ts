import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { authorizeInitiativeAccess, isUuid } from '@/lib/initiatives/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string; projectId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { initiativeId, projectId } = await params;
   if (!isUuid(initiativeId) || !isUuid(projectId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeInitiativeAccess(
      request,
      true,
      'Unable to remove project.',
      initiativeId
   );
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_projects')
      .delete()
      .eq('initiative_id', initiativeId)
      .eq('project_id', projectId)
      .eq('organization_id', context.organizationId)
      .select('project_id')
      .maybeSingle();
   if (error) return NextResponse.json({ error: 'Unable to remove project.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
