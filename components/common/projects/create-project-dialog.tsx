'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
import type { ProjectDto, ProjectStatus } from '@/lib/projects/contracts';
import { projectDtoToProject } from '@/lib/projects/mapper';
import { useProjectsStore } from '@/store/projects-store';

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
   { value: 'planned', label: 'Planned' },
   { value: 'active', label: 'Active' },
   { value: 'paused', label: 'Paused' },
   { value: 'completed', label: 'Completed' },
   { value: 'canceled', label: 'Canceled' },
];

export function CreateProjectDialog() {
   const workspace = useWorkspace();
   const teams = useProjectsStore((state) => state.teams);
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const addProject = useProjectsStore((state) => state.addProject);
   const [open, setOpen] = useState(false);
   const [name, setName] = useState('');
   const [teamKey, setTeamKey] = useState('');
   const [status, setStatus] = useState<ProjectStatus>('planned');
   const [targetDate, setTargetDate] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const workspaceReady = !workspace.configured || workspaceSlug === workspace.organization.slug;
   const canWrite = !workspace.configured || workspace.user.role !== 'guest';

   useEffect(() => {
      if (teams.length > 0 && !teams.some((team) => team.key === teamKey)) {
         setTeamKey(teams[0].key);
      }
   }, [teamKey, teams]);

   const reset = () => {
      setName('');
      setStatus('planned');
      setTargetDate('');
   };

   const createProject = async () => {
      if (!canWrite) return;
      const trimmedName = name.trim();
      if (!trimmedName) {
         toast.error('Project name is required.');
         return;
      }
      if (!teamKey) {
         toast.error('A team is required.');
         return;
      }

      setSubmitting(true);
      try {
         const requestedWorkspaceSlug = workspace.organization.slug;
         let project: ProjectDto;
         if (workspace.configured) {
            const response = await fetch('/api/projects', {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  organizationSlug: workspace.organization.slug,
                  teamKey,
                  name: trimmedName,
                  status,
                  targetDate: targetDate || null,
               }),
            });
            if (!response.ok) {
               throw new Error(`Project creation failed with ${response.status}.`);
            }
            ({ project } = (await response.json()) as { project: ProjectDto });
         } else {
            project = {
               id: crypto.randomUUID(),
               name: trimmedName,
               description: '',
               status,
               teamKey,
               createdAt: new Date().toISOString(),
               targetDate: targetDate || null,
               lead: null,
            };
         }

         if (
            workspace.configured &&
            useProjectsStore.getState().workspaceSlug !== requestedWorkspaceSlug
         ) {
            return;
         }

         addProject(projectDtoToProject(project));
         toast.success('Project created');
         reset();
         setOpen(false);
      } catch {
         toast.error('Project could not be created. Try again.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>
            <Button
               className="relative"
               size="xs"
               variant="secondary"
               disabled={!workspaceReady || !canWrite || teams.length === 0}
            >
               <Plus className="size-4" />
               <span className="hidden sm:inline ml-1">Create project</span>
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Create project</DialogTitle>
               <DialogDescription>
                  Add a tenant-scoped project for planning and grouping workspace issues.
               </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
               <div className="grid gap-2">
                  <Label htmlFor="project-name">Name</Label>
                  <Input
                     id="project-name"
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                     maxLength={160}
                     autoFocus
                     placeholder="Project name"
                  />
               </div>
               <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                     <Label htmlFor="project-team">Team</Label>
                     <select
                        id="project-team"
                        value={teamKey}
                        onChange={(event) => setTeamKey(event.target.value)}
                        className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                     >
                        {teams.map((team) => (
                           <option key={team.id} value={team.key}>
                              {team.name}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div className="grid gap-2">
                     <Label htmlFor="project-status">Status</Label>
                     <select
                        id="project-status"
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
               </div>
               <div className="grid gap-2">
                  <Label htmlFor="project-target-date">Target date</Label>
                  <Input
                     id="project-target-date"
                     type="date"
                     value={targetDate}
                     onChange={(event) => setTargetDate(event.target.value)}
                  />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
               </Button>
               <Button
                  onClick={() => void createProject()}
                  disabled={submitting || !workspaceReady || !canWrite || teams.length === 0}
               >
                  {submitting ? 'Creating…' : 'Create project'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
