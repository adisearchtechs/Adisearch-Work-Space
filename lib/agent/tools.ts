import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type AgentSupabase = Awaited<ReturnType<typeof createClient>>;
type JsonObject = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLOSED_STATUS_CATEGORIES = new Set(['completed', 'canceled']);
const MAX_TOOL_ROWS = 50;

export const AGENT_READ_TOOLS = [
   {
      type: 'function',
      name: 'list_issues',
      description:
         'List or count issues in the current workspace. Use team for a team key/name/prefix and state=open for unresolved issues.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            team: { type: ['string', 'null'] },
            state: { type: ['string', 'null'], enum: ['open', 'closed', null] },
            search: { type: ['string', 'null'] },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['team', 'state', 'search', 'limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'get_issue',
      description: 'Get one issue by canonical identifier such as CORE-123.',
      strict: true,
      parameters: {
         type: 'object',
         properties: { identifier: { type: 'string', minLength: 3, maxLength: 80 } },
         required: ['identifier'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'search_projects',
      description: 'Search projects in the current workspace by name, optionally scoped to a team.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            search: { type: ['string', 'null'] },
            team: { type: ['string', 'null'] },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['search', 'team', 'limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'get_project',
      description: 'Get a project by UUID or exact project name, including its milestones.',
      strict: true,
      parameters: {
         type: 'object',
         properties: { project: { type: 'string', minLength: 1, maxLength: 160 } },
         required: ['project'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'list_milestones',
      description: 'List project milestones in the current workspace, optionally for one project UUID.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            projectId: { type: ['string', 'null'] },
            includeCompleted: { type: 'boolean' },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['projectId', 'includeCompleted', 'limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'list_teams',
      description: 'List teams in the current workspace.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {},
         required: [],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'list_cycles',
      description: 'List cycles in the current workspace, optionally scoped to a team key/name/prefix.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            team: { type: ['string', 'null'] },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['team', 'limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'inspect_dependencies',
      description: 'Inspect unresolved issue blocking relationships in the current workspace.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'workspace_portfolio_summary',
      description: 'Return current workspace counts for issues, projects, teams, milestones, cycles, and reviews.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {},
         required: [],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'search_documents',
      description: 'Search persisted team documents in the current workspace by title/body text.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            search: { type: 'string', minLength: 1, maxLength: 200 },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: 20 },
         },
         required: ['search', 'limit'],
         additionalProperties: false,
      },
   },
   {
      type: 'function',
      name: 'list_reviews',
      description: 'List recent persisted reviews in the current workspace.',
      strict: true,
      parameters: {
         type: 'object',
         properties: {
            status: { type: ['string', 'null'] },
            limit: { type: ['integer', 'null'], minimum: 1, maximum: MAX_TOOL_ROWS },
         },
         required: ['status', 'limit'],
         additionalProperties: false,
      },
   },
] as const;

function stringArg(args: JsonObject, key: string) {
   const value = args[key];
   return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function booleanArg(args: JsonObject, key: string, fallback = false) {
   return typeof args[key] === 'boolean' ? (args[key] as boolean) : fallback;
}

function limitArg(args: JsonObject, maximum = MAX_TOOL_ROWS) {
   const value = args.limit;
   return typeof value === 'number' && Number.isInteger(value)
      ? Math.max(1, Math.min(maximum, value))
      : Math.min(20, maximum);
}

function assertReadSuccess(error: { message?: string } | null, label: string) {
   if (error) throw new Error(`AGENT_TOOL_${label.toUpperCase()}_FAILED`);
}

async function teamsForWorkspace(supabase: AgentSupabase, organizationId: string) {
   const { data, error } = await supabase
      .from('teams')
      .select('id, key, name, color, issue_prefix')
      .eq('organization_id', organizationId)
      .order('name')
      .limit(500);
   assertReadSuccess(error, 'teams');
   return data ?? [];
}

async function resolveTeam(
   supabase: AgentSupabase,
   organizationId: string,
   value: string | null
) {
   if (!value) return null;
   const normalized = value.trim().toLowerCase();
   const teams = await teamsForWorkspace(supabase, organizationId);
   return (
      teams.find(
         (team) =>
            team.key.toLowerCase() === normalized ||
            team.name.toLowerCase() === normalized ||
            team.issue_prefix.toLowerCase() === normalized
      ) ?? null
   );
}

async function statusContext(supabase: AgentSupabase, organizationId: string) {
   const { data, error } = await supabase
      .from('statuses')
      .select('id, name, slug, category')
      .eq('organization_id', organizationId)
      .limit(500);
   assertReadSuccess(error, 'statuses');
   const rows = data ?? [];
   return {
      rows,
      byId: new Map(rows.map((row) => [row.id, row])),
      openIds: rows
         .filter((row) => !CLOSED_STATUS_CATEGORIES.has(row.category))
         .map((row) => row.id),
      closedIds: rows
         .filter((row) => CLOSED_STATUS_CATEGORIES.has(row.category))
         .map((row) => row.id),
   };
}

async function listIssues(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const limit = limitArg(args);
   const team = await resolveTeam(supabase, organizationId, stringArg(args, 'team'));
   if (stringArg(args, 'team') && !team) return { count: 0, issues: [], team: null };
   const statuses = await statusContext(supabase, organizationId);
   const state = stringArg(args, 'state');
   const search = stringArg(args, 'search');

   let query = supabase
      .from('issues')
      .select(
         'id, team_id, issue_number, title, status_id, priority, project_id, milestone_id, cycle_id, due_date, created_at',
         { count: 'exact' }
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
   if (team) query = query.eq('team_id', team.id);
   if (state === 'open') {
      if (statuses.openIds.length === 0) return { count: 0, issues: [], team };
      query = query.in('status_id', statuses.openIds);
   } else if (state === 'closed') {
      if (statuses.closedIds.length === 0) return { count: 0, issues: [], team };
      query = query.in('status_id', statuses.closedIds);
   }
   if (search) {
      query = query.ilike(
         'title',
         `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
      );
   }

   const { data, error, count } = await query;
   assertReadSuccess(error, 'issues');
   const teams = await teamsForWorkspace(supabase, organizationId);
   const teamById = new Map(teams.map((row) => [row.id, row]));
   return {
      count: count ?? 0,
      issues: (data ?? []).map((issue) => {
         const issueTeam = teamById.get(issue.team_id);
         const status = statuses.byId.get(issue.status_id);
         return {
            id: issue.id,
            identifier: issueTeam
               ? `${issueTeam.issue_prefix}-${issue.issue_number}`
               : String(issue.issue_number),
            title: issue.title,
            priority: issue.priority,
            status: status ? { name: status.name, category: status.category } : null,
            team: issueTeam
               ? { id: issueTeam.id, key: issueTeam.key, name: issueTeam.name }
               : null,
            projectId: issue.project_id,
            milestoneId: issue.milestone_id,
            cycleId: issue.cycle_id,
            dueDate: issue.due_date,
         };
      }),
   };
}

async function getIssue(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const identifier = stringArg(args, 'identifier');
   const match = identifier?.match(/^([A-Za-z0-9_-]+)-(\d+)$/);
   if (!match) return { issue: null };
   const prefix = match[1].toLowerCase();
   const number = Number(match[2]);
   const teams = await teamsForWorkspace(supabase, organizationId);
   const team = teams.find((row) => row.issue_prefix.toLowerCase() === prefix);
   if (!team) return { issue: null };

   const { data: issue, error } = await supabase
      .from('issues')
      .select(
         'id, issue_number, title, description, status_id, priority, project_id, milestone_id, cycle_id, assignee_id, due_date, created_at, updated_at'
      )
      .eq('organization_id', organizationId)
      .eq('team_id', team.id)
      .eq('issue_number', number)
      .maybeSingle();
   assertReadSuccess(error, 'issue');
   if (!issue) return { issue: null };

   const statuses = await statusContext(supabase, organizationId);
   const status = statuses.byId.get(issue.status_id) ?? null;
   return {
      issue: {
         ...issue,
         identifier: `${team.issue_prefix}-${issue.issue_number}`,
         team: { id: team.id, key: team.key, name: team.name },
         status: status
            ? { name: status.name, slug: status.slug, category: status.category }
            : null,
      },
   };
}

async function searchProjects(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const limit = limitArg(args);
   const teamValue = stringArg(args, 'team');
   const team = await resolveTeam(supabase, organizationId, teamValue);
   if (teamValue && !team) return { count: 0, projects: [] };
   let query = supabase
      .from('projects')
      .select(
         'id, team_id, name, description, status, target_date, lead_id, created_at, updated_at',
         { count: 'exact' }
      )
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(limit);
   if (team) query = query.eq('team_id', team.id);
   const search = stringArg(args, 'search');
   if (search) {
      query = query.ilike(
         'name',
         `%${search.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
      );
   }
   const { data, error, count } = await query;
   assertReadSuccess(error, 'projects');
   return { count: count ?? 0, projects: data ?? [] };
}

async function getProject(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const projectValue = stringArg(args, 'project');
   if (!projectValue) return { project: null };
   let query = supabase
      .from('projects')
      .select('id, team_id, name, description, status, target_date, lead_id, created_at, updated_at')
      .eq('organization_id', organizationId);
   query = UUID.test(projectValue)
      ? query.eq('id', projectValue)
      : query.ilike('name', projectValue);
   const { data: project, error } = await query.limit(1).maybeSingle();
   assertReadSuccess(error, 'project');
   if (!project) return { project: null };
   const { data: milestones, error: milestoneError } = await supabase
      .from('project_milestones')
      .select('id, name, target_date, completed, position')
      .eq('organization_id', organizationId)
      .eq('project_id', project.id)
      .order('position')
      .limit(100);
   assertReadSuccess(milestoneError, 'milestones');
   return { project: { ...project, milestones: milestones ?? [] } };
}

async function listMilestones(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const limit = limitArg(args);
   const projectId = stringArg(args, 'projectId');
   if (projectId && !UUID.test(projectId)) return { count: 0, milestones: [] };
   let query = supabase
      .from('project_milestones')
      .select('id, project_id, name, target_date, completed, position', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('target_date', { ascending: true, nullsFirst: false })
      .limit(limit);
   if (projectId) query = query.eq('project_id', projectId);
   if (!booleanArg(args, 'includeCompleted')) query = query.eq('completed', false);
   const { data, error, count } = await query;
   assertReadSuccess(error, 'milestones');
   return { count: count ?? 0, milestones: data ?? [] };
}

async function listCycles(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const teamValue = stringArg(args, 'team');
   const team = await resolveTeam(supabase, organizationId, teamValue);
   if (teamValue && !team) return { count: 0, cycles: [] };
   let query = supabase
      .from('cycles')
      .select('id, team_id, name, starts_at, ends_at, created_at, updated_at', {
         count: 'exact',
      })
      .eq('organization_id', organizationId)
      .order('starts_at', { ascending: false })
      .limit(limitArg(args));
   if (team) query = query.eq('team_id', team.id);
   const { data, error, count } = await query;
   assertReadSuccess(error, 'cycles');
   const today = new Date().toISOString().slice(0, 10);
   return {
      count: count ?? 0,
      cycles: (data ?? []).map((cycle) => ({
         ...cycle,
         status:
            cycle.starts_at > today
               ? 'upcoming'
               : cycle.ends_at < today
                 ? 'completed'
                 : 'current',
      })),
   };
}

async function inspectDependencies(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const limit = limitArg(args);
   const { data: relations, error } = await supabase
      .from('issue_relations')
      .select('id, source_issue_id, target_issue_id, created_at')
      .eq('organization_id', organizationId)
      .eq('relation_type', 'blocks')
      .order('created_at', { ascending: false })
      .limit(limit);
   assertReadSuccess(error, 'dependencies');
   if (!relations?.length) return { count: 0, dependencies: [] };

   const issueIds = [
      ...new Set(relations.flatMap((row) => [row.source_issue_id, row.target_issue_id])),
   ];
   const [issuesResult, teams, statuses] = await Promise.all([
      supabase
         .from('issues')
         .select('id, team_id, issue_number, title, status_id, project_id, due_date')
         .eq('organization_id', organizationId)
         .in('id', issueIds),
      teamsForWorkspace(supabase, organizationId),
      statusContext(supabase, organizationId),
   ]);
   assertReadSuccess(issuesResult.error, 'dependency_issues');
   const issues = issuesResult.data ?? [];
   const issueById = new Map(issues.map((row) => [row.id, row]));
   const teamById = new Map(teams.map((row) => [row.id, row]));
   const active = relations.flatMap((relation) => {
      const source = issueById.get(relation.source_issue_id);
      const target = issueById.get(relation.target_issue_id);
      if (!source || !target) return [];
      const sourceStatus = statuses.byId.get(source.status_id);
      const targetStatus = statuses.byId.get(target.status_id);
      if (
         !sourceStatus ||
         !targetStatus ||
         CLOSED_STATUS_CATEGORIES.has(sourceStatus.category) ||
         CLOSED_STATUS_CATEGORIES.has(targetStatus.category)
      ) {
         return [];
      }
      const sourceTeam = teamById.get(source.team_id);
      const targetTeam = teamById.get(target.team_id);
      return [
         {
            id: relation.id,
            blocking: {
               identifier: sourceTeam
                  ? `${sourceTeam.issue_prefix}-${source.issue_number}`
                  : String(source.issue_number),
               title: source.title,
               projectId: source.project_id,
            },
            blocked: {
               identifier: targetTeam
                  ? `${targetTeam.issue_prefix}-${target.issue_number}`
                  : String(target.issue_number),
               title: target.title,
               projectId: target.project_id,
               dueDate: target.due_date,
            },
         },
      ];
   });
   return { count: active.length, dependencies: active };
}

async function portfolioSummary(supabase: AgentSupabase, organizationId: string) {
   const statuses = await statusContext(supabase, organizationId);
   const today = new Date().toISOString().slice(0, 10);
   const [issues, projects, teams, milestones, cycles, reviews] = await Promise.all([
      supabase
         .from('issues')
         .select('status_id')
         .eq('organization_id', organizationId)
         .limit(5000),
      supabase
         .from('projects')
         .select('status')
         .eq('organization_id', organizationId)
         .limit(2000),
      supabase
         .from('teams')
         .select('id', { count: 'exact', head: true })
         .eq('organization_id', organizationId),
      supabase
         .from('project_milestones')
         .select('completed')
         .eq('organization_id', organizationId)
         .limit(3000),
      supabase
         .from('cycles')
         .select('starts_at, ends_at')
         .eq('organization_id', organizationId)
         .limit(2000),
      supabase
         .from('reviews')
         .select('status')
         .eq('organization_id', organizationId)
         .limit(2000),
   ]);
   const error =
      issues.error ??
      projects.error ??
      teams.error ??
      milestones.error ??
      cycles.error ??
      reviews.error;
   assertReadSuccess(error, 'portfolio');
   const issueRows = issues.data ?? [];
   return {
      issues: {
         total: issueRows.length,
         open: issueRows.filter((row) => statuses.openIds.includes(row.status_id)).length,
         closed: issueRows.filter((row) => statuses.closedIds.includes(row.status_id)).length,
      },
      projects: Object.fromEntries(
         [...new Set((projects.data ?? []).map((row) => row.status))].map((status) => [
            status,
            (projects.data ?? []).filter((row) => row.status === status).length,
         ])
      ),
      teams: teams.count ?? 0,
      milestones: {
         total: milestones.data?.length ?? 0,
         incomplete: (milestones.data ?? []).filter((row) => !row.completed).length,
      },
      cycles: {
         total: cycles.data?.length ?? 0,
         current: (cycles.data ?? []).filter(
            (row) => row.starts_at <= today && row.ends_at >= today
         ).length,
      },
      reviews: Object.fromEntries(
         [...new Set((reviews.data ?? []).map((row) => row.status))].map((status) => [
            status,
            (reviews.data ?? []).filter((row) => row.status === status).length,
         ])
      ),
   };
}

async function searchDocuments(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   const search = stringArg(args, 'search');
   if (!search) return { count: 0, documents: [] };
   const escaped = search.replaceAll('%', '\\%').replaceAll('_', '\\_');
   const { data, error } = await supabase
      .from('team_documents')
      .select('id, team_id, title, body, pinned, created_at, updated_at')
      .eq('organization_id', organizationId)
      .or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`)
      .order('updated_at', { ascending: false })
      .limit(limitArg(args, 20));
   assertReadSuccess(error, 'documents');
   return {
      count: data?.length ?? 0,
      documents: (data ?? []).map((document) => ({
         id: document.id,
         teamId: document.team_id,
         title: document.title,
         pinned: document.pinned,
         excerpt: document.body.slice(0, 1200),
         updatedAt: document.updated_at,
      })),
   };
}

async function listReviews(
   supabase: AgentSupabase,
   organizationId: string,
   args: JsonObject
) {
   let query = supabase
      .from('reviews')
      .select(
         'id, title, status, issue_id, external_provider, external_url, repository, external_number, checks_passed, checks_total, updated_at',
         { count: 'exact' }
      )
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(limitArg(args));
   const status = stringArg(args, 'status');
   if (status) query = query.eq('status', status);
   const { data, error, count } = await query;
   assertReadSuccess(error, 'reviews');
   return { count: count ?? 0, reviews: data ?? [] };
}

export async function executeAgentReadTool(input: {
   supabase: AgentSupabase;
   organizationId: string;
   name: string;
   arguments: JsonObject;
}) {
   const { supabase, organizationId, name, arguments: args } = input;
   switch (name) {
      case 'list_issues':
         return listIssues(supabase, organizationId, args);
      case 'get_issue':
         return getIssue(supabase, organizationId, args);
      case 'search_projects':
         return searchProjects(supabase, organizationId, args);
      case 'get_project':
         return getProject(supabase, organizationId, args);
      case 'list_milestones':
         return listMilestones(supabase, organizationId, args);
      case 'list_teams':
         return { teams: await teamsForWorkspace(supabase, organizationId) };
      case 'list_cycles':
         return listCycles(supabase, organizationId, args);
      case 'inspect_dependencies':
         return inspectDependencies(supabase, organizationId, args);
      case 'workspace_portfolio_summary':
         return portfolioSummary(supabase, organizationId);
      case 'search_documents':
         return searchDocuments(supabase, organizationId, args);
      case 'list_reviews':
         return listReviews(supabase, organizationId, args);
      default:
         throw new Error('AGENT_TOOL_NOT_ALLOWED');
   }
}
