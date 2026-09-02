'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import type { TeamDto } from '@/lib/teams/contracts';
import { useTeamsStore } from '@/store/teams-store';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function SaasTeamsProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const pathname = usePathname();

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      const store = useTeamsStore.getState();
      store.beginLoad(workspace.organization.slug);

      void fetch(`/api/teams?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Team load failed with ${response.status}.`);
            return (await response.json()) as {
               teams: TeamDto[];
               joinedTeamIds: string[];
            };
         })
         .then(({ teams, joinedTeamIds }) => {
            if (controller.signal.aborted) return;
            useTeamsStore
               .getState()
               .replaceTeams(workspace.organization.slug, teams, joinedTeamIds);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            useTeamsStore.getState().clearTeams();
            toast.error('Unable to load workspace teams.');
         });

      return () => controller.abort();
   }, [pathname, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      if (workspace.configured) return;
      useTeamsStore.getState().clearTeams();
   }, [workspace.configured]);

   return children;
}
