'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { issueDtoToIssue } from '@/lib/issues/mapper';
import type { IssueDto } from '@/lib/issues/contracts';
import type { WorkspaceIssue } from '@/lib/issues/types';
import { useIssuesStore } from '@/store/issues-store';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useProjectsStore } from '@/store/projects-store';

function supportedChanges(changes: Partial<WorkspaceIssue>) {
   return {
      ...('title' in changes && changes.title !== undefined && { title: changes.title }),
      ...('description' in changes &&
         changes.description !== undefined && {
            description: changes.description,
         }),
      ...('status' in changes && changes.status && { statusSlug: changes.status.id }),
      ...('priority' in changes && changes.priority && { priority: changes.priority.id }),
      ...('dueDate' in changes && { dueDate: changes.dueDate ?? null }),
      ...('project' in changes && { projectId: changes.project?.id ?? null }),
      ...('milestoneId' in changes && { milestoneId: changes.milestoneId ?? null }),
      ...('assignee' in changes && { assigneeId: changes.assignee?.id ?? null }),
   };
}

async function mutation(url: string, method: 'PATCH' | 'DELETE', body?: object) {
   const response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
   });

   if (!response.ok) {
      throw new Error(`Issue mutation failed with ${response.status}.`);
   }
}

export function SaasIssuesProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const projectsWorkspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const projectsLoading = useProjectsStore((state) => state.loading);

   useEffect(() => {
      if (!workspace.configured) return;
      if (projectsWorkspaceSlug !== workspace.organization.slug || projectsLoading) return;

      const controller = new AbortController();
      const store = useIssuesStore.getState();
      const projectById = new Map(
         useProjectsStore.getState().projects.map((project) => [project.id, project])
      );
      store.replaceIssues([]);
      store.setPersistenceAdapter({
         async update(id, changes) {
            const body = supportedChanges(changes as Partial<WorkspaceIssue>);
            if (Object.keys(body).length === 0) return;
            await mutation(`/api/issues/${encodeURIComponent(id)}`, 'PATCH', body);
         },
         async delete(id) {
            await mutation(`/api/issues/${encodeURIComponent(id)}`, 'DELETE');
         },
         onError(message) {
            toast.error(message);
         },
      });

      void fetch(`/api/issues?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Issue load failed with ${response.status}.`);
            return (await response.json()) as { issues: IssueDto[] };
         })
         .then(({ issues }) => {
            if (controller.signal.aborted) return;
            useIssuesStore
               .getState()
               .replaceIssues(issues.map((issue) => issueDtoToIssue(issue, projectById)));
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load workspace issues.');
         });

      return () => {
         controller.abort();
         const currentStore = useIssuesStore.getState();
         currentStore.setPersistenceAdapter(null);
         currentStore.replaceIssues([]);
      };
   }, [projectsLoading, projectsWorkspaceSlug, workspace.configured, workspace.organization.slug]);

   return children;
}
