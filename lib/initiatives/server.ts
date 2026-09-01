import { NextResponse, type NextRequest } from 'next/server';
import type { InitiativeDto, InitiativeOwnerDto } from '@/lib/initiatives/contracts';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

export const INITIATIVE_SELECT =
   'id, name, description, icon, status, priority, owner_id, target, health, created_at, updated_at' as const;

type InitiativeRow = Pick<
   Database['public']['Tables']['initiatives']['Row'],
   | 'id'
   | 'name'
   | 'description'
   | 'icon'
   | 'status'
   | 'priority'
   | 'owner_id'
   | 'target'
   | 'health'
   | 'created_at'
   | 'updated_at'
>;

type ProfileRow = Pick<
   Database['public']['Tables']['profiles']['Row'],
   'id' | 'display_name' | 'avatar_url'
>;

export function isUuid(value: string) {
   return UUID_PATTERN.test(value);
}

export function toInitiativeDto(
   row: InitiativeRow,
   projectIds: string[],
   profile?: ProfileRow
): InitiativeDto {
   const owner: InitiativeOwnerDto | null = row.owner_id
      ? {
           id: row.owner_id,
           displayName: profile?.display_name || 'Workspace member',
           avatarUrl: profile?.avatar_url ?? null,
        }
      : null;

   return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      status: row.status as InitiativeDto['status'],
      priority: row.priority,
      target: row.target,
      health: row.health as InitiativeDto['health'],
      owner,
      projectIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
   };
}

export async function authorizeInitiativeAccess(
   request: NextRequest,
   requireWrite: boolean,
   failureMessage: string,
   initiativeId?: string
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

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
   }
   if (!membership || (requireWrite && membership.role === 'guest')) {
      return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) } as const;
   }

   if (initiativeId) {
      const { data: initiative, error: initiativeError } = await supabase
         .from('initiatives')
         .select('id')
         .eq('id', initiativeId)
         .eq('organization_id', organization.id)
         .maybeSingle();
      if (initiativeError) {
         return { response: NextResponse.json({ error: failureMessage }, { status: 500 }) } as const;
      }
      if (!initiative) {
         return { response: NextResponse.json({ error: 'Not found.' }, { status: 404 }) } as const;
      }
   }

   return {
      supabase,
      organizationId: organization.id,
      userId,
      role: membership.role,
   } as const;
}

export async function loadInitiatives(
   supabase: Awaited<ReturnType<typeof createClient>>,
   organizationId: string,
   initiativeId?: string
) {
   let query = supabase
      .from('initiatives')
      .select(INITIATIVE_SELECT)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
   if (initiativeId) query = query.eq('id', initiativeId);

   const { data: rows, error } = await query;
   if (error) throw error;
   const initiatives = rows ?? [];
   if (initiatives.length === 0) return [];

   const initiativeIds = initiatives.map((initiative) => initiative.id);
   const ownerIds = [...new Set(initiatives.flatMap((initiative) => initiative.owner_id ?? []))];
   const [{ data: assignments, error: assignmentError }, profileResult] = await Promise.all([
      supabase
         .from('initiative_projects')
         .select('initiative_id, project_id')
         .eq('organization_id', organizationId)
         .in('initiative_id', initiativeIds),
      ownerIds.length > 0
         ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', ownerIds)
         : Promise.resolve({ data: [] as ProfileRow[], error: null }),
   ]);
   if (assignmentError || profileResult.error) throw assignmentError ?? profileResult.error;

   const projectsByInitiative = new Map<string, string[]>();
   for (const assignment of assignments ?? []) {
      const current = projectsByInitiative.get(assignment.initiative_id) ?? [];
      current.push(assignment.project_id);
      projectsByInitiative.set(assignment.initiative_id, current);
   }
   const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));

   return initiatives.map((initiative) =>
      toInitiativeDto(
         initiative,
         projectsByInitiative.get(initiative.id) ?? [],
         initiative.owner_id ? profiles.get(initiative.owner_id) : undefined
      )
   );
}
