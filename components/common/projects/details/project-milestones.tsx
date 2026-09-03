'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ArrowRight, Calendar, Check, Flag, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ProjectSidePanel } from '@/components/common/projects/details/project-side-panel';
import { useProjectMilestones } from '@/components/common/projects/details/use-project-milestones';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceIssue } from '@/lib/issues/types';
import type { ProjectMilestoneDto } from '@/lib/project-milestones/contracts';
import { getProjectDetail } from '@/mock-data/project-details';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectMilestonesStore } from '@/store/project-milestones-store';
import { useProjectsStore } from '@/store/projects-store';
import { cn } from '@/lib/utils';

interface ProjectMilestonesProps {
   projectId: string;
}

function formatTargetDate(value: string | null) {
   return value ? format(parseISO(value), 'MMM d, yyyy') : 'No target date';
}

export default function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
   const { orgId } = useParams<{ orgId: string }>();
   const workspace = useWorkspace();
   const storedProject = useProjectsStore((state) =>
      state.projects.find((item) => item.id === projectId)
   );
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const projectsLoading = useProjectsStore((state) => state.loading);
   const { issues: allIssues } = useIssuesStore();
   const issues = useMemo(
      () => allIssues.filter((issue) => issue.project?.id === projectId),
      [allIssues, projectId]
   );
   const detail = getProjectDetail(projectId);
   const { milestones, loading } = useProjectMilestones(projectId);
   const addMilestone = useProjectMilestonesStore((state) => state.addProjectMilestone);
   const patchMilestone = useProjectMilestonesStore((state) => state.updateProjectMilestone);
   const removeMilestone = useProjectMilestonesStore((state) => state.removeProjectMilestone);

   const [showCreate, setShowCreate] = useState(false);
   const [name, setName] = useState('');
   const [targetDate, setTargetDate] = useState('');
   const [creating, setCreating] = useState(false);
   const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

   const workspaceReady = !workspace.configured || workspaceSlug === workspace.organization.slug;
   const project = workspaceReady ? storedProject : undefined;
   const canPersist = workspace.configured && workspace.user.role !== 'guest';

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

   if (!project) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            {projectsLoading ? 'Loading project…' : 'Project not found.'}
         </div>
      );
   }

   const organizationQuery = `organization=${encodeURIComponent(workspace.organization.slug)}`;
   const collectionEndpoint = `/api/projects/${encodeURIComponent(project.id)}/milestones?${organizationQuery}`;
   const itemEndpoint = (milestoneId: string) =>
      `/api/projects/${encodeURIComponent(project.id)}/milestones/${encodeURIComponent(milestoneId)}?${organizationQuery}`;

   const markPending = (milestoneId: string, pending: boolean) => {
      setPendingIds((current) => {
         const next = new Set(current);
         if (pending) next.add(milestoneId);
         else next.delete(milestoneId);
         return next;
      });
   };

   const handleCreate = async () => {
      const milestoneName = name.trim();
      if (!canPersist || !milestoneName || creating) return;

      setCreating(true);
      try {
         const response = await fetch(collectionEndpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               name: milestoneName,
               targetDate: targetDate || null,
            }),
         });
         if (!response.ok) {
            throw new Error(`Milestone create failed with ${response.status}.`);
         }

         const { milestone } = (await response.json()) as { milestone: ProjectMilestoneDto };
         addMilestone(project.id, milestone);
         setName('');
         setTargetDate('');
         setShowCreate(false);
      } catch {
         toast.error('Unable to create project milestone.');
      } finally {
         setCreating(false);
      }
   };

   const handleToggle = async (milestone: ProjectMilestoneDto) => {
      if (!canPersist || pendingIds.has(milestone.id)) return;

      const completed = !milestone.completed;
      patchMilestone(project.id, milestone.id, { completed });
      markPending(milestone.id, true);

      try {
         const response = await fetch(itemEndpoint(milestone.id), {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ completed }),
         });
         if (!response.ok) {
            throw new Error(`Milestone update failed with ${response.status}.`);
         }

         const { milestone: savedMilestone } = (await response.json()) as {
            milestone: ProjectMilestoneDto;
         };
         patchMilestone(project.id, milestone.id, savedMilestone);
      } catch {
         patchMilestone(project.id, milestone.id, { completed: milestone.completed });
         toast.error('Unable to update project milestone.');
      } finally {
         markPending(milestone.id, false);
      }
   };

   const handleDelete = async (milestone: ProjectMilestoneDto) => {
      if (!canPersist || pendingIds.has(milestone.id)) return;
      if (!window.confirm(`Delete milestone “${milestone.name}”?`)) return;

      removeMilestone(project.id, milestone.id);
      markPending(milestone.id, true);

      try {
         const response = await fetch(itemEndpoint(milestone.id), {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
         });
         if (!response.ok) {
            throw new Error(`Milestone delete failed with ${response.status}.`);
         }
      } catch {
         addMilestone(project.id, milestone);
         toast.error('Unable to delete project milestone.');
      } finally {
         markPending(milestone.id, false);
      }
   };

   return (
      <div className="flex h-full w-full overflow-hidden">
         <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-6 py-8 lg:px-10">
               <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                     <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-muted/60">
                        <Flag className="size-5" />
                     </div>
                     <h1 className="text-2xl font-semibold tracking-tight">Project milestones</h1>
                     <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Break {project.name} into concrete stages and keep delivery checkpoints visible to the workspace.
                     </p>
                  </div>
                  {canPersist && (
                     <Button onClick={() => setShowCreate((value) => !value)} className="gap-1.5">
                        <Plus className="size-4" />
                        Add milestone
                     </Button>
                  )}
               </div>

               {!workspace.configured && (
                  <div className="mt-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                     Demo milestones are read-only until the workspace is connected to Supabase.
                  </div>
               )}

               {showCreate && canPersist && (
                  <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
                     <div className="grid gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
                        <label className="grid gap-1.5 text-sm font-medium">
                           Milestone name
                           <Input
                              value={name}
                              onChange={(event) => setName(event.target.value)}
                              maxLength={160}
                              placeholder="e.g. Private beta ready"
                              autoFocus
                           />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                           Target date
                           <Input
                              type="date"
                              value={targetDate}
                              onChange={(event) => setTargetDate(event.target.value)}
                           />
                        </label>
                        <div className="flex gap-2">
                           <Button
                              onClick={() => void handleCreate()}
                              disabled={creating || name.trim() === ''}
                           >
                              {creating ? 'Adding…' : 'Add'}
                           </Button>
                           <Button
                              variant="outline"
                              onClick={() => {
                                 setShowCreate(false);
                                 setName('');
                                 setTargetDate('');
                              }}
                              disabled={creating}
                           >
                              Cancel
                           </Button>
                        </div>
                     </div>
                  </div>
               )}

               <div className="mt-8 overflow-hidden rounded-xl border bg-card">
                  <div className="border-b px-4 py-3 text-sm font-medium">
                     {displayedMilestones.length} {displayedMilestones.length === 1 ? 'milestone' : 'milestones'}
                  </div>

                  {workspace.configured && loading ? (
                     <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">
                        Loading project milestones…
                     </p>
                  ) : displayedMilestones.length === 0 ? (
                     <div className="px-6 py-12 text-center">
                        <Flag className="mx-auto size-8 text-muted-foreground/60" />
                        <h2 className="mt-3 text-sm font-medium">No milestones yet</h2>
                        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                           Add the first delivery checkpoint to make the project plan easier to track.
                        </p>
                     </div>
                  ) : (
                     <div className="divide-y">
                        {displayedMilestones.map((milestone) => {
                           const pending = pendingIds.has(milestone.id);
                           const milestoneIssues = issues.filter(
                              (issue) => (issue as WorkspaceIssue).milestoneId === milestone.id
                           );
                           const canceledCount = milestoneIssues.filter(
                              (issue) => issue.status.category === 'canceled'
                           ).length;
                           const plannedCount = Math.max(0, milestoneIssues.length - canceledCount);
                           const completedCount = milestoneIssues.filter(
                              (issue) => issue.status.category === 'completed'
                           ).length;
                           const progress =
                              plannedCount === 0
                                 ? 0
                                 : Math.round((completedCount / plannedCount) * 100);
                           return (
                              <div key={milestone.id} className="flex items-center gap-3 px-4 py-3.5">
                                 <button
                                    type="button"
                                    onClick={() => void handleToggle(milestone)}
                                    disabled={!canPersist || pending}
                                    aria-label={
                                       milestone.completed
                                          ? `Mark ${milestone.name} incomplete`
                                          : `Mark ${milestone.name} complete`
                                    }
                                    className={cn(
                                       'flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                                       milestone.completed
                                          ? 'border-primary bg-primary text-primary-foreground'
                                          : 'border-muted-foreground/40 hover:border-foreground',
                                       (!canPersist || pending) && 'cursor-default opacity-70'
                                    )}
                                 >
                                    {milestone.completed && <Check className="size-3" />}
                                 </button>

                                 <div className="min-w-0 flex-1">
                                    <Link
                                       href={`/${orgId}/project/${project.id}/milestones/${milestone.id}`}
                                       className={cn(
                                          'truncate text-sm font-medium hover:underline',
                                          milestone.completed && 'text-muted-foreground line-through'
                                       )}
                                    >
                                       {milestone.name}
                                    </Link>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                       <span className="flex items-center gap-1.5">
                                          <Calendar className="size-3" />
                                          {formatTargetDate(milestone.targetDate)}
                                       </span>
                                       <span>
                                          {milestoneIssues.length} {milestoneIssues.length === 1 ? 'issue' : 'issues'}
                                       </span>
                                       {plannedCount > 0 && <span>{progress}% complete</span>}
                                    </div>
                                    <div className="mt-2 h-1 max-w-64 overflow-hidden rounded-full bg-muted">
                                       <div
                                          className="h-full rounded-full bg-foreground transition-[width]"
                                          style={{ width: `${progress}%` }}
                                          aria-hidden="true"
                                       />
                                    </div>
                                 </div>

                                 <span
                                    className={cn(
                                       'hidden rounded-full border px-2 py-0.5 text-xs sm:inline-flex',
                                       milestone.completed
                                          ? 'text-muted-foreground'
                                          : 'text-foreground'
                                    )}
                                 >
                                    {milestone.completed ? 'Completed' : 'Open'}
                                 </span>

                                 <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" asChild>
                                    <Link
                                       href={`/${orgId}/project/${project.id}/milestones/${milestone.id}`}
                                       aria-label={`Open ${milestone.name} plan`}
                                    >
                                       <ArrowRight className="size-4" />
                                    </Link>
                                 </Button>

                                 {canPersist && (
                                    <Button
                                       variant="ghost"
                                       size="icon"
                                       className="size-8 text-muted-foreground hover:text-destructive"
                                       onClick={() => void handleDelete(milestone)}
                                       disabled={pending}
                                       aria-label={`Delete ${milestone.name}`}
                                    >
                                       <Trash2 className="size-4" />
                                    </Button>
                                 )}
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>
         </div>

         <ProjectSidePanel project={project} detail={detail} issues={issues} />
      </div>
   );
}
