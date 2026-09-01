import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

export function isUuid(value: string) {
   return UUID_PATTERN.test(value);
}

export async function authorizeProjectLabelAccess(
   request: NextRequest,
   projectId: string,
   requireWrite: boolean,
   failureMessage: string
) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG_PATTERN.test(organizationSlug)) {
      return { response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }) } as const;
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub;
   if (!userId) {
      return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) } as const;
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!organization) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
   }

   const [{ data: membership, error: membershipError }, { data: project, error: projectError }] =
      await Promise.all([
         supabase
            .from('organization_members')
            .select('role')
            .eq('organization_id', organization.id)
            .eq('user_id', userId)
            .maybeSingle(),
         supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('organization_id', organization.id)
            .maybeSingle(),
      ]);

   if (membershipError || projectError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!membership || (requireWrite && membership.role === 'guest')) {
      return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) } as const;
   }
   if (!project) {
      return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
   }

   return { supabase, organizationId: organization.id } as const;
}
