import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { updateTeamDocumentSchema } from '@/lib/team-documents/contracts';
import {
   authorizeTeamDocumentAccess,
   isTeamDocumentUuid,
   TEAM_DOCUMENT_SELECT,
   toTeamDocumentDto,
} from '@/lib/team-documents/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string; documentId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { teamId, documentId } = await params;
   if (!isTeamDocumentUuid(documentId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateTeamDocumentSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid team document.' }, { status: 400 });
   }

   const context = await authorizeTeamDocumentAccess(
      request,
      teamId,
      true,
      'Unable to update team document.'
   );
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('team_documents')
      .update(parsed.data)
      .eq('id', documentId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .select(TEAM_DOCUMENT_SELECT)
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to update team document.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({ document: toTeamDocumentDto(data) });
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string; documentId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { teamId, documentId } = await params;
   if (!isTeamDocumentUuid(documentId)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
   }

   const context = await authorizeTeamDocumentAccess(
      request,
      teamId,
      true,
      'Unable to delete team document.'
   );
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('team_documents')
      .delete()
      .eq('id', documentId)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .select('id')
      .maybeSingle();
   if (error) {
      return NextResponse.json({ error: 'Unable to delete team document.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return new NextResponse(null, { status: 204 });
}
