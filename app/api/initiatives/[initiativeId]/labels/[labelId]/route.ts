import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin } from '@/lib/api/security';
import { authorizeInitiativeLabelAccess } from '@/lib/initiative-labels/server';
import { isUuid } from '@/lib/initiatives/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ initiativeId: string; labelId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });

   const { initiativeId, labelId } = await params;
   if (!isUuid(initiativeId) || !isUuid(labelId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeInitiativeLabelAccess(request, initiativeId, true, 'Unable to remove initiative label.');
   if ('response' in context) return context.response;

   const { data, error } = await context.supabase
      .from('initiative_labels')
      .delete()
      .eq('initiative_id', initiativeId)
      .eq('label_id', labelId)
      .eq('organization_id', context.organizationId)
      .select('label_id')
      .maybeSingle();

   if (error) return NextResponse.json({ error: 'Unable to remove initiative label.' }, { status: 500 });
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
