'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   WorkspaceDashboardAttentionReason,
   WorkspaceDashboardHealth,
   WorkspaceDashboardResponse,
} from '@/lib/workspace-dashboard/contracts';
import {
   Activity,
   AlertTriangle,
   Box,
   CalendarClock,
   CheckCircle2,
   Compass,
   Flag,
   Layers3,
   Milestone,
   UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDate(value: string | null) {
   if (!value) return 'No target date';
   return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   }).format(new Date(`${value}T00:00:00`));
}

function healthLabel(health: WorkspaceDashboardHealth | null) {
   if (!health) return 'No health update';
   if (health === 'on-track') return 'On track';
   if (health === 'at-risk') return 'At risk';
   return 'Off track';
}

function attentionLabel(reason: WorkspaceDashboardAttentionReason) {
   if (reason === 'due-soon') return 'Due soon';
   return reason.slice(0, 1).toUpperCase() + reason.slice(1);
}

function projectStatusLabel(status: WorkspaceDashboardResponse['projects'][number]['status']) {
   return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function initiativeStatusLabel(status: WorkspaceDashboardResponse['initiatives'][number]['status']) {
   return status.slice(0, 1).toUpperCase() + status.slice(1);
}

export function WorkspacePortfolioDashboard() {
   const workspace = useWorkspace();
   const [dashboard, setDashboard] = useState<WorkspaceDashboardResponse | null>(null);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setDashboard(null);
      setLoadError(false);

      void fetch(
         `/api/dashboard?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error(`Workspace dashboard load failed with ${response.status}.`);
            return (await response.json()) as WorkspaceDashboardResponse;
         })
         .then((result) => {
            if (!controller.signal.aborted) setDashboard(result);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load workspace portfolio dashboard.');
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) return null;

   if (loadError) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Unable to load workspace overview</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Refresh the page to retry the authenticated portfolio request.
            </p>
         </div>
      );
   }

   if (!dashboard) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading workspace overview…
         </div>
      );
   }

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
               <p className="text-sm font-medium text-muted-foreground">{workspace.organization.name}</p>
               <h1 className="mt-1 text-3xl font-semibold tracking-tight">Workspace overview</h1>
               <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Portfolio health, milestones, initiatives, and work that needs attention across the workspace.
               </p>
            </div>
            <p className="text-xs text-muted-foreground">
               Updated {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(dashboard.generatedAt))}
            </p>
         </div>

         <section aria-label="Workspace operating metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-3.5" />Active work</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.summary.activeIssues}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.summary.completedIssues} completed</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><Box className="size-3.5" />Projects</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.portfolio.activeProjects}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.summary.projects} total</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="size-3.5" />Attention</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.summary.attention}</p>
               <p className="mt-1 text-xs text-muted-foreground">Workspace-wide issue signals</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><Milestone className="size-3.5" />Open milestones</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.portfolio.openMilestones}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.portfolio.overdueMilestones} overdue</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><UsersRound className="size-3.5" />Teams</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.summary.teams}</p>
               <p className="mt-1 text-xs text-muted-foreground">{dashboard.summary.initiatives} initiatives</p>
            </div>
         </section>

         <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
               <div>
                  <h2 className="text-lg font-semibold">Portfolio health</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Primary project ownership, issue completion, latest persisted health, and the next milestone.
                  </p>
               </div>
               <Link href={`/${workspace.organization.slug}/projects`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  View projects
               </Link>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
               {dashboard.projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground lg:col-span-2 xl:col-span-3">
                     No projects have been created in this workspace yet.
                  </div>
               ) : (
                  dashboard.projects.slice(0, 9).map((project) => (
                     <Link
                        key={project.id}
                        href={`/${workspace.organization.slug}/project/${project.id}/overview`}
                        className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                     >
                        <div className="flex items-start justify-between gap-3">
                           <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                 <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: project.team.color }} />
                                 <p className="truncate text-sm font-semibold">{project.name}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                 {project.team.name} · {projectStatusLabel(project.status)} · {healthLabel(project.health)}
                              </p>
                           </div>
                           <span className="shrink-0 text-sm font-semibold tabular-nums">{project.progress}%</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                           <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                           <span>{project.completedIssueCount}/{project.issueCount} issues completed</span>
                           <span>{formatDate(project.targetDate)}</span>
                        </div>
                        <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                           {project.nextMilestone ? (
                              <span className="flex items-center gap-1.5"><Flag className="size-3.5" />Next: {project.nextMilestone.name} · {formatDate(project.nextMilestone.targetDate)}</span>
                           ) : (
                              <span>{project.completedMilestoneCount}/{project.milestoneCount} milestones completed</span>
                           )}
                        </div>
                     </Link>
                  ))
               )}
            </div>
            {(dashboard.portfolio.atRiskProjects > 0 || dashboard.portfolio.offTrackProjects > 0) && (
               <p className="mt-3 text-xs text-muted-foreground">
                  {dashboard.portfolio.offTrackProjects} off track · {dashboard.portfolio.atRiskProjects} at risk among active portfolio projects.
               </p>
            )}
         </section>

         <div className="mt-10 grid gap-10 xl:grid-cols-[1.05fr_0.95fr]">
            <section>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Milestone horizon</h2>
                     <p className="mt-1 text-sm text-muted-foreground">The nearest unfinished cross-project delivery checkpoints.</p>
                  </div>
                  <Link href={`/${workspace.organization.slug}/projects`} className="text-sm font-medium text-muted-foreground hover:text-foreground">Open portfolio</Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {dashboard.milestones.length === 0 ? (
                     <div className="p-5 text-sm text-muted-foreground">No open project milestones.</div>
                  ) : (
                     dashboard.milestones.slice(0, 10).map((milestone, index) => (
                        <Link
                           key={milestone.id}
                           href={`/${workspace.organization.slug}/project/${milestone.projectId}/milestones/${milestone.id}`}
                           className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 ${index ? 'border-t' : ''}`}
                        >
                           <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                           <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{milestone.name}</p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{milestone.projectName} · {milestone.team.name}</p>
                           </div>
                           <div className="shrink-0 text-right">
                              <p className="text-xs font-medium">{formatDate(milestone.targetDate)}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">{milestone.progress}% complete{milestone.overdue ? ' · overdue' : ''}</p>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </section>

            <section>
               <div className="flex items-end justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Initiatives</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Strategic work and completion across linked projects.</p>
                  </div>
                  <Link href={`/${workspace.organization.slug}/initiatives`} className="text-sm font-medium text-muted-foreground hover:text-foreground">View initiatives</Link>
               </div>
               <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {dashboard.initiatives.length === 0 ? (
                     <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No initiatives yet.</div>
                  ) : (
                     dashboard.initiatives.slice(0, 6).map((initiative) => (
                        <Link key={initiative.id} href={`/${workspace.organization.slug}/initiative/${initiative.id}`} className="rounded-xl border p-4 hover:bg-muted/30">
                           <div className="flex items-start gap-3">
                              <span className="text-xl" aria-hidden="true">{initiative.icon}</span>
                              <div className="min-w-0 flex-1">
                                 <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                       <p className="truncate text-sm font-semibold">{initiative.name}</p>
                                       <p className="mt-1 text-xs text-muted-foreground">{initiativeStatusLabel(initiative.status)} · {healthLabel(initiative.health)}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-semibold tabular-nums">{initiative.progress}%</span>
                                 </div>
                                 <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, initiative.progress))}%` }} />
                                 </div>
                                 <p className="mt-2 text-xs text-muted-foreground">{initiative.projectCount} linked projects{initiative.target ? ` · ${initiative.target}` : ''}</p>
                              </div>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </section>
         </div>

         <section className="mt-10 pb-8">
            <div className="flex items-end justify-between gap-3">
               <div>
                  <h2 className="text-lg font-semibold">Needs attention</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Blocked, overdue, urgent, and next-seven-day work across all teams.</p>
               </div>
               <Link href={`/${workspace.organization.slug}/my-issues`} className="text-sm font-medium text-muted-foreground hover:text-foreground">My issues</Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border">
               {dashboard.attention.length === 0 ? (
                  <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><CheckCircle2 className="size-4" />No workspace issue currently matches an attention signal.</div>
               ) : (
                  dashboard.attention.map((issue, index) => (
                     <Link
                        key={issue.id}
                        href={`/${workspace.organization.slug}/issue/${issue.id}`}
                        className={`flex flex-col gap-2 px-4 py-3 hover:bg-muted/30 sm:flex-row sm:items-center ${index ? 'border-t' : ''}`}
                     >
                        <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2">
                              <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: issue.team.color }} />
                              <span className="shrink-0 text-xs font-medium text-muted-foreground">{issue.identifier}</span>
                              <p className="truncate text-sm font-medium">{issue.title}</p>
                           </div>
                           <p className="mt-1 truncate text-xs text-muted-foreground">
                              {issue.team.name} · {issue.project?.name ?? 'No project'} · {issue.statusName}{issue.dueDate ? ` · due ${formatDate(issue.dueDate)}` : ''}
                           </p>
                        </div>
                        <span className="inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-1 text-[11px] font-medium">{attentionLabel(issue.reason)}</span>
                     </Link>
                  ))
               )}
            </div>
            {dashboard.summary.attention > dashboard.attention.length ? (
               <p className="mt-2 text-xs text-muted-foreground">Showing {dashboard.attention.length} of {dashboard.summary.attention} attention items.</p>
            ) : null}
         </section>
      </div>
   );
}
