'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
   AlertTriangle,
   CheckCircle2,
   Clipboard,
   GitBranch,
   ListChecks,
   Milestone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   WorkspaceDashboardAttentionReason,
   WorkspaceDashboardProjectDto,
   WorkspaceDashboardResponse,
} from '@/lib/workspace-dashboard/contracts';
import type { WorkspaceDependenciesResponse } from '@/lib/workspace-dependencies/contracts';

function formatDate(value: string | null) {
   if (!value) return 'No target date';
   return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   }).format(new Date(`${value}T00:00:00`));
}

function attentionLabel(reason: WorkspaceDashboardAttentionReason) {
   if (reason === 'due-soon') return 'Due soon';
   return reason.charAt(0).toUpperCase() + reason.slice(1);
}

function healthLabel(health: WorkspaceDashboardProjectDto['health']) {
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
   if (!response.ok) throw new Error(`Status report load failed with ${response.status}.`);
   return (await response.json()) as T;
}

function buildStatusUpdate(
   workspaceName: string,
   dashboard: WorkspaceDashboardResponse,
   dependencies: WorkspaceDependenciesResponse
) {
   const persistedHealthProjects = dashboard.projects
      .filter((project) => project.health === 'at-risk' || project.health === 'off-track')
      .slice(0, 5);
   const attention = dashboard.attention.slice(0, 5);
   const generatedAt =
      dashboard.generatedAt > dependencies.generatedAt
         ? dashboard.generatedAt
         : dependencies.generatedAt;

   const lines = [
      `${workspaceName} — Workspace status`,
      `Snapshot: ${generatedAt}`,
      '',
      `Issues: ${dashboard.summary.activeIssues} active, ${dashboard.summary.completedIssues} completed, ${dashboard.summary.attention} attention items.`,
      `Projects: ${dashboard.portfolio.activeProjects} active, ${dashboard.portfolio.atRiskProjects} persisted at-risk, ${dashboard.portfolio.offTrackProjects} persisted off-track.`,
      `Milestones: ${dashboard.portfolio.openMilestones} open, ${dashboard.portfolio.overdueMilestones} overdue.`,
      `Dependencies: ${dependencies.summary.unresolvedDependencies} unresolved, ${dependencies.summary.crossProjectDependencies} cross-project, ${dependencies.summary.projectsBlocked} projects blocked, ${dependencies.summary.overdueBlockedIssues} overdue blocked issues.`,
   ];

   if (attention.length > 0) {
      lines.push('', 'Attention:');
      for (const issue of attention) {
         lines.push(
            `- ${issue.identifier} — ${issue.title} (${attentionLabel(issue.reason)}${issue.dueDate ? `, due ${issue.dueDate}` : ''})`
         );
      }
   }

   if (persistedHealthProjects.length > 0) {
      lines.push('', 'Persisted project health:');
      for (const project of persistedHealthProjects) {
         lines.push(`- ${project.name} — ${healthLabel(project.health)} (${project.progress}% complete)`);
      }
   }

   lines.push(
      '',
      'Source: current persisted workspace records. No delivery forecast, capacity estimate, or inferred risk score is included.'
   );

   return lines.join('\n');
}

export function WorkspaceStatusReport() {
   const workspace = useWorkspace();
   const [dashboard, setDashboard] = useState<WorkspaceDashboardResponse | null>(null);
   const [dependencies, setDependencies] = useState<WorkspaceDependenciesResponse | null>(null);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      const organization = encodeURIComponent(workspace.organization.slug);
      setDashboard(null);
      setDependencies(null);
      setLoadError(false);

      void Promise.all([
         readSnapshot<WorkspaceDashboardResponse>(
            `/api/dashboard?organization=${organization}`,
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
            toast.error('Unable to load workspace status report.');
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Status report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Persistent workspace status reporting is available after the workspace is connected to persistent data. Demo mode does not fabricate operating metrics.
            </p>
         </div>
      );
   }

   if (loadError) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Unable to load status report</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Refresh the page to retry the authenticated workspace snapshot requests.
            </p>
         </div>
      );
   }

   if (!dashboard || !dependencies) {
      return (
         <div
            className="flex h-full items-center justify-center text-sm text-muted-foreground"
            role="status"
         >
            Loading workspace status report…
         </div>
      );
   }

   const persistedHealthProjects = dashboard.projects
      .filter((project) => project.health === 'at-risk' || project.health === 'off-track')
      .slice(0, 6);
   const milestones = dashboard.milestones
      .filter((milestone) => !milestone.completed)
      .sort((left, right) => {
         if (left.overdue !== right.overdue) return left.overdue ? -1 : 1;
         if (left.targetDate && right.targetDate) return left.targetDate.localeCompare(right.targetDate);
         if (left.targetDate) return -1;
         if (right.targetDate) return 1;
         return left.name.localeCompare(right.name);
      })
      .slice(0, 6);
   const generatedAt =
      dashboard.generatedAt > dependencies.generatedAt
         ? dashboard.generatedAt
         : dependencies.generatedAt;

   const copyStatusUpdate = async () => {
      try {
         await navigator.clipboard.writeText(
            buildStatusUpdate(workspace.organization.name, dashboard, dependencies)
         );
         toast.success('Status update copied.');
      } catch {
         toast.error('Unable to copy status update.');
      }
   };

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
               <p className="text-sm font-medium text-muted-foreground">
                  {workspace.organization.name}
               </p>
               <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workspace status report</h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  A current operating snapshot assembled from persistent portfolio and dependency records. Health is shown only from persisted updates; no delivery forecast, capacity, or inferred risk score is created.
               </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
               <button
                  type="button"
                  onClick={copyStatusUpdate}
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-muted"
               >
                  <Clipboard className="size-4" />
                  Copy status update
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

         <section aria-label="Status metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ListChecks className="size-3.5" />Active issues
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.summary.activeIssues}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.summary.attention} need attention</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5" />Completed issues
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.summary.completedIssues}</p>
               <p className="mt-1 text-xs text-muted-foreground">Persisted completed workflow state</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Milestone className="size-3.5" />Open milestones
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.portfolio.openMilestones}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.portfolio.overdueMilestones} overdue</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch className="size-3.5" />Unresolved dependencies
               </div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dependencies.summary.unresolvedDependencies}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dependencies.summary.crossProjectDependencies} cross-project</p>
            </div>
         </section>

         <section className="mt-10 grid gap-6 xl:grid-cols-2">
            <div>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Attention</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Persisted blocked, overdue, urgent, and next-seven-day work.
                     </p>
                  </div>
                  <Link
                     href={`/${workspace.organization.slug}`}
                     className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                     Overview
                  </Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {dashboard.attention.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">No current attention items.</div>
                  ) : (
                     dashboard.attention.slice(0, 6).map((issue, index) => (
                        <Link
                           key={issue.id}
                           href={`/${workspace.organization.slug}/issue/${issue.id}`}
                           className={`block px-4 py-3 hover:bg-muted/40 ${index ? 'border-t' : ''}`}
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-medium">
                                    <span className="mr-2 text-xs text-muted-foreground">{issue.identifier}</span>
                                    {issue.title}
                                 </p>
                                 <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {issue.team.name}{issue.project ? ` · ${issue.project.name}` : ''}
                                    {issue.dueDate ? ` · due ${formatDate(issue.dueDate)}` : ''}
                                 </p>
                              </div>
                              <span className="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium">
                                 {attentionLabel(issue.reason)}
                              </span>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </div>

            <div>
               <div>
                  <h2 className="text-lg font-semibold">Persisted project health</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Only projects whose latest recorded health update is at risk or off track.
                  </p>
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
                           href={`/${workspace.organization.slug}/project/${project.id}/overview`}
                           className={`block px-4 py-3 hover:bg-muted/40 ${index ? 'border-t' : ''}`}
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-medium">{project.name}</p>
                                 <p className="mt-1 text-xs text-muted-foreground">
                                    {project.team.name} · {project.progress}% issue completion
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

         <section className="mt-10 grid gap-6 xl:grid-cols-2">
            <div>
               <div>
                  <h2 className="text-lg font-semibold">Milestone horizon</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Open milestones ordered by persisted overdue state and target date.
                  </p>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {milestones.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">No open milestones.</div>
                  ) : (
                     milestones.map((milestone, index) => (
                        <Link
                           key={milestone.id}
                           href={`/${workspace.organization.slug}/project/${milestone.projectId}/milestones/${milestone.id}`}
                           className={`block px-4 py-3 hover:bg-muted/40 ${index ? 'border-t' : ''}`}
                        >
                           <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-medium">{milestone.name}</p>
                                 <p className="mt-1 truncate text-xs text-muted-foreground">
                                    {milestone.projectName} · {milestone.progress}% issue completion · {formatDate(milestone.targetDate)}
                                 </p>
                              </div>
                              {milestone.overdue ? (
                                 <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium">
                                    <AlertTriangle className="size-3" />Overdue
                                 </span>
                              ) : null}
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </div>

            <div>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Blocking dependencies</h2>
                     <p className="mt-1 text-sm text-muted-foreground">
                        Unresolved persisted blocks relationships requiring coordination.
                     </p>
                  </div>
                  <Link
                     href={`/${workspace.organization.slug}/dependencies`}
                     className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                     Dependency map
                  </Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {dependencies.dependencies.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">No unresolved blocking relationships.</div>
                  ) : (
                     dependencies.dependencies.slice(0, 6).map((dependency, index) => (
                        <div key={dependency.id} className={`px-4 py-3 ${index ? 'border-t' : ''}`}>
                           <p className="truncate text-sm font-medium">
                              {dependency.blocking.identifier} blocks {dependency.blocked.identifier}
                           </p>
                           <p className="mt-1 truncate text-xs text-muted-foreground">
                              {dependency.blocking.title} → {dependency.blocked.title}
                           </p>
                           <div className="mt-2 flex flex-wrap gap-1.5">
                              {dependency.crossProject ? (
                                 <span className="rounded-full border px-2 py-1 text-[11px] font-medium">Cross-project</span>
                              ) : null}
                              {dependency.overdueBlocked ? (
                                 <span className="rounded-full border px-2 py-1 text-[11px] font-medium">Blocked issue overdue</span>
                              ) : null}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </section>

         <div className="mt-8 rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">
            This report combines current persistent workspace records and explicit dependency relationships. Project and initiative progress are issue-completion ratios. Health appears only from persisted updates. It does not infer capacity, velocity, critical path, workload percentage, delivery probability, or predicted completion dates.
         </div>
      </div>
   );
}
