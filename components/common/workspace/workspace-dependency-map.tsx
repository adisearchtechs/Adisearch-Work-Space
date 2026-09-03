'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
   AlertTriangle,
   ArrowRight,
   Boxes,
   Clock3,
   GitBranch,
   ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceDependenciesResponse } from '@/lib/workspace-dependencies/contracts';

function formatDate(value: string | null) {
   if (!value) return 'No due date';
   return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   }).format(new Date(`${value}T00:00:00`));
}

export function WorkspaceDependencyMap() {
   const workspace = useWorkspace();
   const [data, setData] = useState<WorkspaceDependenciesResponse | null>(null);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setData(null);
      setLoadError(false);

      void fetch(
         `/api/dependencies?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
         }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error(`Dependency map load failed with ${response.status}.`);
            return (await response.json()) as WorkspaceDependenciesResponse;
         })
         .then((result) => {
            if (!controller.signal.aborted) setData(result);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load workspace dependencies.');
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Dependencies</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               The dependency map is available when the workspace is connected to persistent data.
            </p>
         </div>
      );
   }

   if (loadError) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Unable to load dependencies</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Refresh the page to retry the authenticated dependency request.
            </p>
         </div>
      );
   }

   if (!data) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading workspace dependencies…
         </div>
      );
   }

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
               <p className="text-sm font-medium text-muted-foreground">{workspace.organization.name}</p>
               <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dependency map</h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Unresolved issue blockers rolled up across projects. This view reports persisted relationships and dates only; it does not predict delivery outcomes.
               </p>
            </div>
            <p className="text-xs text-muted-foreground">
               Updated {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(data.generatedAt))}
            </p>
         </div>

         <section aria-label="Dependency metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><GitBranch className="size-3.5" />Unresolved</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.unresolvedDependencies}</p>
               <p className="mt-1 text-xs text-muted-foreground">Active blocking relationships</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><Boxes className="size-3.5" />Cross-project</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.crossProjectDependencies}</p>
               <p className="mt-1 text-xs text-muted-foreground">Across project boundaries</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" />Projects blocked</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.projectsBlocked}</p>
               <p className="mt-1 text-xs text-muted-foreground">By another project</p>
            </div>
            <div className="rounded-xl border p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="size-3.5" />Overdue blocked</div>
               <p className="mt-2 text-2xl font-semibold tabular-nums">{data.summary.overdueBlockedIssues}</p>
               <p className="mt-1 text-xs text-muted-foreground">Blocked issues past due</p>
            </div>
         </section>

         <section className="mt-10">
            <div className="flex items-end justify-between gap-3">
               <div>
                  <h2 className="text-lg font-semibold">Project dependency map</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Projects participating in unresolved cross-project blockers, ordered by overdue and inbound pressure.
                  </p>
               </div>
               <Link href={`/${workspace.organization.slug}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Workspace overview
               </Link>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
               {data.projects.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground lg:col-span-2 xl:col-span-3">
                     No unresolved cross-project blockers are currently recorded.
                  </div>
               ) : (
                  data.projects.map((project) => (
                     <div key={project.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                           <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                 <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: project.team.color }} />
                                 <Link href={`/${workspace.organization.slug}/project/${project.id}/overview`} className="truncate text-sm font-semibold hover:underline">
                                    {project.name}
                                 </Link>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{project.team.name}</p>
                           </div>
                           {project.overdueBlockedIssues > 0 ? (
                              <span className="shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium">{project.overdueBlockedIssues} overdue</span>
                           ) : null}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                           <div className="rounded-lg bg-muted/40 p-3">
                              <p className="text-muted-foreground">Blocked by</p>
                              <p className="mt-1 text-lg font-semibold tabular-nums">{project.inboundDependencies}</p>
                           </div>
                           <div className="rounded-lg bg-muted/40 p-3">
                              <p className="text-muted-foreground">Blocks</p>
                              <p className="mt-1 text-lg font-semibold tabular-nums">{project.outboundDependencies}</p>
                           </div>
                        </div>

                        {project.blockedByProjects.length > 0 ? (
                           <div className="mt-4">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Blocked by projects</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                 {project.blockedByProjects.map((dependency) => (
                                    <Link key={dependency.id} href={`/${workspace.organization.slug}/project/${dependency.id}/overview`} className="rounded-full border px-2 py-1 text-xs hover:bg-muted/40">
                                       {dependency.name}
                                    </Link>
                                 ))}
                              </div>
                           </div>
                        ) : null}

                        {project.blocksProjects.length > 0 ? (
                           <div className="mt-4">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Blocks projects</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                 {project.blocksProjects.map((dependency) => (
                                    <Link key={dependency.id} href={`/${workspace.organization.slug}/project/${dependency.id}/overview`} className="rounded-full border px-2 py-1 text-xs hover:bg-muted/40">
                                       {dependency.name}
                                    </Link>
                                 ))}
                              </div>
                           </div>
                        ) : null}
                     </div>
                  ))
               )}
            </div>
         </section>

         <section className="mt-10 pb-8">
            <div>
               <h2 className="text-lg font-semibold">Unresolved blocking relationships</h2>
               <p className="mt-1 text-sm text-muted-foreground">
                  Source issue blocks target issue. Completed or canceled endpoints are excluded because they no longer represent active blockers.
               </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border">
               {data.dependencies.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">No unresolved blocking relationships.</div>
               ) : (
                  data.dependencies.map((dependency, index) => (
                     <div key={dependency.id} className={`px-4 py-3 ${index ? 'border-t' : ''}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                           <Link href={`/${workspace.organization.slug}/issue/${dependency.blocking.id}`} className="min-w-0 flex-1 rounded-lg p-2 hover:bg-muted/40">
                              <div className="flex items-center gap-2">
                                 <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: dependency.blocking.team.color }} />
                                 <span className="shrink-0 text-xs font-medium text-muted-foreground">{dependency.blocking.identifier}</span>
                                 <p className="truncate text-sm font-medium">{dependency.blocking.title}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                 {dependency.blocking.project?.name ?? 'No project'} · {dependency.blocking.statusName}
                              </p>
                           </Link>

                           <div className="flex shrink-0 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                              <span>blocks</span><ArrowRight className="size-4" />
                           </div>

                           <Link href={`/${workspace.organization.slug}/issue/${dependency.blocked.id}`} className="min-w-0 flex-1 rounded-lg p-2 hover:bg-muted/40">
                              <div className="flex items-center gap-2">
                                 <span className="size-2.5 shrink-0 rounded-full border" style={{ backgroundColor: dependency.blocked.team.color }} />
                                 <span className="shrink-0 text-xs font-medium text-muted-foreground">{dependency.blocked.identifier}</span>
                                 <p className="truncate text-sm font-medium">{dependency.blocked.title}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                 {dependency.blocked.project?.name ?? 'No project'} · {dependency.blocked.statusName} · {formatDate(dependency.blocked.dueDate)}
                              </p>
                           </Link>

                           <div className="flex shrink-0 flex-wrap gap-1.5">
                              {dependency.crossProject ? <span className="rounded-full border px-2 py-1 text-[11px] font-medium">Cross-project</span> : null}
                              {dependency.overdueBlocked ? <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium"><Clock3 className="size-3" />Overdue</span> : null}
                           </div>
                        </div>
                     </div>
                  ))
               )}
            </div>

            {data.summary.projectlessDependencies > 0 ? (
               <p className="mt-3 text-xs text-muted-foreground">
                  {data.summary.projectlessDependencies} unresolved dependencies include at least one issue without a project assignment and therefore are not included in the project rollup.
               </p>
            ) : null}
         </section>
      </div>
   );
}
