import { NextResponse, type NextRequest } from 'next/server';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import {
   createProjectSchema,
   type ProjectDto,
   type ProjectLeadDto,
   type ProjectStatus,
   type ProjectTeamDto,
} from '@/lib/projects/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type ProjectRow = {
   id: string;
   team_id: string;
   name: string;
   description: string;
   status: ProjectStatus;
   lead_id: string | null;
   target_date: string | null;
   created_at: string;
};

type ProfileRow = {
   id: string;
   display_name: string | null;
   avatar_url: string | null;
   timezone: string;
   created_at: string;
};

type ProjectIssueRow = {
   project_id: string | null;
   status_id: string;
};

type StatusRow = {
   id: string;
   category: 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function authenticatedClient() {
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   return { supabase, userId: claimsData?.claims?.sub ?? null };
}

function toDto(
   row: ProjectRow,
   teamKeyById: Map<string, string>,
   profileById: Map<string, ProfileRow>,
   percentCompleteByProjectId: Map<string, number>
): ProjectDto {
   const profile = row.lead_id ? profileById.get(row.lead_id) : undefined;
   const lead: ProjectLeadDto | null =
      row.lead_id && profile
         ? {
              id: row.lead_id,
              displayName: profile.display_name || 'Workspace member',
              avatarUrl: profile.avatar_url,
              timezone: profile.timezone,
              joinedAt: profile.created_at,
           }
         : null;

   return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      percentComplete: percentCompleteByProjectId.get(row.id) ?? 0,
      teamKey: teamKeyById.get(row.team_id) ?? 'UNKNOWN',
      createdAt: row.created_at,
      targetDate: row.target_date,
      lead,
   };
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !/^[a-z0-9-]{2,48}$/.test(organizationSlug)) {
      return NextResponse.json({ error: 'Invalid organization.' }, { status: 400 });
   }

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();

   if (organizationError) {
      return NextResponse.json({ error: 'Unable to load projects.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const [
      { data: teams, error: teamsError },
      { data: projects, error: projectsError },
      { data: projectIssues, error: projectIssuesError },
      { data: statuses, error: statusesError },
   ] = await Promise.all([
      supabase
         .from('teams')
         .select('id, key, name, color')
         .eq('organization_id', organization.id)
         .order('name'),
      supabase
         .from('projects')
         .select('id, team_id, name, description, status, lead_id, target_date, created_at')
         .eq('organization_id', organization.id)
         .order('created_at', { ascending: false })
         .limit(500),
      supabase
         .from('issues')
         .select('project_id, status_id')
         .eq('organization_id', organization.id)
         .not('project_id', 'is', null)
         .limit(5000),
      supabase
         .from('statuses')
         .select('id, category')
         .eq('organization_id', organization.id)
         .limit(100),
   ]);

   if (teamsError || projectsError || projectIssuesError || statusesError) {
      return NextResponse.json({ error: 'Unable to load projects.' }, { status: 500 });
   }

   const projectRows = (projects ?? []) as ProjectRow[];
   const leadIds = [...new Set(projectRows.flatMap((project) => project.lead_id ?? []))];
   let profileRows: ProfileRow[] = [];

   if (leadIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
         .from('profiles')
         .select('id, display_name, avatar_url, timezone, created_at')
         .in('id', leadIds);
      if (profilesError) {
         return NextResponse.json({ error: 'Unable to load projects.' }, { status: 500 });
      }
      profileRows = (profiles ?? []) as ProfileRow[];
   }

   const projectTeams = (teams ?? []) as ProjectTeamDto[];
   const teamKeyById = new Map(projectTeams.map((team) => [team.id, team.key]));
   const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));
   const statusCategoryById = new Map(
      ((statuses ?? []) as StatusRow[]).map((status) => [status.id, status.category])
   );
   const progressCountsByProjectId = new Map<string, { completed: number; countable: number }>();
   for (const issue of (projectIssues ?? []) as ProjectIssueRow[]) {
      if (!issue.project_id) continue;
      const category = statusCategoryById.get(issue.status_id);
      if (category === 'canceled') continue;
      const counts = progressCountsByProjectId.get(issue.project_id) ?? {
         completed: 0,
         countable: 0,
      };
      counts.countable += 1;
      if (category === 'completed') counts.completed += 1;
      progressCountsByProjectId.set(issue.project_id, counts);
   }
   const percentCompleteByProjectId = new Map(
      [...progressCountsByProjectId].map(([projectId, counts]) => [
         projectId,
         counts.countable === 0 ? 0 : Math.round((counts.completed / counts.countable) * 100),
      ])
   );

   return NextResponse.json(
      {
         projects: projectRows.map((project) =>
            toDto(project, teamKeyById, profileById, percentCompleteByProjectId)
         ),
         teams: projectTeams,
      },
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

   const parsed = createProjectSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid project data.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', parsed.data.organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const [
      { data: team, error: teamError },
      { data: profile, error: profileError },
      { data: membership, error: membershipError },
   ] = await Promise.all([
      supabase
         .from('teams')
         .select('id, key, name, color')
         .eq('organization_id', organization.id)
         .eq('key', parsed.data.teamKey)
         .maybeSingle(),
      supabase
         .from('profiles')
         .select('id, display_name, avatar_url, timezone, created_at')
         .eq('id', userId)
         .maybeSingle(),
      supabase
         .from('organization_members')
         .select('role')
         .eq('organization_id', organization.id)
         .eq('user_id', userId)
         .maybeSingle(),
   ]);

   if (teamError || profileError || membershipError) {
      return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
   }
   if (!membership || membership.role === 'guest') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
   }
   if (!team) return NextResponse.json({ error: 'Invalid team.' }, { status: 400 });

   const { data: project, error } = await supabase
      .from('projects')
      .insert({
         organization_id: organization.id,
         team_id: team.id,
         name: parsed.data.name,
         description: parsed.data.description ?? '',
         status: parsed.data.status,
         lead_id: userId,
         target_date: parsed.data.targetDate ?? null,
      })
      .select('id, team_id, name, description, status, lead_id, target_date, created_at')
      .single();

   if (error || !project) {
      return NextResponse.json({ error: 'Unable to create project.' }, { status: 500 });
   }

   const teamDto = team as ProjectTeamDto;
   const profileRows = profile ? ([profile] as ProfileRow[]) : [];
   return NextResponse.json(
      {
         project: toDto(
            project as ProjectRow,
            new Map([[teamDto.id, teamDto.key]]),
            new Map(profileRows.map((item) => [item.id, item])),
            new Map([[project.id, 0]])
         ),
      },
      { status: 201 }
   );
}
