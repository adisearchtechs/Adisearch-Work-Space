import { NextResponse, type NextRequest } from 'next/server';
import { createIssueSchema, type IssueDto } from '@/lib/issues/contracts';
import { hasValidMutationOrigin, readJsonBody } from '@/lib/api/security';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type IssueRow = {
   id: string;
   issue_number: number;
   title: string;
   description: string;
   status_id: string;
   priority: IssueDto['priorityId'];
   creator_id: string;
   created_at: string;
   updated_at: string;
   cycle_id: string | null;
   rank: string;
   due_date: string | null;
   team_id: string;
   project_id: string | null;
   assignee_id: string | null;
};

type AssigneeProfile = { id: string; display_name: string | null; avatar_url: string | null };

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

async function authenticatedClient() {
   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const claims = claimsData?.claims;
   return { supabase, userId: claims?.sub ?? null };
}

function toDto(
   row: IssueRow,
   statusById: Map<string, string>,
   prefixByTeamId: Map<string, string>,
   assigneeById: Map<string, AssigneeProfile>
): IssueDto {
   const assignee = row.assignee_id ? assigneeById.get(row.assignee_id) : undefined;
   return {
      id: row.id,
      identifier: `${prefixByTeamId.get(row.team_id) ?? 'ISS'}-${row.issue_number}`,
      title: row.title,
      description: row.description,
      statusId: statusById.get(row.status_id) ?? 'to-do',
      priorityId: row.priority,
      creatorId: row.creator_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cycleId: row.cycle_id ?? '',
      rank: row.rank,
      dueDate: row.due_date ?? undefined,
      projectId: row.project_id,
      assignee: row.assignee_id
         ? {
              id: row.assignee_id,
              displayName: assignee?.display_name || 'Workspace member',
              avatarUrl: assignee?.avatar_url ?? null,
           }
         : null,
   };
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !/^[a-z0-9-]{2,48}$/.test(organizationSlug)) {
      return NextResponse.json({ error: 'Invalid organization.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: organization } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();

   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const [
      { data: teams, error: teamsError },
      { data: statuses, error: statusesError },
      { data: issues, error: issuesError },
   ] = await Promise.all([
      supabase.from('teams').select('id, issue_prefix').eq('organization_id', organization.id),
      supabase.from('statuses').select('id, slug').eq('organization_id', organization.id),
      supabase
         .from('issues')
         .select(
            'id, issue_number, title, description, status_id, priority, creator_id, created_at, updated_at, cycle_id, rank, due_date, team_id, project_id, assignee_id'
         )
         .eq('organization_id', organization.id)
         .order('rank', { ascending: false })
         .limit(500),
   ]);

   if (teamsError || statusesError || issuesError) {
      return NextResponse.json({ error: 'Unable to load issues.' }, { status: 500 });
   }

   const issueRows = (issues ?? []) as IssueRow[];
   const assigneeIds = [
      ...new Set(issueRows.flatMap((issue) => (issue.assignee_id ? [issue.assignee_id] : []))),
   ];
   const profilesResult = assigneeIds.length
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', assigneeIds)
      : { data: [], error: null };
   if (profilesResult.error) {
      return NextResponse.json({ error: 'Unable to load issues.' }, { status: 500 });
   }

   const statusById = new Map((statuses ?? []).map((item) => [item.id, item.slug]));
   const prefixByTeamId = new Map((teams ?? []).map((item) => [item.id, item.issue_prefix]));
   const assigneeById = new Map(
      ((profilesResult.data ?? []) as AssigneeProfile[]).map((profile) => [profile.id, profile])
   );
   const result = issueRows.map((issue) =>
      toDto(issue, statusById, prefixByTeamId, assigneeById)
   );

   return NextResponse.json(
      { issues: result },
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

   const parsed = createIssueSchema.safeParse(input);
   if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid issue data.' }, { status: 400 });
   }

   const { supabase, userId } = await authenticatedClient();
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: organization } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', parsed.data.organizationSlug)
      .maybeSingle();
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const [{ data: team, error: teamError }, { data: issueStatus, error: statusError }] =
      await Promise.all([
         supabase
            .from('teams')
            .select('id, issue_prefix')
            .eq('organization_id', organization.id)
            .eq('key', parsed.data.teamKey)
            .maybeSingle(),
         supabase
            .from('statuses')
            .select('id, slug')
            .eq('organization_id', organization.id)
            .eq('slug', parsed.data.statusSlug)
            .maybeSingle(),
      ]);
   if (teamError || statusError) {
      return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
   }
   if (!team || !issueStatus)
      return NextResponse.json({ error: 'Invalid workflow.' }, { status: 400 });

   if (parsed.data.projectId) {
      const { data: project, error: projectError } = await supabase
         .from('projects')
         .select('id')
         .eq('organization_id', organization.id)
         .eq('id', parsed.data.projectId)
         .maybeSingle();
      if (projectError) {
         return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
      }
      if (!project) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 });
   }

   const { data: issue, error } = await supabase
      .from('issues')
      .insert({
         organization_id: organization.id,
         team_id: team.id,
         title: parsed.data.title,
         description: parsed.data.description,
         status_id: issueStatus.id,
         priority: parsed.data.priority,
         creator_id: userId,
         project_id: parsed.data.projectId ?? null,
      })
      .select(
         'id, issue_number, title, description, status_id, priority, creator_id, created_at, updated_at, cycle_id, rank, due_date, team_id, project_id, assignee_id'
      )
      .single();

   if (error || !issue) {
      return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
   }

   const dto = toDto(
      issue as IssueRow,
      new Map([[issueStatus.id, issueStatus.slug]]),
      new Map([[team.id, team.issue_prefix]]),
      new Map()
   );
   return NextResponse.json({ issue: dto }, { status: 201 });
}
