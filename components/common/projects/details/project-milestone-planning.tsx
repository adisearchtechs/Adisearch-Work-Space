'use client';

import { format, parseISO } from 'date-fns';
import { ArrowLeft, Calendar, CheckCircle2, Flag, LayoutGrid, List, Target } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { GroupedIssuesView } from '@/components/common/issues/grouped-issues-view';
import { applyIssueFilters } from '@/components/common/issues/issue-filter-columns';
import { IssueFilterBar } from '@/components/common/issues/issue-filter-bar';
import { useProjectMilestones } from '@/components/common/projects/details/use-project-milestones';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { WorkspaceIssue } from '@/lib/issues/types';
import type { ProjectMilestoneDto } from '@/lib/project-milestones/contracts';
import { cn } from '@/lib/utils';
import { getProjectDetail } from '@/mock-data/project-details';
import { displayOrderedStatus } from '@/mock-data/status';
import { useFilterStore } from '@/store/filter-store';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectMilestonesStore } from '@/store/project-milestones-store';
import { useProjectsStore } from '@/store/projects-store';

interface ProjectMilestonePlanningProps {
   projectId: string;
   milestoneId: string;
}

function formatTargetDate(value: string | null) {
   return value ? format(parseISO(value), 'MMM d, yyyy') : 'No target date';
}

export default function ProjectMilestonePlanning({
   projectId,
   milestoneId,
}: ProjectMilestonePlanningProps) {
   const { orgId } = useParams<{ orgId: string }>();
   const workspace = useWorkspace();
   const storedProject = useProjectsStore((state) =>
      state.projects.find((item) => item.id === projectId)
   );
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const projectsLoading = useProjectsStore((state) => state.loading);
   const allIssues = useIssuesStore((state) => state.issues);
   const { filters } = useFilterStore();
   const { milestones } = useProjectMilestones(projectId);
   const milestonesLoaded = useProjectMilestonesStore(
      (state) => state.loadedByProject[projectId] ?? false
   );
   const [view, setView] = useState<'board' | 'list'>('board');
   const detail = getProjectDetail(projectId);

   const workspaceReady = !workspace.configured || workspaceSlug === workspace.organization.slug;
   const project = workspaceReady ? storedProject : undefined;

   const displayedMilestones = useMemo<ProjectMilestoneDto[]>(() => {
      if (workspace.configured) return milestones;
      return detail.milestones.map((milestone, index) => ({
         id: milestone.id,
         projectId,
         name: milestone.name,
         targetDate: milestone.targetDate ?? null,
         completed: milestone.completed,
         position: index,
         createdAt: milestone.targetDate ?? '2026-01-01',
      }));
   }, [detail.milestones, milestones, projectId, workspace.configured]);

   const milestone = displayedMilestones.find((item) => item.id === milestoneId);
   const milestoneIssues = useMemo(
      () =>
         allIssues.filter(
            (issue) =>
               issue.project?.id === projectId &&
               (issue as WorkspaceIssue).milestoneId === milestoneId
         ),
      [allIssues, milestoneId, projectId]
   );
   const displayedIssues = useMemo(
      () => applyIssueFilters(milestoneIssues, filters),
      [filters, milestoneIssues]
   );

   const canceledCount = milestoneIssues.filter((issue) => issue.status.category === 'canceled').length;
   const plannedCount = Math.max(0, milestoneIssues.length - canceledCount);
   const completedCount = milestoneIssues.filter(
      (issue) => issue.status.category === 'completed'
   ).length;
   const progress = plannedCount === 0 ? 0 : Math.round((completedCount / plannedCount) * 100);

   if (!project) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            {projectsLoading ? 'Loading project…' : 'Project not found.'}
         </div>
      );
   }

   if (workspace.configured && !milestonesLoaded) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading milestone plan…
         </div>
      );
   }

   if (!milestone) {
      return (
         <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <Flag className="size-8 text-muted-foreground/60" />
            <div>
               <h1 className="text-sm font-medium">Milestone not found</h1>
               <p className="mt-1 text-sm text-muted-foreground">
                  This milestone may have been removed or does not belong to this project.
               </p>
            </div>
            <Button variant="outline" size="sm" asChild>
               <Link href={`/${orgId}/project/${project.id}/milestones`}>
                  <ArrowLeft className="size-4" />
                  Back to milestones
               </Link>
            </Button>
         </div>
      );
   }

   return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
         <div className="shrink-0 border-b bg-container px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
               <div className="min-w-0">
                  <Link
                     href={`/${orgId}/project/${project.id}/milestones`}
                     className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                     <ArrowLeft className="size-3.5" />
                     Milestones
                  </Link>
                  <div className="flex min-w-0 items-center gap-2.5">
                     <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <Flag className="size-4" />
                     </span>
                     <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                           <h1 className="truncate text-lg font-semibold">{milestone.name}</h1>
                           <span
                              className={cn(
                                 'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                 milestone.completed
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground'
                              )}
                           >
                              {milestone.completed ? 'Completed' : 'Open'}
                           </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                           <span className="inline-flex items-center gap-1.5">
                              <Calendar className="size-3.5" />
                              {formatTargetDate(milestone.targetDate)}
                           </span>
                           <span>{milestoneIssues.length} {milestoneIssues.length === 1 ? 'issue' : 'issues'}</span>
                           {canceledCount > 0 && <span>{canceledCount} canceled</span>}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:min-w-[360px]">
                  <div className="rounded-lg border bg-card px-3 py-2.5">
                     <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Target className="size-3.5" />
                        Planned
                     </div>
                     <div className="mt-1 text-lg font-semibold">{plannedCount}</div>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2.5">
                     <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5" />
                        Completed
                     </div>
                     <div className="mt-1 text-lg font-semibold">{completedCount}</div>
                  </div>
                  <div className="col-span-2 rounded-lg border bg-card px-3 py-2.5 sm:col-span-1">
                     <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{progress}%</span>
                     </div>
                     <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                           className="h-full rounded-full bg-foreground transition-[width]"
                           style={{ width: `${progress}%` }}
                           aria-hidden="true"
                        />
                     </div>
                     <span className="sr-only">{progress}% complete</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-container pr-3">
            <div className="min-w-0 flex-1">
               <IssueFilterBar />
            </div>
            <div className="flex shrink-0 items-center rounded-md border bg-background p-0.5" aria-label="Milestone issue view">
               <Button
                  type="button"
                  size="icon"
                  variant={view === 'board' ? 'secondary' : 'ghost'}
                  className="size-7"
                  onClick={() => setView('board')}
                  aria-label="Board view"
                  aria-pressed={view === 'board'}
               >
                  <LayoutGrid className="size-3.5" />
               </Button>
               <Button
                  type="button"
                  size="icon"
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  className="size-7"
                  onClick={() => setView('list')}
                  aria-label="List view"
                  aria-pressed={view === 'list'}
               >
                  <List className="size-3.5" />
               </Button>
            </div>
         </div>

         <div className="min-h-0 flex-1 overflow-hidden">
            {milestoneIssues.length === 0 ? (
               <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Flag className="size-8 text-muted-foreground/60" />
                  <h2 className="mt-3 text-sm font-medium">No issues assigned to this milestone</h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                     Assign issues from the issue details panel or while creating an issue to build this plan.
                  </p>
               </div>
            ) : (
               <GroupedIssuesView
                  issues={displayedIssues}
                  totalIssues={milestoneIssues}
                  statuses={displayOrderedStatus}
                  isViewTypeGrid={view === 'board'}
               />
            )}
         </div>
      </div>
   );
}
