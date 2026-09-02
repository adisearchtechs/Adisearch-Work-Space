import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createTeamDocumentSchema } from '@/lib/team-documents/contracts';
import {
   authorizeTeamDocumentAccess,
   TEAM_DOCUMENT_SELECT,
   toTeamDocumentDto,
} from '@/lib/team-documents/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   const { teamId } = await params;
   const context = await authorizeTeamDocumentAccess(
      request,
      teamId,
      false,
      'Unable to load team documents.'
   );
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('team_documents')
      .select(TEAM_DOCUMENT_SELECT)
      .eq('organization_id', context.organizationId)
      .eq('team_id', context.team.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(200);
   if (error) {
      return NextResponse.json({ error: 'Unable to load team documents.' }, { status: 500 });
   }

   return NextResponse.json(
      {
         documents: (data ?? []).map(toTeamDocumentDto),
         canWrite: context.role !== 'guest',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   const { teamId } = await params;
   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = createTeamDocumentSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid team document.' }, { status: 400 });
   }

   const context = await authorizeTeamDocumentAccess(
      request,
      teamId,
      true,
      'Unable to create team document.'
   );
   if (!context.ok) return context.response;

   const { data, error } = await context.supabase
      .from('team_documents')
      .insert({
         organization_id: context.organizationId,
         team_id: context.team.id,
         created_by: context.userId,
         title: parsed.data.title,
         body: parsed.data.body,
         pinned: parsed.data.pinned,
      })
      .select(TEAM_DOCUMENT_SELECT)
      .single();
   if (error || !data) {
      return NextResponse.json({ error: 'Unable to create team document.' }, { status: 500 });
   }

   return NextResponse.json({ document: toTeamDocumentDto(data) }, { status: 201 });
}
