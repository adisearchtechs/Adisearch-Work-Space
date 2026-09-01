import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Heart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RiEditLine } from '@remixicon/react';
import { useState, useEffect, useCallback } from 'react';
import { Issue } from '@/mock-data/issues';
import { priorities } from '@/mock-data/priorities';
import { status } from '@/mock-data/status';
import { useIssuesStore } from '@/store/issues-store';
import { useCreateIssueStore } from '@/store/create-issue-store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { StatusSelector } from './status-selector';
import { PrioritySelector } from './priority-selector';
import { AssigneeSelector } from './assignee-selector';
import { ProjectSelector } from './project-selector';
import { LabelSelector } from './label-selector';
import { ranks } from '@/mock-data/issues';
import { DialogTitle } from '@radix-ui/react-dialog';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { IssueDto } from '@/lib/issues/contracts';
import { issueDtoToIssue } from '@/lib/issues/mapper';
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
   const [createMore, setCreateMore] = useState<boolean>(false);
   const [submitting, setSubmitting] = useState(false);
   const workspace = useWorkspace();
   const { isOpen, defaultStatus, openModal, closeModal } = useCreateIssueStore();
   const { addIssue, getAllIssues } = useIssuesStore();
   const projects = useProjectsStore((state) => state.projects);

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

   const createDefaultData = useCallback(() => {
      const identifier = generateUniqueIdentifier();
      return {
         id: uuidv4(),
         identifier: `LNUI-${identifier}`,
         title: '',
         description: '',
         status: defaultStatus || status.find((s) => s.id === 'to-do')!,
         assignee: null,
         priority: priorities.find((p) => p.id === 'no-priority')!,
         labels: [],
         createdAt: new Date().toISOString(),
         cycleId: '',
         project: undefined,
         subissues: [],
         rank: ranks[ranks.length - 1],
      };
   }, [defaultStatus, generateUniqueIdentifier]);

   const [addIssueForm, setAddIssueForm] = useState<Issue>(createDefaultData());

   useEffect(() => {
      setAddIssueForm(createDefaultData());
   }, [createDefaultData]);

   const createIssue = async () => {
      if (!addIssueForm.title) {
         toast.error('Title is required');
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
                  teamKey: 'CORE',
                  title: addIssueForm.title,
                  description: addIssueForm.description,
                  statusSlug: addIssueForm.status.id,
                  priority: addIssueForm.priority.id,
                  projectId: addIssueForm.project?.id ?? null,
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
      if (!createMore) {
         closeModal();
      }
      setAddIssueForm(createDefaultData());
   };

   return (
      <Dialog open={isOpen} onOpenChange={(value) => (value ? openModal() : closeModal())}>
         <DialogContent className="w-full sm:max-w-[750px] p-0 shadow-xl top-[30%]">
            <DialogHeader>
               <DialogTitle>
                  <div className="flex items-center px-4 pt-4 gap-2">
                     <Button size="sm" variant="outline" className="gap-1.5">
                        <Heart className="size-4 text-orange-500 fill-orange-500" />
                        <span className="font-medium">CORE</span>
                     </Button>
                  </div>
               </DialogTitle>
            </DialogHeader>

            <div className="px-4 pb-0 space-y-3 w-full">
               <Input
                  className="border-none w-full shadow-none outline-none text-2xl font-medium px-0 h-auto focus-visible:ring-0 overflow-hidden text-ellipsis whitespace-normal break-words"
                  placeholder="Issue title"
                  value={addIssueForm.title}
                  onChange={(e) => setAddIssueForm({ ...addIssueForm, title: e.target.value })}
               />

               <Textarea
                  className="border-none w-full shadow-none outline-none resize-none px-0 min-h-16 focus-visible:ring-0 break-words whitespace-normal overflow-wrap"
                  placeholder="Add description..."
                  value={addIssueForm.description}
                  onChange={(e) =>
                     setAddIssueForm({ ...addIssueForm, description: e.target.value })
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
                        setAddIssueForm({ ...addIssueForm, project: newProject })
                     }
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
               <Button size="sm" disabled={submitting} onClick={() => void createIssue()}>
                  {submitting ? 'Creating…' : 'Create issue'}
               </Button>
            </div>
         </DialogContent>
      </Dialog>
   );
}
