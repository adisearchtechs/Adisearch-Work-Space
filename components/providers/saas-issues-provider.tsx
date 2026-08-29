'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { issueDtoToIssue } from '@/lib/issues/mapper';
import type { IssueDto } from '@/lib/issues/contracts';
import type { Issue } from '@/mock-data/issues';
import { useIssuesStore } from '@/store/issues-store';
import { useWorkspace } from '@/components/providers/workspace-provider';

function supportedChanges(changes: Partial<Issue>) {
   return {
      ...('title' in changes && changes.title !== undefined && { title: changes.title }),
      ...('description' in changes &&
         changes.description !== undefined && {
            description: changes.description,
         }),
      ...('status' in changes && changes.status && { statusSlug: changes.status.id }),
      ...('priority' in changes && changes.priority && { priority: changes.priority.id }),
      ...('dueDate' in changes && { dueDate: changes.dueDate ?? null }),
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

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      const store = useIssuesStore.getState();
      store.setPersistenceAdapter({
         async update(id, changes) {
            const body = supportedChanges(changes);
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
         .then(({ issues }) => useIssuesStore.getState().replaceIssues(issues.map(issueDtoToIssue)))
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load workspace issues.');
         });

      return () => {
         controller.abort();
         useIssuesStore.getState().setPersistenceAdapter(null);
      };
   }, [workspace.configured, workspace.organization.slug]);

   return children;
}
