'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
   Activity,
   AlertTriangle,
   Box,
   Clipboard,
   GitBranch,
} from 'lucide-react';
import { RiDonutChartFill } from '@remixicon/react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   TeamDashboardAttentionReason,
   TeamDashboardProjectDto,
   TeamDashboardResponse,
} from '@/lib/team-dashboard/contracts';
import type { WorkspaceDependenciesResponse } from '@/lib/workspace-dependencies/contracts';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';

function formatDate(value: string | null) {
   if (!value) return 'No target date';
   return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   }).format(new Date(`${value}T00:00:00`));
}

function reasonLabel(reason: TeamDashboardAttentionReason) {
   if (reason === 'due-soon') return 'Due soon';
   return reason.charAt(0).toUpperCase() + reason.slice(1);
}

function healthLabel(health: TeamDashboardProjectDto['health']) {
   if (health === 'off-track') return 'Off track';
   if (health === 'at-risk') return 'At risk';
   if (health === 'on-track') return 'On track';
   return 'No health update';
}

async function readSnapshot<T>(url: string, signal: AbortSignal): Promise<T> {
   const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      signal,
   });
   if (!response.ok) throw new Error(`Team status report load failed with ${response.status}.`);
   return (await response.json()) as T;
}

function buildTeamUpdate(
   teamName: string,
   dashboard: TeamDashboardResponse,
   dependencies: WorkspaceDependenciesResponse,
   teamId: string
) {
   const teamDependencies = dependencies.dependencies.filter(
      (dependency) =>
         dependency.blocking.team.id === teamId || dependency.blocked.team.id === teamId
   );
   const crossProjectDependencies = teamDependencies.filter(
      (dependency) => dependency.crossProject
   ).length;
   const overdueBlockedDependencies = teamDependencies.filter(
      (dependency) => dependency.overdueBlocked
   ).length;
   const persistedHealthProjects = dashboard.projects
      .filter((project) => project.health === 'at-risk' || project.health === 'off-track')
      .slice(0, 5);
   const generatedAt =
      dashboard.generatedAt > dependencies.generatedAt
         ? dashboard.generatedAt
         : dependencies.generatedAt;

   const lines = [
      `${teamName} — Team status`,
      `Snapshot: ${generatedAt}`,
      '',
      `Work: ${dashboard.work.active} active, ${dashboard.work.completed} completed, ${dashboard.work.attention} attention items.`,
      `Attention signals: ${dashboard.work.blocked} blocked, ${dashboard.work.overdue} overdue, ${dashboard.work.urgent} urgent, ${dashboard.work.dueSoon} due soon.`,
      `Dependencies: ${teamDependencies.length} unresolved touching this team, ${crossProjectDependencies} cross-project, ${overdueBlockedDependencies} with an overdue blocked issue.`,
   ];

   if (dashboard.currentCycle) {
      lines.push(
         `Current cycle: ${dashboard.currentCycle.name} — ${dashboard.currentCycle.completed}/${dashboard.currentCycle.scope} completed (${dashboard.currentCycle.successRate}% issue completion).`
      );
   } else {
      lines.push('Current cycle: none active today.');
   }

   if (dashboard.attention.length > 0) {
      lines.push('', 'Attention:');
      for (const issue of dashboard.attention.slice(0, 5)) {
         lines.push(
            `- ${issue.identifier} — ${issue.title} (${reasonLabel(issue.reason)}${issue.dueDate ? `, due ${issue.dueDate}` : ''})`
         );
      }
   }

   if (persistedHealthProjects.length > 0) {
      lines.push('', 'Persisted project health:');
      for (const project of persistedHealthProjects) {
         lines.push(`- ${project.name} — ${healthLabel(project.health)} (${project.progress}% issue completion)`);
      }
   }

   lines.push(
      '',
      'Source: current persisted team and dependency records. No delivery forecast, capacity estimate, velocity, or inferred risk score is included.'
   );

   return lines.join('\n');
}

export default function TeamStatusReport() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const [dashboard, setDashboard] = useState<TeamDashboardResponse | null>(null);
   const [dependencies, setDependencies] = useState<WorkspaceDependenciesResponse | null>(null);
   const [loadError, setLoadError] = useState(false);

   const resolvedTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug
         ? resolveTeamReference(teams, teamId)
         : undefined;

   useEffect(() => {
      if (!workspace.configured || !resolvedTeam) return;

      const controller = new AbortController();
      const organization = encodeURIComponent(workspace.organization.slug);
      const runtimeTeamId = encodeURIComponent(resolvedTeam.id);
      setDashboard(null);
      setDependencies(null);
      setLoadError(false);

      void Promise.all([
         readSnapshot<TeamDashboardResponse>(
            `/api/teams/${runtimeTeamId}/dashboard?organization=${organization}`,
            controller.signal
         ),
         readSnapshot<WorkspaceDependenciesResponse>(
            `/api/dependencies?organization=${organization}`,
            controller.signal
         ),
      ])
         .then(([dashboardSnapshot, dependencySnapshot]) => {
            if (controller.signal.aborted) return;
            setDashboard(dashboardSnapshot);
            setDependencies(dependencySnapshot);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load team status report.');
         });

      return () => controller.abort();
   }, [resolvedTeam, workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Team status report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Persistent team status reporting is available after the workspace is connected to persistent data. Demo mode does not fabricate team operating metrics.
            </p>
         </div>
      );
   }

   if (teamsLoading || workspaceSlug !== workspace.organization.slug) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading team…
         </div>
      );
   }

   if (!resolvedTeam) {
      return (
         <div className="mx-auto max-w-2xl px-6 py-10">
            <h1 className="text-2xl font-medium">Team not found</h1>
         </div>
      );
   }

   if (loadError) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Unable to load team status report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Refresh the page to retry the authenticated team snapshot requests.
            </p>
         </div>
      );
   }

   if (!dashboard || !dependencies) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading team status report…
         </div>
      );
   }

   const teamDependencies = dependencies.dependencies.filter(
      (dependency) =>
         dependency.blocking.team.id === resolvedTeam.id ||
         dependency.blocked.team.id === resolvedTeam.id
   );
   const persistedHealthProjects = dashboard.projects
      .filter((project) => project.health === 'at-risk' || project.health === 'off-track')
      .slice(0, 6);
   const activeProjects = dashboard.projects.filter((project) => project.status === 'active').length;
   const generatedAt =
      dashboard.generatedAt > dependencies.generatedAt
         ? dashboard.generatedAt
         : dependencies.generatedAt;

   const copyTeamUpdate = async () => {
      try {
         await navigator.clipboard.writeText(
            buildTeamUpdate(resolvedTeam.name, dashboard, dependencies, resolvedTeam.id)
         );
         toast.success('Team update copied.');
      } catch {
         toast.error('Unable to copy team update.');
      }
   };

   return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
         <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
               <div className="flex items-center gap-3">
                  <span
                     className="size-4 shrink-0 rounded border"
                     style={{ backgroundColor: resolvedTeam.color }}
                     aria-hidden="true"
                  />
                  <p className="text-sm font-medium text-muted-foreground">{resolvedTeam.name}</p>
               </div>
               <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team status report</h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Current team work, cycle state, persisted project health, and explicit blockers. The report does not create delivery forecasts, capacity estimates, or inferred risk scores.
               </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
               <button
                  type="button"
                  onClick={copyTeamUpdate}
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
               >
                  <Clipboard className="size-4" />
                  Copy team update
               </button>
               <p className="text-xs text-muted-foreground">
                  Updated{' '}
                  {new Intl.DateTimeFormat(undefined, {
                     month: 'short',
                     day: 'numeric',
                     hour: 'numeric',
                     minute: '2-digit',
                  }).format(new Date(generatedAt))}
               </p>
            </div>
         </div>

         <section aria-label="Team status metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="size-3.5" />Active work
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.work.active}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.work.completed} completed</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RiDonutChartFill className="size-3.5" />Current cycle
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {dashboard.currentCycle
                     ? `${dashboard.currentCycle.completed}/${dashboard.currentCycle.scope}`
                     : '—'}
               </p>
               <p className="mt-1 text-xs text-muted-foreground">
                  {dashboard.currentCycle
                     ? `${dashboard.currentCycle.successRate}% issue completion`
                     : 'No active cycle'}
               </p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="size-3.5" />Needs attention
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.work.attention}</p>
               <p className="mt-1 text-xs text-muted-foreground">
                  {dashboard.work.blocked} blocked · {dashboard.work.overdue} overdue
               </p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch className="size-3.5" />Team dependencies
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{teamDependencies.length}</p>
               <p className="mt-1 text-xs text-muted-foreground">Unresolved edges touching this team</p>
            </div>
         </section>

         <section className="mt-10 grid gap-6 xl:grid-cols-2">
            <div>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Attention</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Blocked, overdue, urgent, and due-soon work owned by this team.
                     </p>
                  </div>
                  <Link
                     href={`/${orgId}/team/${resolvedTeam.key}/all`}
                     className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                     Issues
                  </Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {dashboard.attention.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">No current team attention items.</div>
                  ) : (
                     dashboard.attention.slice(0, 6).map((issue, index) => (
                        <Link
                           key={issue.id}
                           href={`/${orgId}/issue/${issue.id}`}
                           className={`block px-4 py-3 hover:bg-muted/40 ${index ? 'border-t' : ''}`}
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-medium">
                                    <span className="mr-2 text-xs text-muted-foreground">{issue.identifier}</span>
                                    {issue.title}
                                 </p>
                                 <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {issue.project?.name ?? 'No project'} · {issue.statusName}
                                    {issue.dueDate ? ` · due ${formatDate(issue.dueDate)}` : ''}
                                 </p>
                              </div>
                              <span className="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium">
                                 {reasonLabel(issue.reason)}
                              </span>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </div>

            <div>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Owned project health</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        {activeProjects} active projects; only recorded at-risk or off-track health is listed below.
                     </p>
                  </div>
                  <Link
                     href={`/${orgId}/team/${resolvedTeam.key}/projects`}
                     className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                     Projects
                  </Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {persistedHealthProjects.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">
                        No persisted at-risk or off-track project health updates are present.
                     </div>
                  ) : (
                     persistedHealthProjects.map((project, index) => (
                        <Link
                           key={project.id}
                           href={`/${orgId}/project/${project.id}/overview`}
                           className={`block px-4 py-3 hover:bg-muted/40 ${index ? 'border-t' : ''}`}
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-medium">{project.name}</p>
                                 <p className="mt-1 text-xs text-muted-foreground">
                                    {project.progress}% issue completion · {formatDate(project.targetDate)}
                                 </p>
                              </div>
                              <span className="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium">
                                 {healthLabel(project.health)}
                              </span>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </div>
         </section>

         <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
               <div>
                  <h2 className="text-lg font-semibold">Blocking dependencies</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Unresolved persisted blocks relationships where this team owns either issue.
                  </p>
               </div>
               <Link
                  href={`/${orgId}/dependencies`}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
               >
                  Workspace dependency map
               </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border">
               {teamDependencies.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">No unresolved blockers touch this team.</div>
               ) : (
                  teamDependencies.slice(0, 8).map((dependency, index) => (
                     <div key={dependency.id} className={`px-4 py-3 ${index ? 'border-t' : ''}`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                           <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                 {dependency.blocking.identifier} blocks {dependency.blocked.identifier}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                 {dependency.blocking.team.name} → {dependency.blocked.team.name} · {dependency.blocked.title}
                              </p>
                           </div>
                           <div className="flex shrink-0 flex-wrap gap-1.5">
                              {dependency.crossProject ? (
                                 <span className="rounded-full border px-2 py-1 text-[11px] font-medium">Cross-project</span>
                              ) : null}
                              {dependency.overdueBlocked ? (
                                 <span className="rounded-full border px-2 py-1 text-[11px] font-medium">Blocked issue overdue</span>
                              ) : null}
                           </div>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </section>

         <div className="mt-8 rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">
            This report uses the current persisted team dashboard and explicit unresolved blocks relationships. Cycle and project progress are issue-completion ratios. Health appears only from persisted updates. It does not infer capacity, member utilization, workload percentage, velocity, critical path, delivery probability, or predicted completion dates.
         </div>
      </div>
   );
}
