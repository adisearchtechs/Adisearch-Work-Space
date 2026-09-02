import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ORGANIZATION_SLUG = /^[a-z0-9-]{2,48}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isIssueSubscriptionUuid(value: string) {
   return UUID.test(value);
}

export async function authorizeIssueSubscriptionAccess(
   request: NextRequest,
   failureMessage: string
) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG.test(organizationSlug)) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }),
      };
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub ?? null;
   if (!userId) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }),
      };
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: failureMessage }, { status: 500 }),
      };
   }
   if (!organization) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      };
   }

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: failureMessage }, { status: 500 }),
      };
   }
   if (!membership) {
      return {
         ok: false as const,
         response: NextResponse.json({ error: 'Not found.' }, { status: 404 }),
      };
   }

   return {
      ok: true as const,
      supabase,
      userId,
      organizationId: organization.id,
      organizationSlug,
   };
}
