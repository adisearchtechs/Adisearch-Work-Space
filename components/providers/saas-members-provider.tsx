'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { WorkspaceMemberDto, WorkspaceMemberRole } from '@/lib/workspace-members/contracts';
import { useWorkspaceMembersStore } from '@/store/workspace-members-store';

export function SaasMembersProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const pathname = usePathname();

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      const store = useWorkspaceMembersStore.getState();
      store.beginLoad(workspace.organization.slug);

      void fetch(`/api/members?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Member load failed with ${response.status}.`);
            return (await response.json()) as {
               members: WorkspaceMemberDto[];
               currentUserId: string;
               actorRole: WorkspaceMemberRole;
               canAdmin: boolean;
            };
         })
         .then(({ members, currentUserId, actorRole, canAdmin }) => {
            if (controller.signal.aborted) return;
            useWorkspaceMembersStore
               .getState()
               .replaceMembers(
                  workspace.organization.slug,
                  members,
                  currentUserId,
                  actorRole,
                  canAdmin
               );
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            useWorkspaceMembersStore.getState().clearMembers();
            toast.error('Unable to load workspace members.');
         });

      return () => controller.abort();
   }, [pathname, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      if (workspace.configured) return;
      useWorkspaceMembersStore.getState().clearMembers();
   }, [workspace.configured]);

   return children;
}
