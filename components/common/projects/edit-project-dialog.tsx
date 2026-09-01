'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectStatus, ProjectUpdate } from '@/lib/projects/contracts';
import { projectToProjectStatus } from '@/lib/projects/mapper';
import type { Project } from '@/mock-data/projects';
import { useProjectsStore } from '@/store/projects-store';

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
   { value: 'planned', label: 'Planned' },
   { value: 'active', label: 'Active' },
   { value: 'paused', label: 'Paused' },
   { value: 'completed', label: 'Completed' },
   { value: 'canceled', label: 'Canceled' },
];

export function EditProjectDialog({ project }: { project: Project }) {
   const workspace = useWorkspace();
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const updateProject = useProjectsStore((state) => state.updateProject);
   const [open, setOpen] = useState(false);
   const [name, setName] = useState(project.name);
   const [description, setDescription] = useState(project.description ?? '');
   const [status, setStatus] = useState<ProjectStatus>(() => projectToProjectStatus(project));
   const [targetDate, setTargetDate] = useState(project.targetDate ?? '');
   const [submitting, setSubmitting] = useState(false);
   const workspaceReady = !workspace.configured || workspaceSlug === workspace.organization.slug;
   const canWrite = !workspace.configured || workspace.user.role !== 'guest';

   const setDialogOpen = (nextOpen: boolean) => {
      if (submitting) return;
      if (nextOpen) {
         setName(project.name);
         setDescription(project.description ?? '');
         setStatus(projectToProjectStatus(project));
         setTargetDate(project.targetDate ?? '');
      }
      setOpen(nextOpen);
   };

   const saveProject = async () => {
      if (!canWrite || !workspaceReady || submitting) return;
      const trimmedName = name.trim();
      if (!trimmedName) {
         toast.error('Project name is required.');
         return;
      }

      const normalizedDescription = description.trim();
      const currentDescription = project.description ?? '';
      const normalizedTargetDate = targetDate || null;
      const currentTargetDate = project.targetDate ?? null;
      const changes: ProjectUpdate = {
         ...(trimmedName !== project.name && { name: trimmedName }),
         ...(normalizedDescription !== currentDescription && {
            description: normalizedDescription,
         }),
         ...(status !== projectToProjectStatus(project) && { status }),
         ...(normalizedTargetDate !== currentTargetDate && {
            targetDate: normalizedTargetDate,
         }),
      };
      if (Object.keys(changes).length === 0) {
         setOpen(false);
         return;
      }

      setSubmitting(true);
      try {
         await updateProject(project.id, changes);
         toast.success('Project updated');
         setOpen(false);
      } catch {
         // The persistence adapter restores rejected fields and reports the actionable error.
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={setDialogOpen}>
         <DialogTrigger asChild>
            <Button
               type="button"
               variant="ghost"
               size="icon"
               className="size-7 text-muted-foreground"
               aria-label={`Edit ${project.name}`}
               disabled={!workspaceReady || !canWrite}
            >
               <Pencil className="size-3.5" />
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Edit project</DialogTitle>
               <DialogDescription>
                  Update the project name, description, lifecycle status, and target date.
               </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
               <div className="grid gap-2">
                  <Label htmlFor="edit-project-name">Name</Label>
                  <Input
                     id="edit-project-name"
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                     maxLength={160}
                     autoFocus
                  />
               </div>
               <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-4">
                     <Label htmlFor="edit-project-description">Description</Label>
                     <span className="text-xs text-muted-foreground" aria-live="polite">
                        {description.length.toLocaleString()}/20,000
                     </span>
                  </div>
                  <Textarea
                     id="edit-project-description"
                     value={description}
                     onChange={(event) => setDescription(event.target.value)}
                     maxLength={20000}
                     rows={7}
                     placeholder="Add context, goals, constraints, or success criteria for this project."
                  />
               </div>
               <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                     <Label htmlFor="edit-project-status">Status</Label>
                     <select
                        id="edit-project-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                     >
                        {PROJECT_STATUSES.map((item) => (
                           <option key={item.value} value={item.value}>
                              {item.label}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="edit-project-target-date">Target date</Label>
                     <Input
                        id="edit-project-target-date"
                        type="date"
                        value={targetDate}
                        onChange={(event) => setTargetDate(event.target.value)}
                     />
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                  Cancel
               </Button>
               <Button
                  onClick={() => void saveProject()}
                  disabled={submitting || !workspaceReady || !canWrite}
               >
                  {submitting ? 'Saving…' : 'Save changes'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
