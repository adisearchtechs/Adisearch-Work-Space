'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { teams as demoTeams } from '@/mock-data/teams';
import { useTeamsStore } from '@/store/teams-store';

export default function HeaderNav() {
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const loading = useTeamsStore((state) => state.loading);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const configuredReady =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading;
   const canAdmin = workspace.user.role === 'owner' || workspace.user.role === 'admin';
   const count = workspace.configured ? (configuredReady ? teams.length : null) : demoTeams.length;

   return (
      <div className="flex h-10 w-full items-center justify-between border-b px-4 py-1.5 sm:px-6">
         <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">Teams</span>
               <span className="rounded-md bg-accent px-1.5 py-1 text-xs">{count ?? '…'}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            {workspace.configured ? (
               canAdmin && (
                  <Button className="relative" size="xs" variant="secondary" asChild>
                     <Link href={`/${workspace.organization.slug}/settings/teams/new`}>
                        <Plus className="size-4" />
                        Add team
                     </Link>
                  </Button>
               )
            ) : (
               <Button className="relative" size="xs" variant="secondary" disabled>
                  <Plus className="size-4" />
                  Add team
               </Button>
            )}
         </div>
      </div>
   );
}
