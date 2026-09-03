import { NextResponse, type NextRequest } from 'next/server';
import { createIssueSchema, type IssueDto, type IssueLabelDto } from '@/lib/issues/contracts';
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
   milestone_id: string | null;
   assignee_id: string | null;
};

type AssigneeProfile = { id: string; display_name: string | null; avatar_url: string | null };
type LabelRow = { id: string; name: string; color: string };
type IssueLabelRow = { issue_id: string; label_id: string };

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
   assigneeById: Map<string, AssigneeProfile>,
   labels: IssueLabelDto[] = []
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
      milestoneId: row.milestone_id,
      assignee: row.assignee_id
         ? {
              id: row.assignee_id,
              displayName: assignee?.display_name || 'Workspace member',
              avatarUrl: assignee?.avatar_url ?? null,
           }
         : null,
      labels,
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
            'id, issue_number, title, description, status_id, priority, creator_id, created_at, updated_at, cycle_id, rank, due_date, team_id, project_id, milestone_id, assignee_id'
         )
         .eq('organization_id', organization.id)
         .order('rank', { ascending: false })
         .limit(500),
   ]);

   if (teamsError || statusesError || issuesError) {
      return NextResponse.json({ error: 'Unable to load issues.' }, { status: 500 });
   }

   const issueRows = (issues ?? []) as IssueRow[];
   const issueIds = issueRows.map((issue) => issue.id);
   const assigneeIds = [
      ...new Set(issueRows.flatMap((issue) => (issue.assignee_id ? [issue.assignee_id] : []))),
   ];

   const [profilesResult, issueLabelsResult] = await Promise.all([
      assigneeIds.length
         ? supabase.from('profiles').select('id, display_name, avatar_url').in('id', assigneeIds)
         : Promise.resolve({ data: [], error: null }),
      issueIds.length
         ? supabase
              .from('issue_labels')
              .select('issue_id, label_id')
              .eq('organization_id', organization.id)
              .in('issue_id', issueIds)
         : Promise.resolve({ data: [], error: null }),
   ]);
   if (profilesResult.error || issueLabelsResult.error) {
      return NextResponse.json({ error: 'Unable to load issues.' }, { status: 500 });
   }

   const issueLabelRows = (issueLabelsResult.data ?? []) as IssueLabelRow[];
   const labelIds = [...new Set(issueLabelRows.map((row) => row.label_id))];
   const labelsResult = labelIds.length
      ? await supabase
           .from('labels')
           .select('id, name, color')
           .eq('organization_id', organization.id)
           .in('id', labelIds)
      : { data: [], error: null };
   if (labelsResult.error) {
      return NextResponse.json({ error: 'Unable to load issues.' }, { status: 500 });
   }

   const statusById = new Map((statuses ?? []).map((item) => [item.id, item.slug]));
   const prefixByTeamId = new Map((teams ?? []).map((item) => [item.id, item.issue_prefix]));
   const assigneeById = new Map(
      ((profilesResult.data ?? []) as AssigneeProfile[]).map((profile) => [profile.id, profile])
   );
   const labelById = new Map(
      ((labelsResult.data ?? []) as LabelRow[]).map((label) => [label.id, label])
   );
   const labelsByIssueId = new Map<string, IssueLabelDto[]>();
   for (const link of issueLabelRows) {
      const label = labelById.get(link.label_id);
      if (!label) continue;
      const current = labelsByIssueId.get(link.issue_id) ?? [];
      current.push({ id: label.id, name: label.name, color: label.color });
      labelsByIssueId.set(link.issue_id, current);
   }

   const result = issueRows.map((issue) =>
      toDto(
         issue,
         statusById,
         prefixByTeamId,
         assigneeById,
         labelsByIssueId.get(issue.id) ?? []
      )
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

   const { data: actorMembership, error: actorMembershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (actorMembershipError) {
      return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
   }
   if (!actorMembership || actorMembership.role === 'guest') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
   }

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

   if (parsed.data.milestoneId) {
      const { data: milestone, error: milestoneError } = await supabase
         .from('project_milestones')
         .select('id')
         .eq('organization_id', organization.id)
         .eq('project_id', parsed.data.projectId!)
         .eq('id', parsed.data.milestoneId)
         .maybeSingle();
      if (milestoneError) {
         return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
      }
      if (!milestone) return NextResponse.json({ error: 'Invalid milestone.' }, { status: 400 });
   }

   let assigneeProfile: AssigneeProfile | null = null;
   if (parsed.data.assigneeId) {
      const [{ data: assigneeMembership, error: assigneeMembershipError }, profileResult] =
         await Promise.all([
            supabase
               .from('organization_members')
               .select('user_id')
               .eq('organization_id', organization.id)
               .eq('user_id', parsed.data.assigneeId)
               .maybeSingle(),
            supabase
               .from('profiles')
               .select('id, display_name, avatar_url')
               .eq('id', parsed.data.assigneeId)
               .maybeSingle(),
         ]);
      if (assigneeMembershipError || profileResult.error) {
         return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
      }
      if (!assigneeMembership) {
         return NextResponse.json({ error: 'Invalid assignee.' }, { status: 400 });
      }
      assigneeProfile = (profileResult.data as AssigneeProfile | null) ?? {
         id: parsed.data.assigneeId,
         display_name: null,
         avatar_url: null,
      };
   }

   const normalizedLabelIds = [...new Set(parsed.data.labelIds)];
   let selectedLabels: IssueLabelDto[] = [];
   if (normalizedLabelIds.length > 0) {
      const { data: labelRows, error: labelsError } = await supabase
         .from('labels')
         .select('id, name, color')
         .eq('organization_id', organization.id)
         .in('id', normalizedLabelIds);
      if (labelsError) {
         return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
      }
      if ((labelRows ?? []).length !== normalizedLabelIds.length) {
         return NextResponse.json({ error: 'Invalid label.' }, { status: 400 });
      }
      selectedLabels = ((labelRows ?? []) as LabelRow[]).map((label) => ({
         id: label.id,
         name: label.name,
         color: label.color,
      }));
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
         milestone_id: parsed.data.milestoneId ?? null,
         assignee_id: parsed.data.assigneeId ?? null,
      })
      .select(
         'id, issue_number, title, description, status_id, priority, creator_id, created_at, updated_at, cycle_id, rank, due_date, team_id, project_id, milestone_id, assignee_id'
      )
      .single();

   if (error || !issue) {
      return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
   }

   if (normalizedLabelIds.length > 0) {
      const { error: labelLinkError } = await supabase.from('issue_labels').insert(
         normalizedLabelIds.map((labelId) => ({
            organization_id: organization.id,
            issue_id: issue.id,
            label_id: labelId,
         }))
      );
      if (labelLinkError) {
         await supabase
            .from('issues')
            .delete()
            .eq('organization_id', organization.id)
            .eq('id', issue.id);
         return NextResponse.json({ error: 'Unable to create issue.' }, { status: 500 });
      }
   }

   const assigneeById = new Map<string, AssigneeProfile>();
   if (assigneeProfile) assigneeById.set(assigneeProfile.id, assigneeProfile);
   const dto = toDto(
      issue as IssueRow,
      new Map([[issueStatus.id, issueStatus.slug]]),
      new Map([[team.id, team.issue_prefix]]),
      assigneeById,
      selectedLabels
   );
   return NextResponse.json({ issue: dto }, { status: 201 });
}