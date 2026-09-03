import type { WorkspaceIssue } from '@/lib/issues/types';
import { groupIssuesByStatus, Issue, issues as mockIssues } from '@/mock-data/issues';
import { LabelInterface } from '@/mock-data/labels';
import { Priority } from '@/mock-data/priorities';
import { Project } from '@/mock-data/projects';
import { Status } from '@/mock-data/status';
import { User } from '@/mock-data/users';
import { create } from 'zustand';

interface FilterOptions {
   status?: string[];
   assignee?: string[];
   priority?: string[];
   labels?: string[];
   project?: string[];
   cycle?: string[];
   statusType?: string[];
}

interface IssuePersistenceAdapter {
   update: (id: string, changes: Partial<Issue>) => Promise<void>;
   delete: (id: string) => Promise<void>;
   addLabel?: (issueId: string, labelId: string) => Promise<void>;
   removeLabel?: (issueId: string, labelId: string) => Promise<void>;
   onError: (message: string) => void;
}

interface IssuesState {
   issues: Issue[];
   issuesByStatus: Record<string, Issue[]>;
   persistenceAdapter: IssuePersistenceAdapter | null;
   getAllIssues: () => Issue[];
   replaceIssues: (issues: Issue[]) => void;
   setPersistenceAdapter: (adapter: IssuePersistenceAdapter | null) => void;
   addIssue: (issue: Issue) => void;
   updateIssue: (id: string, updatedIssue: Partial<Issue>) => void;
   deleteIssue: (id: string) => Promise<void>;
   filterByStatus: (statusId: string) => Issue[];
   filterByPriority: (priorityId: string) => Issue[];
   filterByAssignee: (userId: string | null) => Issue[];
   filterByLabel: (labelId: string) => Issue[];
   filterByProject: (projectId: string) => Issue[];
   filterByCycle: (cycleId: string) => Issue[];
   searchIssues: (query: string) => Issue[];
   filterIssues: (filters: FilterOptions) => Issue[];
   updateIssueStatus: (issueId: string, newStatus: Status) => void;
   updateIssuePriority: (issueId: string, newPriority: Priority) => void;
   updateIssueAssignee: (issueId: string, newAssignee: User | null) => void;
   addIssueLabel: (issueId: string, label: LabelInterface) => void;
   removeIssueLabel: (issueId: string, labelId: string) => void;
   updateIssueProject: (issueId: string, newProject: Project | undefined) => void;
   clearProjectReferences: (projectId: string) => void;
   getIssueById: (id: string) => Issue | undefined;
}

const initialIssues = [...mockIssues].sort((a, b) => b.rank.localeCompare(a.rank));

function restoreRejectedChanges(
   currentIssue: Issue,
   previousIssue: Issue,
   rejectedChanges: Partial<Issue>
) {
   const restoredIssue = { ...currentIssue };
   for (const key of Object.keys(rejectedChanges) as (keyof Issue)[]) {
      if (Object.is(currentIssue[key], rejectedChanges[key])) {
         Object.assign(restoredIssue, { [key]: previousIssue[key] });
      }
   }
   return restoredIssue;
}

function replaceIssueLabels(
   issues: Issue[],
   issueId: string,
   update: (labels: LabelInterface[]) => LabelInterface[]
) {
   return issues.map((issue) =>
      issue.id === issueId ? { ...issue, labels: update(issue.labels) } : issue
   );
}

export const useIssuesStore = create<IssuesState>((set, get) => ({
   issues: initialIssues,
   issuesByStatus: groupIssuesByStatus(initialIssues),
   persistenceAdapter: null,

   getAllIssues: () => get().issues,
   replaceIssues: (issues) => {
      const sortedIssues = [...issues].sort((a, b) => b.rank.localeCompare(a.rank));
      set({ issues: sortedIssues, issuesByStatus: groupIssuesByStatus(sortedIssues) });
   },
   setPersistenceAdapter: (persistenceAdapter) => set({ persistenceAdapter }),

   addIssue: (issue: Issue) => {
      set((state) => {
         const newIssues = [...state.issues, issue];
         return { issues: newIssues, issuesByStatus: groupIssuesByStatus(newIssues) };
      });
   },

   updateIssue: (id: string, updatedIssue: Partial<Issue>) => {
      const previousIssue = get().issues.find((issue) => issue.id === id);
      set((state) => {
         const newIssues = state.issues.map((issue) =>
            issue.id === id ? { ...issue, ...updatedIssue } : issue
         );
         return { issues: newIssues, issuesByStatus: groupIssuesByStatus(newIssues) };
      });

      const adapter = get().persistenceAdapter;
      if (adapter && previousIssue) {
         void adapter.update(id, updatedIssue).catch(() => {
            if (get().persistenceAdapter !== adapter) return;
            set((state) => {
               const restoredIssues = state.issues.map((issue) =>
                  issue.id === id
                     ? restoreRejectedChanges(issue, previousIssue, updatedIssue)
                     : issue
               );
               return {
                  issues: restoredIssues,
                  issuesByStatus: groupIssuesByStatus(restoredIssues),
               };
            });
            adapter.onError('The issue update was not saved. Your change was reverted.');
         });
      }
   },

   deleteIssue: async (id: string) => {
      const deletedIssue = get().issues.find((issue) => issue.id === id);
      if (!deletedIssue) return;
      set((state) => {
         const newIssues = state.issues.filter((issue) => issue.id !== id);
         return { issues: newIssues, issuesByStatus: groupIssuesByStatus(newIssues) };
      });

      const adapter = get().persistenceAdapter;
      if (adapter) {
         try {
            await adapter.delete(id);
         } catch (error) {
            if (get().persistenceAdapter === adapter) {
               set((state) => {
                  if (state.issues.some((issue) => issue.id === id)) return state;
                  const restoredIssues = [...state.issues, deletedIssue].sort((a, b) =>
                     b.rank.localeCompare(a.rank)
                  );
                  return {
                     issues: restoredIssues,
                     issuesByStatus: groupIssuesByStatus(restoredIssues),
                  };
               });
               adapter.onError('The issue could not be deleted. It has been restored.');
            }
            throw error;
         }
      }
   },

   filterByStatus: (statusId: string) => get().issues.filter((issue) => issue.status.id === statusId),
   filterByPriority: (priorityId: string) =>
      get().issues.filter((issue) => issue.priority.id === priorityId),
   filterByAssignee: (userId: string | null) => {
      if (userId === null) return get().issues.filter((issue) => issue.assignee === null);
      return get().issues.filter((issue) => issue.assignee?.id === userId);
   },
   filterByLabel: (labelId: string) =>
      get().issues.filter((issue) => issue.labels.some((label) => label.id === labelId)),
   filterByProject: (projectId: string) =>
      get().issues.filter((issue) => issue.project?.id === projectId),
   filterByCycle: (cycleId: string) => get().issues.filter((issue) => issue.cycleId === cycleId),
   searchIssues: (query: string) => {
      const lowerCaseQuery = query.toLowerCase();
      return get().issues.filter(
         (issue) =>
            issue.title.toLowerCase().includes(lowerCaseQuery) ||
            issue.identifier.toLowerCase().includes(lowerCaseQuery)
      );
   },
   filterIssues: (filters: FilterOptions) => {
      let filteredIssues = get().issues;
      if (filters.status?.length) {
         filteredIssues = filteredIssues.filter((issue) => filters.status!.includes(issue.status.id));
      }
      if (filters.assignee?.length) {
         filteredIssues = filteredIssues.filter((issue) => {
            if (filters.assignee!.includes('unassigned') && issue.assignee === null) return true;
            return issue.assignee && filters.assignee!.includes(issue.assignee.id);
         });
      }
      if (filters.priority?.length) {
         filteredIssues = filteredIssues.filter((issue) =>
            filters.priority!.includes(issue.priority.id)
         );
      }
      if (filters.labels?.length) {
         filteredIssues = filteredIssues.filter((issue) =>
            issue.labels.some((label) => filters.labels!.includes(label.id))
         );
      }
      if (filters.project?.length) {
         filteredIssues = filteredIssues.filter(
            (issue) => issue.project && filters.project!.includes(issue.project.id)
         );
      }
      if (filters.cycle?.length) {
         filteredIssues = filteredIssues.filter((issue) => {
            if (filters.cycle!.includes('no-cycle') && issue.cycleId === '') return true;
            return filters.cycle!.includes(issue.cycleId);
         });
      }
      if (filters.statusType?.length) {
         filteredIssues = filteredIssues.filter((issue) =>
            filters.statusType!.includes(issue.status.category)
         );
      }
      return filteredIssues;
   },

   updateIssueStatus: (issueId: string, newStatus: Status) => {
      get().updateIssue(issueId, { status: newStatus });
   },
   updateIssuePriority: (issueId: string, newPriority: Priority) => {
      get().updateIssue(issueId, { priority: newPriority });
   },
   updateIssueAssignee: (issueId: string, newAssignee: User | null) => {
      get().updateIssue(issueId, { assignee: newAssignee });
   },

   addIssueLabel: (issueId: string, label: LabelInterface) => {
      const issue = get().getIssueById(issueId);
      if (!issue || issue.labels.some((item) => item.id === label.id)) return;
      set((state) => {
         const nextIssues = replaceIssueLabels(state.issues, issueId, (labels) => [...labels, label]);
         return { issues: nextIssues, issuesByStatus: groupIssuesByStatus(nextIssues) };
      });

      const adapter = get().persistenceAdapter;
      if (adapter?.addLabel) {
         void adapter.addLabel(issueId, label.id).catch(() => {
            if (get().persistenceAdapter !== adapter) return;
            set((state) => {
               const nextIssues = replaceIssueLabels(state.issues, issueId, (labels) =>
                  labels.filter((item) => item.id !== label.id)
               );
               return { issues: nextIssues, issuesByStatus: groupIssuesByStatus(nextIssues) };
            });
            adapter.onError('The label was not added. Your change was reverted.');
         });
      }
   },

   removeIssueLabel: (issueId: string, labelId: string) => {
      const issue = get().getIssueById(issueId);
      const removedLabel = issue?.labels.find((label) => label.id === labelId);
      if (!issue || !removedLabel) return;
      set((state) => {
         const nextIssues = replaceIssueLabels(state.issues, issueId, (labels) =>
            labels.filter((label) => label.id !== labelId)
         );
         return { issues: nextIssues, issuesByStatus: groupIssuesByStatus(nextIssues) };
      });

      const adapter = get().persistenceAdapter;
      if (adapter?.removeLabel) {
         void adapter.removeLabel(issueId, labelId).catch(() => {
            if (get().persistenceAdapter !== adapter) return;
            set((state) => {
               const nextIssues = replaceIssueLabels(state.issues, issueId, (labels) =>
                  labels.some((label) => label.id === removedLabel.id)
                     ? labels
                     : [...labels, removedLabel]
               );
               return { issues: nextIssues, issuesByStatus: groupIssuesByStatus(nextIssues) };
            });
            adapter.onError('The label was not removed. Your change was reverted.');
         });
      }
   },

   updateIssueProject: (issueId: string, newProject: Project | undefined) => {
      get().updateIssue(
         issueId,
         { project: newProject, milestoneId: null } as Partial<WorkspaceIssue> as Partial<Issue>
      );
   },
   clearProjectReferences: (projectId: string) => {
      set((state) => {
         const issues = state.issues.map((issue) =>
            issue.project?.id === projectId
               ? ({ ...issue, project: undefined, milestoneId: null } as WorkspaceIssue)
               : issue
         );
         return { issues, issuesByStatus: groupIssuesByStatus(issues) };
      });
   },
   getIssueById: (id: string) => get().issues.find((issue) => issue.id === id),
}));