import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   updateTeamSchema,
   type TeamDetailsDto,
   type TeamMemberDto,
} from '@/lib/teams/contracts';
import { authorizeTeamAccess, isUuid } from '@/lib/teams/server';
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
   if (!isUuid(teamId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeTeamAccess(request, false, 'Unable to load team.', teamId);
   if ('response' in context) return context.response;

   const [teamResult, membersResult, orgMembersResult, issuesResult, projectsResult, cyclesResult] =
      await Promise.all([
         context.supabase
            .from('teams')
            .select('id, name, key, issue_prefix, color, created_at, updated_at')
            .eq('id', teamId)
            .eq('organization_id', context.organizationId)
            .single(),
         context.supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', teamId)
            .eq('organization_id', context.organizationId),
         context.supabase
            .from('organization_members')
            .select('user_id, role')
            .eq('organization_id', context.organizationId),
         context.supabase.from('issues').select('id').eq('organization_id', context.organizationId).eq('team_id', teamId),
         context.supabase.from('projects').select('id').eq('organization_id', context.organizationId).eq('team_id', teamId),
         context.supabase.from('cycles').select('id').eq('organization_id', context.organizationId).eq('team_id', teamId),
      ]);

   const error =
      teamResult.error ??
      membersResult.error ??
      orgMembersResult.error ??
      issuesResult.error ??
      projectsResult.error ??
      cyclesResult.error;
   if (error || !teamResult.data) {
      return NextResponse.json({ error: 'Unable to load team.' }, { status: 500 });
   }

   const orgMembers = orgMembersResult.data ?? [];
   const userIds = orgMembers.map((member) => member.user_id);
   const profilesResult = userIds.length
      ? await context.supabase
           .from('profiles')
           .select('id, display_name, avatar_url')
           .in('id', userIds)
      : { data: [], error: null };
   if (profilesResult.error) {
      return NextResponse.json({ error: 'Unable to load team.' }, { status: 500 });
   }

   const profileById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
   const organizationMembers: TeamMemberDto[] = orgMembers.map((member) => {
      const profile = profileById.get(member.user_id);
      return {
         id: member.user_id,
         displayName: profile?.display_name || 'Workspace member',
         avatarUrl: profile?.avatar_url ?? null,
         role: member.role,
      };
   });
   const assigned = new Set((membersResult.data ?? []).map((member) => member.user_id));
   const members = organizationMembers.filter((member) => assigned.has(member.id));
   const team = teamResult.data;
   const result: TeamDetailsDto = {
      id: team.id,
      name: team.name,
      key: team.key,
      issuePrefix: team.issue_prefix,
      color: team.color,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      usage: {
         members: members.length,
         issues: issuesResult.data?.length ?? 0,
         projects: projectsResult.data?.length ?? 0,
         cycles: cyclesResult.data?.length ?? 0,
      },
      members,
      organizationMembers,
   };

   return NextResponse.json(
      { team: result, canAdmin: context.role === 'owner' || context.role === 'admin' },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   const { teamId } = await params;
   if (!isUuid(teamId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = updateTeamSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid team.' }, { status: 400 });

   const context = await authorizeTeamAccess(request, true, 'Unable to update team.', teamId);
   if ('response' in context) return context.response;

   const update: { name?: string; key?: string; issue_prefix?: string; color?: string } = {};
   if (parsed.data.name !== undefined) update.name = parsed.data.name;
   if (parsed.data.key !== undefined) update.key = parsed.data.key;
   if (parsed.data.issuePrefix !== undefined) update.issue_prefix = parsed.data.issuePrefix;
   if (parsed.data.color !== undefined) update.color = parsed.data.color;

   const { data, error } = await context.supabase
      .from('teams')
      .update(update)
      .eq('id', teamId)
      .eq('organization_id', context.organizationId)
      .select('id, name, key, issue_prefix, color, created_at, updated_at')
      .maybeSingle();
   if (error) {
      if (error.code === '23505') {
         return NextResponse.json({ error: 'That team key or issue prefix is already in use.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Unable to update team.' }, { status: 500 });
   }
   if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   return NextResponse.json({
      team: {
         id: data.id,
         name: data.name,
         key: data.key,
         issuePrefix: data.issue_prefix,
         color: data.color,
         createdAt: data.created_at,
         updatedAt: data.updated_at,
      },
   });
}
