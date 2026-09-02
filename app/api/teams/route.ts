import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { createTeamSchema, type TeamDto } from '@/lib/teams/contracts';
import { authorizeTeamAccess } from '@/lib/teams/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   const context = await authorizeTeamAccess(request, false, 'Unable to load teams.');
   if ('response' in context) return context.response;

   const [teamsResult, membersResult, issuesResult, projectsResult, cyclesResult] = await Promise.all([
      context.supabase
         .from('teams')
         .select('id, name, key, issue_prefix, color, created_at, updated_at')
         .eq('organization_id', context.organizationId)
         .order('name'),
      context.supabase.from('team_members').select('team_id').eq('organization_id', context.organizationId),
      context.supabase.from('issues').select('team_id').eq('organization_id', context.organizationId),
      context.supabase.from('projects').select('team_id').eq('organization_id', context.organizationId),
      context.supabase.from('cycles').select('team_id').eq('organization_id', context.organizationId),
   ]);

   const error =
      teamsResult.error ??
      membersResult.error ??
      issuesResult.error ??
      projectsResult.error ??
      cyclesResult.error;
   if (error) return NextResponse.json({ error: 'Unable to load teams.' }, { status: 500 });

   const countByTeam = (rows: Array<{ team_id: string }> | null) => {
      const counts = new Map<string, number>();
      for (const row of rows ?? []) counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
      return counts;
   };
   const memberCounts = countByTeam(membersResult.data);
   const issueCounts = countByTeam(issuesResult.data);
   const projectCounts = countByTeam(projectsResult.data);
   const cycleCounts = countByTeam(cyclesResult.data);

   const teams: TeamDto[] = (teamsResult.data ?? []).map((team) => ({
      id: team.id,
      name: team.name,
      key: team.key,
      issuePrefix: team.issue_prefix,
      color: team.color,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      usage: {
         members: memberCounts.get(team.id) ?? 0,
         issues: issueCounts.get(team.id) ?? 0,
         projects: projectCounts.get(team.id) ?? 0,
         cycles: cycleCounts.get(team.id) ?? 0,
      },
   }));

   return NextResponse.json(
      { teams, canAdmin: context.role === 'owner' || context.role === 'admin' },
      { headers: { 'Cache-Control': 'private, no-store' } }
   );
}

export async function POST(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();
   if (!hasValidMutationOrigin(request)) {
      return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
   }

   let input: unknown;
   try {
      input = await readJsonBody(request);
   } catch (error) {
      const status = error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400;
      return NextResponse.json({ error: 'Invalid request body.' }, { status });
   }
   const parsed = createTeamSchema.safeParse(input);
   if (!parsed.success) return NextResponse.json({ error: 'Invalid team.' }, { status: 400 });

   const context = await authorizeTeamAccess(request, true, 'Unable to create team.');
   if ('response' in context) return context.response;

   const { data: team, error } = await context.supabase
      .from('teams')
      .insert({
         organization_id: context.organizationId,
         name: parsed.data.name,
         key: parsed.data.key,
         issue_prefix: parsed.data.issuePrefix,
         color: parsed.data.color,
      })
      .select('id, name, key, issue_prefix, color, created_at, updated_at')
      .single();

   if (error || !team) {
      if (error?.code === '23505') {
         return NextResponse.json({ error: 'That team key or issue prefix is already in use.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Unable to create team.' }, { status: 500 });
   }

   const { error: memberError } = await context.supabase.from('team_members').insert({
      team_id: team.id,
      organization_id: context.organizationId,
      user_id: context.userId,
   });
   if (memberError) {
      await context.supabase
         .from('teams')
         .delete()
         .eq('id', team.id)
         .eq('organization_id', context.organizationId);
      return NextResponse.json({ error: 'Unable to create team.' }, { status: 500 });
   }

   const dto: TeamDto = {
      id: team.id,
      name: team.name,
      key: team.key,
      issuePrefix: team.issue_prefix,
      color: team.color,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      usage: { members: 1, issues: 0, projects: 0, cycles: 0 },
   };
   return NextResponse.json({ team: dto }, { status: 201 });
}
