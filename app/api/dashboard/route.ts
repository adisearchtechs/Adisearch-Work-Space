import { NextResponse, type NextRequest } from 'next/server';
import type {
   WorkspaceDashboardAttentionReason,
   WorkspaceDashboardHealth,
   WorkspaceDashboardInitiativeDto,
   WorkspaceDashboardIssueDto,
   WorkspaceDashboardMilestoneDto,
   WorkspaceDashboardProjectDto,
   WorkspaceDashboardResponse,
   WorkspaceDashboardStatusCategory,
   WorkspaceDashboardTeamDto,
} from '@/lib/workspace-dashboard/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

type IssuePriority = WorkspaceDashboardIssueDto['priority'];
type ProjectStatus = WorkspaceDashboardProjectDto['status'];
type InitiativeStatus = WorkspaceDashboardInitiativeDto['status'];
type InitiativePriority = WorkspaceDashboardInitiativeDto['priority'];

type TeamRow = {
   id: string;
   key: string;
   name: string;
   color: string;
   issue_prefix: string;
};

type StatusRow = {
   id: string;
   name: string;
   slug: string;
   category: WorkspaceDashboardStatusCategory;
};

type IssueRow = {
   id: string;
   team_id: string;
   issue_number: number;
   title: string;
   status_id: string;
   priority: IssuePriority;
   project_id: string | null;
   milestone_id: string | null;
   due_date: string | null;
};

type ProjectRow = {
   id: string;
   team_id: string;
   name: string;
   status: ProjectStatus;
   target_date: string | null;
};

type ProjectUpdateRow = {
   project_id: string;
   health: WorkspaceDashboardHealth | null;
   created_at: string;
};

type MilestoneRow = {
   id: string;
   project_id: string;
   name: string;
   target_date: string | null;
   completed: boolean;
   position: number;
};

type InitiativeRow = {
   id: string;
   name: string;
   icon: string;
   status: InitiativeStatus;
   priority: InitiativePriority;
   target: string | null;
   health: WorkspaceDashboardHealth | 'no-update';
};

type InitiativeProjectRow = {
   initiative_id: string;
   project_id: string;
};

type InitiativeUpdateRow = {
   initiative_id: string;
   health: WorkspaceDashboardHealth | null;
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

function isClosed(category: WorkspaceDashboardStatusCategory | undefined) {
   return category === 'completed' || category === 'canceled';
}

function attentionReason(
   issue: IssueRow,
   status: StatusRow | undefined,
   today: string,
   dueSoonThrough: string
): WorkspaceDashboardAttentionReason | null {
   if (!status || isClosed(status.category)) return null;
   if (status.slug === 'blocked') return 'blocked';
   if (issue.due_date && issue.due_date < today) return 'overdue';
   if (issue.priority === 'urgent') return 'urgent';
   if (issue.due_date && issue.due_date >= today && issue.due_date <= dueSoonThrough) {
      return 'due-soon';
   }
   return null;
}

function healthOrder(health: WorkspaceDashboardHealth | null) {
   if (health === 'off-track') return 0;
   if (health === 'at-risk') return 1;
   if (health === null) return 2;
   return 3;
}

function projectStatusOrder(status: ProjectStatus) {
   if (status === 'active') return 0;
   if (status === 'planned') return 1;
   if (status === 'paused') return 2;
   if (status === 'completed') return 3;
   return 4;
}

function initiativeStatusOrder(status: InitiativeStatus) {
   if (status === 'active') return 0;
   if (status === 'planned') return 1;
   return 2;
}

function initiativePriorityOrder(priority: InitiativePriority) {
   if (priority === 'urgent') return 0;
   if (priority === 'high') return 1;
   if (priority === 'medium') return 2;
   if (priority === 'low') return 3;
   return 4;
}

export async function GET(request: NextRequest) {
   if (!isSupabaseConfigured()) return unavailable();

   const organizationSlug = request.nextUrl.searchParams.get('organization');
   if (!organizationSlug || !ORGANIZATION_SLUG_PATTERN.test(organizationSlug)) {
      return NextResponse.json({ error: 'Invalid organization.' }, { status: 400 });
   }

   const supabase = await createClient();
   const { data: claimsData } = await supabase.auth.getClaims();
   const userId = claimsData?.claims?.sub;
   if (!userId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

   const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', organizationSlug)
      .maybeSingle();
   if (organizationError) {
      return NextResponse.json({ error: 'Unable to load workspace dashboard.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();
   if (membershipError) {
      return NextResponse.json({ error: 'Unable to load workspace dashboard.' }, { status: 500 });
   }
   if (!membership) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

   const [
      teamsResult,
      statusesResult,
      issuesResult,
      projectsResult,
      projectUpdatesResult,
      milestonesResult,
      initiativesResult,
      initiativeProjectsResult,
      initiativeUpdatesResult,
   ] = await Promise.all([
      supabase
         .from('teams')
         .select('id, key, name, color, issue_prefix')
         .eq('organization_id', organization.id)
         .order('name')
         .limit(200),
      supabase
         .from('statuses')
         .select('id, name, slug, category')
         .eq('organization_id', organization.id),
      supabase
         .from('issues')
         .select(
            'id, team_id, issue_number, title, status_id, priority, project_id, milestone_id, due_date'
         )
         .eq('organization_id', organization.id)
         .order('created_at', { ascending: false })
         .limit(2000),
      supabase
         .from('projects')
         .select('id, team_id, name, status, target_date')
         .eq('organization_id', organization.id)
         .limit(500),
      supabase
         .from('project_updates')
         .select('project_id, health, created_at')
         .eq('organization_id', organization.id)
         .eq('kind', 'update')
         .order('created_at', { ascending: false })
         .limit(2000),
      supabase
         .from('project_milestones')
         .select('id, project_id, name, target_date, completed, position')
         .eq('organization_id', organization.id)
         .limit(1000),
      supabase
         .from('initiatives')
         .select('id, name, icon, status, priority, target, health')
         .eq('organization_id', organization.id)
         .limit(500),
      supabase
         .from('initiative_projects')
         .select('initiative_id, project_id')
         .eq('organization_id', organization.id)
         .limit(2000),
      supabase
         .from('initiative_updates')
         .select('initiative_id, health, created_at')
         .eq('organization_id', organization.id)
         .eq('kind', 'update')
         .order('created_at', { ascending: false })
         .limit(2000),
   ]);

   const readError =
      teamsResult.error ??
      statusesResult.error ??
      issuesResult.error ??
      projectsResult.error ??
      projectUpdatesResult.error ??
      milestonesResult.error ??
      initiativesResult.error ??
      initiativeProjectsResult.error ??
      initiativeUpdatesResult.error;
   if (readError) {
      return NextResponse.json({ error: 'Unable to load workspace dashboard.' }, { status: 500 });
   }

   const teams = (teamsResult.data ?? []) as TeamRow[];
   const statuses = (statusesResult.data ?? []) as StatusRow[];
   const issues = (issuesResult.data ?? []) as IssueRow[];
   const projects = (projectsResult.data ?? []) as ProjectRow[];
   const projectUpdates = (projectUpdatesResult.data ?? []) as ProjectUpdateRow[];
   const milestones = (milestonesResult.data ?? []) as MilestoneRow[];
   const initiatives = (initiativesResult.data ?? []) as InitiativeRow[];
   const initiativeProjects = (initiativeProjectsResult.data ?? []) as InitiativeProjectRow[];
   const initiativeUpdates = (initiativeUpdatesResult.data ?? []) as InitiativeUpdateRow[];

   const teamById = new Map(teams.map((team) => [team.id, team]));
   const teamDtoById = new Map<string, WorkspaceDashboardTeamDto>(
      teams.map((team) => [
         team.id,
         { id: team.id, key: team.key, name: team.name, color: team.color },
      ])
   );
   const statusById = new Map(statuses.map((status) => [status.id, status]));
   const projectById = new Map(projects.map((project) => [project.id, project]));
   const today = new Date().toISOString().slice(0, 10);
   const dueSoonThrough = datePlusDays(today, 7);

   const openIssues = issues.filter((issue) => !isClosed(statusById.get(issue.status_id)?.category));
   const completedIssues = issues.filter(
      (issue) => statusById.get(issue.status_id)?.category === 'completed'
   );

   const reasonOrder: Record<WorkspaceDashboardAttentionReason, number> = {
      blocked: 0,
      overdue: 1,
      urgent: 2,
      'due-soon': 3,
   };
   const attentionRows = openIssues
      .map((issue) => ({
         issue,
         status: statusById.get(issue.status_id),
         reason: attentionReason(issue, statusById.get(issue.status_id), today, dueSoonThrough),
      }))
      .filter((entry) => entry.reason !== null) as Array<{
      issue: IssueRow;
      status: StatusRow | undefined;
      reason: WorkspaceDashboardAttentionReason;
   }>;
   attentionRows.sort((a, b) => {
      const reasonDifference = reasonOrder[a.reason] - reasonOrder[b.reason];
      if (reasonDifference !== 0) return reasonDifference;
      if (a.issue.due_date && b.issue.due_date) {
         const dueDifference = a.issue.due_date.localeCompare(b.issue.due_date);
         if (dueDifference !== 0) return dueDifference;
      } else if (a.issue.due_date) {
         return -1;
      } else if (b.issue.due_date) {
         return 1;
      }
      const teamDifference = a.issue.team_id.localeCompare(b.issue.team_id);
      if (teamDifference !== 0) return teamDifference;
      return a.issue.issue_number - b.issue.issue_number;
   });

   const attention: WorkspaceDashboardIssueDto[] = attentionRows
      .slice(0, 12)
      .flatMap(({ issue, status, reason }) => {
         const team = teamById.get(issue.team_id);
         const teamDto = teamDtoById.get(issue.team_id);
         if (!team || !teamDto) return [];
         const project = issue.project_id ? projectById.get(issue.project_id) : undefined;
         return [
            {
               id: issue.id,
               identifier: `${team.issue_prefix}-${issue.issue_number}`,
               title: issue.title,
               priority: issue.priority,
               dueDate: issue.due_date,
               statusName: status?.name ?? 'Unknown status',
               statusCategory: status?.category ?? 'unstarted',
               reason,
               team: teamDto,
               project: project ? { id: project.id, name: project.name } : null,
            },
         ];
      });

   const latestProjectHealth = new Map<string, ProjectUpdateRow>();
   for (const update of projectUpdates) {
      if (update.health && !latestProjectHealth.has(update.project_id)) {
         latestProjectHealth.set(update.project_id, update);
      }
   }

   const milestonesByProject = new Map<string, MilestoneRow[]>();
   for (const milestone of milestones) {
      const current = milestonesByProject.get(milestone.project_id) ?? [];
      current.push(milestone);
      milestonesByProject.set(milestone.project_id, current);
   }
   for (const projectMilestones of milestonesByProject.values()) {
      projectMilestones.sort((a, b) => {
         if (a.target_date && b.target_date) {
            const targetDifference = a.target_date.localeCompare(b.target_date);
            if (targetDifference !== 0) return targetDifference;
         } else if (a.target_date) {
            return -1;
         } else if (b.target_date) {
            return 1;
         }
         return a.position - b.position;
      });
   }

   const projectDtos: WorkspaceDashboardProjectDto[] = projects.flatMap((project) => {
      const team = teamDtoById.get(project.team_id);
      if (!team) return [];
      const projectIssues = issues.filter((issue) => issue.project_id === project.id);
      const canceledCount = projectIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'canceled'
      ).length;
      const completedCount = projectIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'completed'
      ).length;
      const countable = Math.max(0, projectIssues.length - canceledCount);
      const projectMilestones = milestonesByProject.get(project.id) ?? [];
      const openProjectMilestones = projectMilestones.filter((milestone) => !milestone.completed);
      const latestHealth = latestProjectHealth.get(project.id);
      return [
         {
            id: project.id,
            name: project.name,
            status: project.status,
            targetDate: project.target_date,
            health: latestHealth?.health ?? null,
            healthUpdatedAt: latestHealth?.created_at ?? null,
            issueCount: projectIssues.length,
            completedIssueCount: completedCount,
            progress: countable === 0 ? 0 : Math.round((completedCount / countable) * 100),
            milestoneCount: projectMilestones.length,
            completedMilestoneCount: projectMilestones.filter((milestone) => milestone.completed).length,
            nextMilestone: openProjectMilestones[0]
               ? {
                    id: openProjectMilestones[0].id,
                    name: openProjectMilestones[0].name,
                    targetDate: openProjectMilestones[0].target_date,
                 }
               : null,
            team,
         },
      ];
   });
   projectDtos.sort((a, b) => {
      const statusDifference = projectStatusOrder(a.status) - projectStatusOrder(b.status);
      if (statusDifference !== 0) return statusDifference;
      const healthDifference = healthOrder(a.health) - healthOrder(b.health);
      if (healthDifference !== 0) return healthDifference;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate) return -1;
      if (b.targetDate) return 1;
      return a.name.localeCompare(b.name);
   });

   const milestoneDtos: WorkspaceDashboardMilestoneDto[] = milestones.flatMap((milestone) => {
      const project = projectById.get(milestone.project_id);
      if (!project) return [];
      const team = teamDtoById.get(project.team_id);
      if (!team) return [];
      const milestoneIssues = issues.filter((issue) => issue.milestone_id === milestone.id);
      const canceledCount = milestoneIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'canceled'
      ).length;
      const completedCount = milestoneIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'completed'
      ).length;
      const countable = Math.max(0, milestoneIssues.length - canceledCount);
      return [
         {
            id: milestone.id,
            projectId: project.id,
            projectName: project.name,
            name: milestone.name,
            targetDate: milestone.target_date,
            completed: milestone.completed,
            issueCount: milestoneIssues.length,
            completedIssueCount: completedCount,
            progress: countable === 0 ? 0 : Math.round((completedCount / countable) * 100),
            overdue: !milestone.completed && Boolean(milestone.target_date && milestone.target_date < today),
            team,
         },
      ];
   });
   const openMilestones = milestoneDtos.filter((milestone) => !milestone.completed);
   openMilestones.sort((a, b) => {
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
      if (a.targetDate && b.targetDate) return a.targetDate.localeCompare(b.targetDate);
      if (a.targetDate) return -1;
      if (b.targetDate) return 1;
      return a.projectName.localeCompare(b.projectName) || a.name.localeCompare(b.name);
   });

   const projectIdsByInitiative = new Map<string, string[]>();
   for (const assignment of initiativeProjects) {
      const current = projectIdsByInitiative.get(assignment.initiative_id) ?? [];
      current.push(assignment.project_id);
      projectIdsByInitiative.set(assignment.initiative_id, current);
   }
   const latestInitiativeHealth = new Map<string, InitiativeUpdateRow>();
   for (const update of initiativeUpdates) {
      if (update.health && !latestInitiativeHealth.has(update.initiative_id)) {
         latestInitiativeHealth.set(update.initiative_id, update);
      }
   }

   const initiativeDtos: WorkspaceDashboardInitiativeDto[] = initiatives.map((initiative) => {
      const projectIds = projectIdsByInitiative.get(initiative.id) ?? [];
      const initiativeIssues = issues.filter(
         (issue) => issue.project_id !== null && projectIds.includes(issue.project_id)
      );
      const canceledCount = initiativeIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'canceled'
      ).length;
      const completedCount = initiativeIssues.filter(
         (issue) => statusById.get(issue.status_id)?.category === 'completed'
      ).length;
      const countable = Math.max(0, initiativeIssues.length - canceledCount);
      const latestHealth = latestInitiativeHealth.get(initiative.id);
      const fallbackHealth = initiative.health === 'no-update' ? null : initiative.health;
      return {
         id: initiative.id,
         name: initiative.name,
         icon: initiative.icon,
         status: initiative.status,
         priority: initiative.priority,
         target: initiative.target,
         health: latestHealth?.health ?? fallbackHealth,
         healthUpdatedAt: latestHealth?.created_at ?? null,
         projectCount: projectIds.length,
         progress: countable === 0 ? 0 : Math.round((completedCount / countable) * 100),
      };
   });
   initiativeDtos.sort((a, b) => {
      const statusDifference = initiativeStatusOrder(a.status) - initiativeStatusOrder(b.status);
      if (statusDifference !== 0) return statusDifference;
      const healthDifference = healthOrder(a.health) - healthOrder(b.health);
      if (healthDifference !== 0) return healthDifference;
      const priorityDifference = initiativePriorityOrder(a.priority) - initiativePriorityOrder(b.priority);
      if (priorityDifference !== 0) return priorityDifference;
      return a.name.localeCompare(b.name);
   });

   const activePortfolioProjects = projectDtos.filter(
      (project) => project.status === 'active' || project.status === 'planned' || project.status === 'paused'
   );

   const response: WorkspaceDashboardResponse = {
      generatedAt: new Date().toISOString(),
      summary: {
         teams: teams.length,
         projects: projects.length,
         initiatives: initiatives.length,
         activeIssues: openIssues.length,
         completedIssues: completedIssues.length,
         attention: attentionRows.length,
      },
      portfolio: {
         activeProjects: activePortfolioProjects.length,
         atRiskProjects: activePortfolioProjects.filter((project) => project.health === 'at-risk').length,
         offTrackProjects: activePortfolioProjects.filter((project) => project.health === 'off-track').length,
         openMilestones: openMilestones.length,
         overdueMilestones: openMilestones.filter((milestone) => milestone.overdue).length,
      },
      attention,
      projects: projectDtos.slice(0, 50),
      milestones: openMilestones.slice(0, 50),
      initiatives: initiativeDtos.slice(0, 50),
   };

   return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, no-store' },
   });
}
