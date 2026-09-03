import { NextResponse, type NextRequest } from 'next/server';
import type {
   TeamDashboardAttentionReason,
   TeamDashboardHealth,
   TeamDashboardIssueDto,
   TeamDashboardProjectDto,
   TeamDashboardResponse,
} from '@/lib/team-dashboard/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { authorizeTeamAccess, isUuid } from '@/lib/teams/server';

type StatusCategory = TeamDashboardIssueDto['statusCategory'];
type IssuePriority = TeamDashboardIssueDto['priority'];

type StatusRow = {
   id: string;
   name: string;
   slug: string;
   category: StatusCategory;
};

type IssueRow = {
   id: string;
   team_id: string;
   issue_number: number;
   title: string;
   status_id: string;
   priority: IssuePriority;
   project_id: string | null;
   cycle_id: string | null;
   due_date: string | null;
};

type CycleRow = {
   id: string;
   name: string;
   starts_at: string;
   ends_at: string;
};

type ProjectRow = {
   id: string;
   team_id: string;
   name: string;
   status: TeamDashboardProjectDto['status'];
   target_date: string | null;
};

type ProjectUpdateRow = {
   project_id: string;
   health: TeamDashboardHealth | null;
   created_at: string;
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function datePlusDays(date: string, days: number) {
   const value = new Date(`${date}T00:00:00.000Z`);
   value.setUTCDate(value.getUTCDate() + days);
   return value.toISOString().slice(0, 10);
}

function isClosed(category: StatusCategory) {
   return category === 'completed' || category === 'canceled';
}

function attentionReason(
   issue: IssueRow,
   status: StatusRow | undefined,
   today: string,
   dueSoonThrough: string
): TeamDashboardAttentionReason | null {
   if (!status || isClosed(status.category)) return null;
   if (status.slug === 'blocked') return 'blocked';
   if (issue.due_date && issue.due_date < today) return 'overdue';
   if (issue.priority === 'urgent') return 'urgent';
   if (issue.due_date && issue.due_date >= today && issue.due_date <= dueSoonThrough) {
      return 'due-soon';
   }
   return null;
}

export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ teamId: string }> }
) {
   if (!isSupabaseConfigured()) return unavailable();

   const { teamId } = await params;
   if (!isUuid(teamId)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const context = await authorizeTeamAccess(
      request,
      false,
      'Unable to load team dashboard.',
      teamId
   );
   if ('response' in context) return context.response;

   const [teamResult, cyclesResult, statusesResult, teamIssuesResult, projectsResult] =
      await Promise.all([
         context.supabase
            .from('teams')
            .select('issue_prefix')
            .eq('organization_id', context.organizationId)
            .eq('id', teamId)
            .single(),
         context.supabase
            .from('cycles')
            .select('id, name, starts_at, ends_at')
            .eq('organization_id', context.organizationId)
            .eq('team_id', teamId)
            .order('starts_at', { ascending: false })
            .limit(200),
         context.supabase
            .from('statuses')
            .select('id, name, slug, category')
            .eq('organization_id', context.organizationId),
         context.supabase
            .from('issues')
            .select(
               'id, team_id, issue_number, title, status_id, priority, project_id, cycle_id, due_date'
            )
            .eq('organization_id', context.organizationId)
            .eq('team_id', teamId)
            .order('issue_number', { ascending: true })
            .limit(500),
         context.supabase
            .from('projects')
            .select('id, team_id, name, status, target_date')
            .eq('organization_id', context.organizationId)
            .limit(500),
      ]);

   const baseError =
      teamResult.error ??
      cyclesResult.error ??
      statusesResult.error ??
      teamIssuesResult.error ??
      projectsResult.error;
   if (baseError || !teamResult.data) {
      return NextResponse.json({ error: 'Unable to load team dashboard.' }, { status: 500 });
   }

   const statuses = (statusesResult.data ?? []) as StatusRow[];
   const teamIssues = (teamIssuesResult.data ?? []) as IssueRow[];
   const projects = (projectsResult.data ?? []) as ProjectRow[];
   const cycles = (cyclesResult.data ?? []) as CycleRow[];
   const ownedProjects = projects.filter((project) => project.team_id === teamId);
   const ownedProjectIds = ownedProjects.map((project) => project.id);

   const [projectIssuesResult, projectUpdatesResult] = ownedProjectIds.length
      ? await Promise.all([
           context.supabase
              .from('issues')
              .select(
                 'id, team_id, issue_number, title, status_id, priority, project_id, cycle_id, due_date'
              )
              .eq('organization_id', context.organizationId)
              .in('project_id', ownedProjectIds)
              .limit(1000),
           context.supabase
              .from('project_updates')
              .select('project_id, health, created_at')
              .eq('organization_id', context.organizationId)
              .eq('kind', 'update')
              .in('project_id', ownedProjectIds)
              .order('created_at', { ascending: false })
              .limit(1000),
        ])
      : [
           { data: [] as IssueRow[], error: null },
           { data: [] as ProjectUpdateRow[], error: null },
        ];

   if (projectIssuesResult.error || projectUpdatesResult.error) {
      return NextResponse.json({ error: 'Unable to load team dashboard.' }, { status: 500 });
   }

   const statusById = new Map(statuses.map((status) => [status.id, status]));
   const projectById = new Map(projects.map((project) => [project.id, project]));
   const today = new Date().toISOString().slice(0, 10);
   const dueSoonThrough = datePlusDays(today, 7);
   const currentCycle = cycles.find(
      (cycle) => cycle.starts_at <= today && cycle.ends_at >= today
   );

   const currentCycleIssues = currentCycle
      ? teamIssues.filter((issue) => issue.cycle_id === currentCycle.id)
      : [];
   const cycleCompleted = currentCycleIssues.filter(
      (issue) => statusById.get(issue.status_id)?.category === 'completed'
   ).length;
   const cycleStarted = currentCycleIssues.filter(
      (issue) => statusById.get(issue.status_id)?.category === 'started'
   ).length;
   const cycleCanceled = currentCycleIssues.filter(
      (issue) => statusById.get(issue.status_id)?.category === 'canceled'
   ).length;
   const cycleCountable = Math.max(0, currentCycleIssues.length - cycleCanceled);

   const openIssues = teamIssues.filter((issue) => {
      const category = statusById.get(issue.status_id)?.category;
      return category ? !isClosed(category) : true;
   });
   const completedIssues = teamIssues.filter(
      (issue) => statusById.get(issue.status_id)?.category === 'completed'
   );
   const blocked = openIssues.filter(
      (issue) => statusById.get(issue.status_id)?.slug === 'blocked'
   );
   const urgent = openIssues.filter((issue) => issue.priority === 'urgent');
   const overdue = openIssues.filter((issue) => issue.due_date && issue.due_date < today);
   const dueSoon = openIssues.filter(
      (issue) => issue.due_date && issue.due_date >= today && issue.due_date <= dueSoonThrough
   );

   const attentionRows = openIssues
      .map((issue) => ({
         issue,
         status: statusById.get(issue.status_id),
         reason: attentionReason(issue, statusById.get(issue.status_id), today, dueSoonThrough),
      }))
      .filter((entry) => entry.reason !== null) as Array<{
      issue: IssueRow;
      status: StatusRow | undefined;
      reason: TeamDashboardAttentionReason;
   }>;
   const reasonOrder: Record<TeamDashboardAttentionReason, number> = {
      blocked: 0,
      overdue: 1,
      urgent: 2,
      'due-soon': 3,
   };
   attentionRows.sort((a, b) => {
      const reasonDifference = reasonOrder[a.reason] - reasonOrder[b.reason];
      if (reasonDifference !== 0) return reasonDifference;
      if (a.issue.due_date && b.issue.due_date) {
         const dateDifference = a.issue.due_date.localeCompare(b.issue.due_date);
         if (dateDifference !== 0) return dateDifference;
      } else if (a.issue.due_date) {
         return -1;
      } else if (b.issue.due_date) {
         return 1;
      }
      return a.issue.issue_number - b.issue.issue_number;
   });

   const attention: TeamDashboardIssueDto[] = attentionRows
      .slice(0, 8)
      .map(({ issue, status, reason }) => {
         const project = issue.project_id ? projectById.get(issue.project_id) : undefined;
         return {
            id: issue.id,
            identifier: `${teamResult.data.issue_prefix}-${issue.issue_number}`,
            title: issue.title,
            priority: issue.priority,
            dueDate: issue.due_date,
            statusName: status?.name ?? 'Unknown status',
            statusCategory: status?.category ?? 'unstarted',
            project: project ? { id: project.id, name: project.name } : null,
            reason,
         };
      });

   const latestHealthByProject = new Map<string, ProjectUpdateRow>();
   for (const update of (projectUpdatesResult.data ?? []) as ProjectUpdateRow[]) {
      if (!latestHealthByProject.has(update.project_id)) {
         latestHealthByProject.set(update.project_id, update);
      }
   }
   const projectIssues = (projectIssuesResult.data ?? []) as IssueRow[];
   const projectDtos: TeamDashboardProjectDto[] = ownedProjects.map((project) => {
      const issues = projectIssues.filter((issue) => issue.project_id === project.id);
      const canceledCount = issues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'canceled'
      ).length;
      const completedCount = issues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'completed'
      ).length;
      const countable = Math.max(0, issues.length - canceledCount);
      const latestHealth = latestHealthByProject.get(project.id);
      return {
         id: project.id,
         name: project.name,
         status: project.status,
         targetDate: project.target_date,
         health: latestHealth?.health ?? null,
         healthUpdatedAt: latestHealth?.created_at ?? null,
         issueCount: issues.length,
         completedIssueCount: completedCount,
         progress: countable === 0 ? 0 : Math.round((completedCount / countable) * 100),
      };
   });
   const projectStatusOrder: Record<TeamDashboardProjectDto['status'], number> = {
      active: 0,
      planned: 1,
      paused: 2,
      completed: 3,
      canceled: 4,
   };
   projectDtos.sort((a, b) => {
      const statusDifference = projectStatusOrder[a.status] - projectStatusOrder[b.status];
      if (statusDifference !== 0) return statusDifference;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate) return -1;
      if (b.targetDate) return 1;
      return a.name.localeCompare(b.name);
   });

   const response: TeamDashboardResponse = {
      generatedAt: new Date().toISOString(),
      currentCycle: currentCycle
         ? {
              id: currentCycle.id,
              name: currentCycle.name,
              startDate: currentCycle.starts_at,
              endDate: currentCycle.ends_at,
              scope: currentCycleIssues.length,
              started: cycleStarted,
              completed: cycleCompleted,
              canceled: cycleCanceled,
              successRate:
                 cycleCountable === 0 ? 0 : Math.round((cycleCompleted / cycleCountable) * 100),
           }
         : null,
      work: {
         total: teamIssues.length,
         active: openIssues.length,
         completed: completedIssues.length,
         blocked: blocked.length,
         urgent: urgent.length,
         overdue: overdue.length,
         dueSoon: dueSoon.length,
         attention: attentionRows.length,
      },
      attention,
      projects: projectDtos,
   };

   return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, no-store' },
   });
}
