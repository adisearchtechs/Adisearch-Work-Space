import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AttachmentEntityType } from './contracts';

const ORGANIZATION_SLUG = /^[a-z0-9-]{2,48}$/;

export async function authorizeAttachmentAccess(request: NextRequest, requireWrite: boolean) {
   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG.test(organizationSlug)) {
      return { ok: false as const, response: NextResponse.json({ error: 'Invalid organization.' }, { status: 400 }) };
   }
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub ?? null;
   if (!userId) return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
   const { data: organization, error: organizationError } = await supabase.from('organizations').select('id').eq('slug', organizationSlug).maybeSingle();
   if (organizationError) return { ok: false as const, response: NextResponse.json({ error: 'Unable to authorize attachments.' }, { status: 500 }) };
   if (!organization) return { ok: false as const, response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   const { data: membership, error: membershipError } = await supabase.from('organization_members').select('role').eq('organization_id', organization.id).eq('user_id', userId).maybeSingle();
   if (membershipError) return { ok: false as const, response: NextResponse.json({ error: 'Unable to authorize attachments.' }, { status: 500 }) };
   if (!membership) return { ok: false as const, response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) };
   if (requireWrite && membership.role === 'guest') return { ok: false as const, response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
   return { ok: true as const, supabase, userId, role: membership.role, organizationId: organization.id, organizationSlug };
}

export async function entityExists(
   context: Awaited<ReturnType<typeof authorizeAttachmentAccess>> & { ok: true },
   entityType: AttachmentEntityType,
   entityId: string
) {
   if (entityType === 'issue') {
      const { data, error } = await context.supabase.from('issues').select('id').eq('organization_id', context.organizationId).eq('id', entityId).maybeSingle();
      return !error && Boolean(data);
   }
   if (entityType === 'project') {
      const { data, error } = await context.supabase.from('projects').select('id').eq('organization_id', context.organizationId).eq('id', entityId).maybeSingle();
      return !error && Boolean(data);
   }
   const { data, error } = await context.supabase.from('initiatives').select('id').eq('organization_id', context.organizationId).eq('id', entityId).maybeSingle();
   return !error && Boolean(data);
}
