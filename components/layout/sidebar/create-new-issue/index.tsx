import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RiEditLine } from '@remixicon/react';
import { useState, useEffect, useCallback } from 'react';
import { priorities } from '@/mock-data/priorities';
import { status } from '@/mock-data/status';
import { useIssuesStore } from '@/store/issues-store';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { useTeamsStore } from '@/store/teams-store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { StatusSelector } from './status-selector';
import { PrioritySelector } from './priority-selector';
import { AssigneeSelector } from './assignee-selector';
import { ProjectSelector } from './project-selector';
import { MilestoneSelector } from './milestone-selector';
import { LabelSelector } from './label-selector';
import { ranks } from '@/mock-data/issues';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { IssueDto } from '@/lib/issues/contracts';
import { issueDtoToIssue } from '@/lib/issues/mapper';
import type { WorkspaceIssue } from '@/lib/issues/types';
import { useProjectsStore } from '@/store/projects-store';

export function CreateIssueTrigger() {
   const openModal = useCreateIssueStore((state) => state.openModal);

   return (
      <Button
         type="button"
         className="size-8 shrink-0"
         variant="secondary"
         size="icon"
         aria-label="Create issue"
         title="Create issue"
         onClick={() => openModal()}
      >
         <RiEditLine aria-hidden="true" />
      </Button>
   );
}

export function CreateNewIssue() {
   const [createMore, setCreateMore] = useState(false);
   const [submitting, setSubmitting] = useState(false);
   const [teamKey, setTeamKey] = useState('CORE');
   const workspace = useWorkspace();
   const { isOpen, defaultStatus, openModal, closeModal } = useCreateIssueStore();
   const { addIssue, getAllIssues } = useIssuesStore();
   const projects = useProjectsStore((state) => state.projects);
   const teams = useTeamsStore((state) => state.teams);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const teamsWorkspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsReady =
      !workspace.configured ||
      (teamsWorkspaceSlug === workspace.organization.slug && !teamsLoading);

   useEffect(() => {
      if (!workspace.configured || !teamsReady || teams.length === 0) return;
      if (teams.some((team) => team.key === teamKey)) return;
      setTeamKey(teams.find((team) => team.key === 'CORE')?.key ?? teams[0].key);
   }, [teamKey, teams, teamsReady, workspace.configured]);

   const generateUniqueIdentifier = useCallback(() => {
      const identifiers = getAllIssues().map((issue) => issue.identifier);
      let identifier = Math.floor(Math.random() * 999)
         .toString()
         .padStart(3, '0');
      while (identifiers.includes(`LNUI-${identifier}`)) {
         identifier = Math.floor(Math.random() * 999)
            .toString()
            .padStart(3, '0');
      }
      return identifier;
   }, [getAllIssues]);

   const createDefaultData = useCallback((): WorkspaceIssue => {
      const identifier = generateUniqueIdentifier();
      return {
         id: uuidv4(),
         identifier: `LNUI-${identifier}`,
         title: '',
         description: '',
         status: defaultStatus || status.find((item) => item.id === 'to-do')!,
         assignee: null,
         priority: priorities.find((item) => item.id === 'no-priority')!,
         labels: [],
         createdAt: new Date().toISOString(),
         cycleId: '',
         project: undefined,
         milestoneId: null,
         subissues: [],
         rank: ranks[ranks.length - 1],
      };
   }, [defaultStatus, generateUniqueIdentifier]);

   const [addIssueForm, setAddIssueForm] = useState<WorkspaceIssue>(createDefaultData());

   useEffect(() => {
      setAddIssueForm(createDefaultData());
   }, [createDefaultData]);

   const createIssue = async () => {
      if (!addIssueForm.title.trim()) {
         toast.error('Title is required');
         return;
      }
      if (workspace.configured && (!teamsReady || !teams.some((team) => team.key === teamKey))) {
         toast.error('Choose a valid workspace team.');
         return;
      }

      setSubmitting(true);
      try {
         if (workspace.configured) {
            const response = await fetch('/api/issues', {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  organizationSlug: workspace.organization.slug,
                  teamKey,
                  title: addIssueForm.title.trim(),
                  description: addIssueForm.description,
                  statusSlug: addIssueForm.status.id,
                  priority: addIssueForm.priority.id,
                  projectId: addIssueForm.project?.id ?? null,
                  milestoneId: addIssueForm.milestoneId ?? null,
                  assigneeId: addIssueForm.assignee?.id ?? null,
                  labelIds: addIssueForm.labels.map((label) => label.id),
               }),
            });

            if (!response.ok) {
               throw new Error(`Issue creation failed with ${response.status}.`);
            }

            const { issue } = (await response.json()) as { issue: IssueDto };
            addIssue(
               issueDtoToIssue(issue, new Map(projects.map((project) => [project.id, project])))
            );
         } else {
            addIssue(addIssueForm);
         }
      } catch {
         toast.error('Issue could not be created. Try again.');
         return;
      } finally {
         setSubmitting(false);
      }

      toast.success('Issue created');
      if (!createMore) closeModal();
      setAddIssueForm(createDefaultData());
   };

   return (
      <Dialog open={isOpen} onOpenChange={(value) => (value ? openModal() : closeModal())}>
         <DialogContent className="w-full sm:max-w-[750px] p-0 shadow-xl top-[30%]">
            <DialogHeader>
               <DialogTitle>
                  <div className="flex items-center px-4 pt-4 gap-2">
                     {workspace.configured ? (
                        <label className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm">
                           <span
                              className="size-2.5 rounded-full border"
                              style={{
                                 backgroundColor:
                                    teams.find((team) => team.key === teamKey)?.color ?? 'transparent',
                              }}
                           />
                           <span className="sr-only">Issue team</span>
                           <select
                              aria-label="Issue team"
                              className="bg-transparent font-medium outline-none"
                              value={teamKey}
                              onChange={(event) => setTeamKey(event.target.value)}
                              disabled={!teamsReady || submitting}
                           >
                              {teams.map((team) => (
                                 <option key={team.id} value={team.key}>
                                    {team.name} ({team.issuePrefix})
                                 </option>
                              ))}
                           </select>
                        </label>
                     ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" disabled>
                           <span className="size-2.5 rounded-full bg-orange-500" />
                           <span className="font-medium">CORE</span>
                        </Button>
                     )}
                  </div>
               </DialogTitle>
            </DialogHeader>

            <div className="px-4 pb-0 space-y-3 w-full">
               <Input
                  className="border-none w-full shadow-none outline-none text-2xl font-medium px-0 h-auto focus-visible:ring-0 overflow-hidden text-ellipsis whitespace-normal break-words"
                  placeholder="Issue title"
                  value={addIssueForm.title}
                  onChange={(event) =>
                     setAddIssueForm({ ...addIssueForm, title: event.target.value })
                  }
               />

               <Textarea
                  className="border-none w-full shadow-none outline-none resize-none px-0 min-h-16 focus-visible:ring-0 break-words whitespace-normal overflow-wrap"
                  placeholder="Add description..."
                  value={addIssueForm.description}
                  onChange={(event) =>
                     setAddIssueForm({ ...addIssueForm, description: event.target.value })
                  }
               />

               <div className="w-full flex items-center justify-start gap-1.5 flex-wrap">
                  <StatusSelector
                     status={addIssueForm.status}
                     onChange={(newStatus) =>
                        setAddIssueForm({ ...addIssueForm, status: newStatus })
                     }
                  />
                  <PrioritySelector
                     priority={addIssueForm.priority}
                     onChange={(newPriority) =>
                        setAddIssueForm({ ...addIssueForm, priority: newPriority })
                     }
                  />
                  <AssigneeSelector
                     assignee={addIssueForm.assignee}
                     onChange={(newAssignee) =>
                        setAddIssueForm({ ...addIssueForm, assignee: newAssignee })
                     }
                  />
                  <ProjectSelector
                     project={addIssueForm.project}
                     onChange={(newProject) =>
                        setAddIssueForm({
                           ...addIssueForm,
                           project: newProject,
                           milestoneId: null,
                        })
                     }
                  />
                  <MilestoneSelector
                     projectId={addIssueForm.project?.id}
                     milestoneId={addIssueForm.milestoneId}
                     onChange={(milestoneId) => setAddIssueForm({ ...addIssueForm, milestoneId })}
                  />
                  <LabelSelector
                     selectedLabels={addIssueForm.labels}
                     onChange={(newLabels) =>
                        setAddIssueForm({ ...addIssueForm, labels: newLabels })
                     }
                  />
               </div>
            </div>
            <div className="flex items-center justify-between py-2.5 px-4 w-full border-t">
               <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                     <Switch
                        id="create-more"
                        checked={createMore}
                        onCheckedChange={setCreateMore}
                     />
                     <Label htmlFor="create-more">Create more</Label>
                  </div>
               </div>
               <Button
                  size="sm"
                  disabled={
                     submitting ||
                     (workspace.configured && (!teamsReady || teams.length === 0))
                  }
                  onClick={() => void createIssue()}
               >
                  {submitting ? 'Creating…' : 'Create issue'}
               </Button>
            </div>
         </DialogContent>
      </Dialog>
   );
}