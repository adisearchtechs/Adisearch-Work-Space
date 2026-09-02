import { NextResponse, type NextRequest } from 'next/server';
import type { TeamDocumentDto } from '@/lib/team-documents/contracts';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEAM_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

export const TEAM_DOCUMENT_SELECT =
   'id, team_id, title, body, pinned, created_by, created_at, updated_at' as const;

type TeamDocumentRow = Pick<
   Database['public']['Tables']['team_documents']['Row'],
   'id' | 'team_id' | 'title' | 'body' | 'pinned' | 'created_by' | 'created_at' | 'updated_at'
>;

export function isTeamDocumentUuid(value: string) {
   return UUID_PATTERN.test(value);
}

export function toTeamDocumentDto(row: TeamDocumentRow): TeamDocumentDto {
   return {
      id: row.id,
      teamId: row.team_id,
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
   };
}

export async function authorizeTeamDocumentAccess(
   request: NextRequest,
   teamReference: string,
   requireWrite: boolean,
   failureMessage: string
) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG_PATTERN.test(organizationSlug)) {
      return { ok: false, response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }) } as const;
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub;
   if (!userId) {
      return { ok: false, response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) } as const;
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return { ok: false, response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!organization) {
      return { ok: false, response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
   }

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return { ok: false, response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!membership) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) } as const;
   }
   if (requireWrite && membership.role === 'guest') {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) } as const;
   }

   const teamQuery = supabase
      .from('teams')
      .select('id, name, key, color')
      .eq('organization_id', organization.id);
   const upperReference = teamReference.toUpperCase();
   const { data: team, error: teamError } = isTeamDocumentUuid(teamReference)
      ? await teamQuery.eq('id', teamReference).maybeSingle()
      : TEAM_KEY_PATTERN.test(upperReference)
        ? await teamQuery.eq('key', upperReference).maybeSingle()
        : { data: null, error: null };

   if (teamError) {
      return { ok: false, response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!team) {
      return { ok: false, response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
   }

   return {
      ok: true,
      supabase,
      organizationId: organization.id,
      userId,
      role: membership.role,
      team,
   } as const;
}
