'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { teams as demoTeams } from '@/mock-data/teams';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { Link2, MoreHorizontal, Star } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function HeaderNav() {
   const workspace = useWorkspace();
   const { teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const loading = useTeamsStore((state) => state.loading);
   const persistentTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const demoTeam = demoTeams.find((team) => team.id === teamId) ?? demoTeams[0];
   const name = workspace.configured ? persistentTeam?.name ?? 'Team' : demoTeam.name;

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            {workspace.configured ? (
               <span
                  className="size-3.5 shrink-0 rounded-sm border"
                  style={{ backgroundColor: persistentTeam?.color ?? 'transparent' }}
                  aria-hidden="true"
               />
            ) : (
               <div className="inline-flex size-5 bg-muted/50 items-center justify-center rounded shrink-0 text-xs">
                  {demoTeam.icon}
               </div>
            )}
            <span className="text-sm font-medium truncate">{name}</span>
            <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
            <MoreHorizontal className="size-3.5 text-muted-foreground shrink-0" />
         </div>
         <Link2 className="size-4 text-muted-foreground shrink-0" />
      </div>
   );
}
