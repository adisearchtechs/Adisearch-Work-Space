import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEAM_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

export function isCycleUuid(value: string) {
   return UUID_PATTERN.test(value);
}

export function cycleStatusForDates(startDate: string, endDate: string): 'upcoming' | 'current' | 'completed' {
   const today = new Date().toISOString().slice(0, 10);
   if (endDate < today) return 'completed';
   if (startDate > today) return 'upcoming';
   return 'current';
}

export async function authorizeCycleAccess(
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
      .select('id, name, key, issue_prefix, color')
      .eq('organization_id', organization.id);

   const { data: team, error: teamError } = isCycleUuid(teamReference)
      ? await teamQuery.eq('id', teamReference).maybeSingle()
      : TEAM_KEY_PATTERN.test(teamReference.toUpperCase())
        ? await teamQuery.eq('key', teamReference.toUpperCase()).maybeSingle()
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
