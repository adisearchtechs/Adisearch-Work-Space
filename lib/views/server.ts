import { NextResponse, type NextRequest } from 'next/server';
import {
   savedViewFilterSchema,
   type SavedViewDto,
   type SavedViewType,
} from '@/lib/views/contracts';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

export const SAVED_VIEW_SELECT =
   'id, organization_id, team_id, owner_id, name, description, icon, view_type, filter, created_at, updated_at' as const;

type SavedViewRow = {
   id: string;
   organization_id: string;
   team_id: string | null;
   owner_id: string;
   name: string;
   description: string;
   icon: string;
   view_type: SavedViewType;
   filter: unknown;
   created_at: string;
   updated_at: string;
};

type ViewRole = 'owner' | 'admin' | 'member' | 'guest';

export function isSavedViewUuid(value: string) {
   return UUID_PATTERN.test(value);
}

export function canManageSavedView(userId: string, role: ViewRole, ownerId: string) {
   return ownerId === userId || role === 'owner' || role === 'admin';
}

export function toSavedViewDto(
   row: SavedViewRow,
   owner: { display_name: string | null; avatar_url: string | null } | undefined,
   userId: string,
   role: ViewRole
): SavedViewDto {
   const parsedFilter = savedViewFilterSchema.safeParse(row.filter);
   return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      viewType: row.view_type,
      teamId: row.team_id,
      owner: {
         id: row.owner_id,
         displayName: owner?.display_name || 'Workspace member',
         avatarUrl: owner?.avatar_url ?? null,
      },
      filter: parsedFilter.success ? parsedFilter.data : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      canManage: canManageSavedView(userId, role, row.owner_id),
   };
}

export async function authorizeSavedViewAccess(
   request: NextRequest,
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

   return {
      ok: true,
      supabase,
      organizationId: organization.id,
      userId,
      role: membership.role as ViewRole,
   } as const;
}

export async function validateSavedViewTeam(
   context: Awaited<ReturnType<typeof authorizeSavedViewAccess>>,
   teamId: string | null | undefined,
   failureMessage: string
) {
   if (!context.ok || !teamId) return context.ok ? { ok: true } as const : context;
   const { data: team, error } = await context.supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('organization_id', context.organizationId)
      .maybeSingle();
   if (error) {
      return { ok: false, response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!team) {
      return { ok: false, response: NextResponse.json({ error: 'Invalid team.' }, { status: 400 }) } as const;
   }
   return { ok: true } as const;
}
