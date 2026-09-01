import { NextResponse, type NextRequest } from 'next/server';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { authorizeWorkspaceMemberAccess } from '@/lib/workspace-members/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeWorkspaceMemberAccess(request, false, 'Unable to load workspace members.');
   if ('response' in context) return context.response;

   const [membersResult, teamMembersResult, issuesResult] = await Promise.all([
      context.supabase
         .from('organization_members')
         .select('user_id, role, created_at')
         .eq('organization_id', context.organizationId)
         .order('created_at'),
      context.supabase
         .from('team_members')
         .select('user_id')
         .eq('organization_id', context.organizationId),
      context.supabase
         .from('issues')
         .select('creator_id')
         .eq('organization_id', context.organizationId),
   ]);

   const error = membersResult.error ?? teamMembersResult.error ?? issuesResult.error;
   if (error) return NextResponse.json({ error: 'Unable to load workspace members.' }, { status: 500 });

   const memberships = membersResult.data ?? [];
   const ids = memberships.map((member) => member.user_id);
   const profilesResult = ids.length
      ? await context.supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids)
      : { data: [], error: null };
   if (profilesResult.error) {
      return NextResponse.json({ error: 'Unable to load workspace members.' }, { status: 500 });
   }

   const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
   const countByUser = (rows: Array<{ user_id: string }> | null) => {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
      return counts;
   };
   const teamCounts = countByUser(teamMembersResult.data);
   const issueCounts = new Map<string, number>();
   for (const row of issuesResult.data ?? []) {
      issueCounts.set(row.creator_id, (issueCounts.get(row.creator_id) ?? 0) + 1);
   }

   const members: WorkspaceMemberDto[] = memberships.map((membership) => {
      const profile = profileById.get(membership.user_id);
      return {
         id: membership.user_id,
         displayName: profile?.display_name || 'Workspace member',
         avatarUrl: profile?.avatar_url ?? null,
         role: membership.role,
         joinedAt: membership.created_at,
         teamCount: teamCounts.get(membership.user_id) ?? 0,
         createdIssueCount: issueCounts.get(membership.user_id) ?? 0,
      };
   });

   return NextResponse.json(
      {
         members,
         currentUserId: context.userId,
         actorRole: context.role,
         canAdmin: context.role === 'owner' || context.role === 'admin',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}
