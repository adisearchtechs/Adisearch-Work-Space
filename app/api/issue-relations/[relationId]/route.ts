import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { authorizeIssueRelationAccess, UUID_PATTERN } from '@/lib/issue-relations/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ relationId: string }> }
) {
   if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
   }
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { relationId } = await params;
   if (!UUID_PATTERN.test(relationId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeIssueRelationAccess(request, true);
   if (!context.ok) return context.response;

   const { error, count } = await context.supabase
      .from('issue_relations')
      .delete({ count: 'exact' })
      .eq('id', relationId)
      .eq('organization_id', context.organizationId);
   if (error) {
      return NextResponse.json({ error: 'Unable to remove issue relationship.' }, { status: 500 });
   }
   if (!count) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
