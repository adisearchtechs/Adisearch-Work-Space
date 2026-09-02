'use client';

import { useEffect } from 'react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useIssueSubscriptionsStore } from '@/store/issue-subscriptions-store';

export function SaasIssueSubscriptionsProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const replaceIssueIds = useIssueSubscriptionsStore((state) => state.replaceIssueIds);
   const reset = useIssueSubscriptionsStore((state) => state.reset);

   useEffect(() => {
      if (!workspace.configured) {
         reset();
         return;
      }

      const controller = new AbortController();
      reset();

      void fetch(
         `/api/issue-subscriptions?organization=${encodeURIComponent(workspace.organization.slug)}`,
         { cache: 'no-store', signal: controller.signal }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error('Unable to load issue subscriptions.');
            return (await response.json()) as { issueIds?: string[] };
         })
         .then((payload) => replaceIssueIds(payload.issueIds ?? []))
         .catch((error) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            replaceIssueIds([]);
         });

      return () => controller.abort();
   }, [replaceIssueIds, reset, workspace.configured, workspace.organization.slug]);

   return children;
}
