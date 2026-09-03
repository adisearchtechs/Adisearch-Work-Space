import { NextResponse, type NextRequest } from 'next/server';
import type {
   WorkspaceDependenciesResponse,
   WorkspaceDependencyEdgeDto,
   WorkspaceDependencyIssueDto,
   WorkspaceDependencyProjectDto,
   WorkspaceDependencyProjectRef,
   WorkspaceDependencyStatusCategory,
   WorkspaceDependencyTeamDto,
} from '@/lib/workspace-dependencies/contracts';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9-]{2,48}$/;

type TeamRow = {
   id: string;
   name: string;
   color: string;
   issue_prefix: string;
};

type StatusRow = {
   id: string;
   name: string;
   category: WorkspaceDependencyStatusCategory;
};

type IssueRow = {
   id: string;
   team_id: string;
   issue_number: number;
   title: string;
   status_id: string;
   project_id: string | null;
   due_date: string | null;
};

type ProjectRow = {
   id: string;
   team_id: string;
   name: string;
};

type RelationRow = {
   id: string;
   source_issue_id: string;
   target_issue_id: string;
   created_at: string;
};

type ProjectAggregate = {
   inbound: WorkspaceDependencyEdgeDto[];
   outbound: WorkspaceDependencyEdgeDto[];
   overdueBlockedIssueIds: Set<string>;
   blockedByProjectIds: Set<string>;
   blocksProjectIds: Set<string>;
};

function unavailable() {
   return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
}

function isClosed(category: WorkspaceDependencyStatusCategory | undefined) {
   return category === 'completed' || category === 'canceled';
}

function projectRef(project: ProjectRow | undefined): WorkspaceDependencyProjectRef | null {
   return project ? { id: project.id, name: project.name } : null;
}

function teamDto(team: TeamRow): WorkspaceDependencyTeamDto {
   return { id: team.id, name: team.name, color: team.color };
}

function issueDto(
   issue: IssueRow,
   teamById: Map<string, TeamRow>,
   statusById: Map<string, StatusRow>,
   projectById: Map<string, ProjectRow>
): WorkspaceDependencyIssueDto | null {
   const team = teamById.get(issue.team_id);
   const status = statusById.get(issue.status_id);
   if (!team || !status) return null;

   return {
      id: issue.id,
      identifier: `${team.issue_prefix}-${issue.issue_number}`,
      title: issue.title,
      statusName: status.name,
      statusCategory: status.category,
      dueDate: issue.due_date,
      team: teamDto(team),
      project: issue.project_id ? projectRef(projectById.get(issue.project_id)) : null,
   };
}

function getProjectAggregate(
   aggregates: Map<string, ProjectAggregate>,
   projectId: string
): ProjectAggregate {
   const existing = aggregates.get(projectId);
   if (existing) return existing;

   const created: ProjectAggregate = {
      inbound: [],
      outbound: [],
      overdueBlockedIssueIds: new Set<string>(),
      blockedByProjectIds: new Set<string>(),
      blocksProjectIds: new Set<string>(),
   };
   aggregates.set(projectId, created);
   return created;
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
      return NextResponse.json({ error: 'Unable to load workspace dependencies.' }, { status: 500 });
   }
   if (!organization) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

   const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .maybeSingle();

   if (membershipError) {
      return NextResponse.json({ error: 'Unable to load workspace dependencies.' }, { status: 500 });
   }
   if (!membership) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

   const [teamsResult, statusesResult, issuesResult, projectsResult, relationsResult] =
      await Promise.all([
         supabase
            .from('teams')
            .select('id, name, color, issue_prefix')
            .eq('organization_id', organization.id)
            .limit(500),
         supabase
            .from('statuses')
            .select('id, name, category')
            .eq('organization_id', organization.id)
            .limit(500),
         supabase
            .from('issues')
            .select('id, team_id, issue_number, title, status_id, project_id, due_date')
            .eq('organization_id', organization.id)
            .limit(2000),
         supabase
            .from('projects')
            .select('id, team_id, name')
            .eq('organization_id', organization.id)
            .limit(1000),
         supabase
            .from('issue_relations')
            .select('id, source_issue_id, target_issue_id, created_at')
            .eq('organization_id', organization.id)
            .eq('relation_type', 'blocks')
            .order('created_at', { ascending: true })
            .limit(1000),
      ]);

   const queryError =
      teamsResult.error ??
      statusesResult.error ??
      issuesResult.error ??
      projectsResult.error ??
      relationsResult.error;

   if (queryError) {
      return NextResponse.json({ error: 'Unable to load workspace dependencies.' }, { status: 500 });
   }

   const teams = (teamsResult.data ?? []) as TeamRow[];
   const statuses = (statusesResult.data ?? []) as StatusRow[];
   const issues = (issuesResult.data ?? []) as IssueRow[];
   const projects = (projectsResult.data ?? []) as ProjectRow[];
   const relations = (relationsResult.data ?? []) as RelationRow[];

   const teamById = new Map(teams.map((team) => [team.id, team]));
   const statusById = new Map(statuses.map((status) => [status.id, status]));
   const issueById = new Map(issues.map((issue) => [issue.id, issue]));
   const projectById = new Map(projects.map((project) => [project.id, project]));
   const today = new Date().toISOString().slice(0, 10);

   const dependencies: WorkspaceDependencyEdgeDto[] = [];

   for (const relation of relations) {
      const source = issueById.get(relation.source_issue_id);
      const target = issueById.get(relation.target_issue_id);
      if (!source || !target) continue;

      const sourceStatus = statusById.get(source.status_id);
      const targetStatus = statusById.get(target.status_id);
      if (!sourceStatus || !targetStatus) continue;
      if (isClosed(sourceStatus.category) || isClosed(targetStatus.category)) continue;

      const blocking = issueDto(source, teamById, statusById, projectById);
      const blocked = issueDto(target, teamById, statusById, projectById);
      if (!blocking || !blocked) continue;

      dependencies.push({
         id: relation.id,
         createdAt: relation.created_at,
         blocking,
         blocked,
         crossProject: Boolean(
            source.project_id && target.project_id && source.project_id !== target.project_id
         ),
         overdueBlocked: Boolean(target.due_date && target.due_date < today),
      });
   }

   dependencies.sort((left, right) => {
      if (left.overdueBlocked !== right.overdueBlocked) return left.overdueBlocked ? -1 : 1;
      if (left.crossProject !== right.crossProject) return left.crossProject ? -1 : 1;
      if (left.blocked.dueDate && right.blocked.dueDate) {
         const dueDateOrder = left.blocked.dueDate.localeCompare(right.blocked.dueDate);
         if (dueDateOrder !== 0) return dueDateOrder;
      } else if (left.blocked.dueDate) {
         return -1;
      } else if (right.blocked.dueDate) {
         return 1;
      }
      return left.createdAt.localeCompare(right.createdAt);
   });

   const aggregates = new Map<string, ProjectAggregate>();
   const blockedProjectIds = new Set<string>();
   const blockingProjectIds = new Set<string>();
   const overdueBlockedIssueIds = new Set<string>();

   for (const dependency of dependencies) {
      if (dependency.overdueBlocked) overdueBlockedIssueIds.add(dependency.blocked.id);
      if (!dependency.crossProject || !dependency.blocking.project || !dependency.blocked.project) {
         continue;
      }

      const sourceProjectId = dependency.blocking.project.id;
      const targetProjectId = dependency.blocked.project.id;
      blockingProjectIds.add(sourceProjectId);
      blockedProjectIds.add(targetProjectId);

      const sourceAggregate = getProjectAggregate(aggregates, sourceProjectId);
      sourceAggregate.outbound.push(dependency);
      sourceAggregate.blocksProjectIds.add(targetProjectId);

      const targetAggregate = getProjectAggregate(aggregates, targetProjectId);
      targetAggregate.inbound.push(dependency);
      targetAggregate.blockedByProjectIds.add(sourceProjectId);
      if (dependency.overdueBlocked) {
         targetAggregate.overdueBlockedIssueIds.add(dependency.blocked.id);
      }
   }

   const projectDtos: WorkspaceDependencyProjectDto[] = [];
   for (const [projectId, aggregate] of aggregates) {
      const project = projectById.get(projectId);
      const team = project ? teamById.get(project.team_id) : undefined;
      if (!project || !team) continue;

      const blockedByProjects = [...aggregate.blockedByProjectIds]
         .map((id) => projectRef(projectById.get(id)))
         .filter((value): value is WorkspaceDependencyProjectRef => Boolean(value))
         .sort((left, right) => left.name.localeCompare(right.name));
      const blocksProjects = [...aggregate.blocksProjectIds]
         .map((id) => projectRef(projectById.get(id)))
         .filter((value): value is WorkspaceDependencyProjectRef => Boolean(value))
         .sort((left, right) => left.name.localeCompare(right.name));

      projectDtos.push({
         id: project.id,
         name: project.name,
         team: teamDto(team),
         inboundDependencies: aggregate.inbound.length,
         outboundDependencies: aggregate.outbound.length,
         overdueBlockedIssues: aggregate.overdueBlockedIssueIds.size,
         blockedByProjects,
         blocksProjects,
      });
   }

   projectDtos.sort((left, right) => {
      if (left.overdueBlockedIssues !== right.overdueBlockedIssues) {
         return right.overdueBlockedIssues - left.overdueBlockedIssues;
      }
      if (left.inboundDependencies !== right.inboundDependencies) {
         return right.inboundDependencies - left.inboundDependencies;
      }
      if (left.outboundDependencies !== right.outboundDependencies) {
         return right.outboundDependencies - left.outboundDependencies;
      }
      return left.name.localeCompare(right.name);
   });

   const response: WorkspaceDependenciesResponse = {
      generatedAt: new Date().toISOString(),
      summary: {
         unresolvedDependencies: dependencies.length,
         crossProjectDependencies: dependencies.filter((dependency) => dependency.crossProject).length,
         projectlessDependencies: dependencies.filter(
            (dependency) => !dependency.blocking.project || !dependency.blocked.project
         ).length,
         projectsBlocked: blockedProjectIds.size,
         blockingProjects: blockingProjectIds.size,
         overdueBlockedIssues: overdueBlockedIssueIds.size,
      },
      projects: projectDtos,
      dependencies: dependencies.slice(0, 200),
   };

   return NextResponse.json(response, {
      headers: { 'Cache-Control': 'private, no-store' },
   });
}
