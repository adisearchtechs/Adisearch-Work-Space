'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function Header() {
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const loading = useTeamsStore((state) => state.loading);
   const persistentTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const name = workspace.configured ? persistentTeam?.name ?? 'Team' : teamId;

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            <Link
               href={`/${orgId}/team/${teamId}/overview`}
               className="flex items-center gap-1.5 min-w-0 hover:opacity-80"
            >
               {workspace.configured ? (
                  <span
                     className="size-3.5 shrink-0 rounded-sm border"
                     style={{ backgroundColor: persistentTeam?.color ?? 'transparent' }}
                     aria-hidden="true"
                  />
               ) : (
                  <div className="inline-flex size-5 bg-muted/50 items-center justify-center rounded shrink-0 text-xs">
                     {teamId.slice(0, 1)}
                  </div>
               )}
               <span className="text-sm font-medium truncate">{name}</span>
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Projects</span>
            <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
         </div>
      </div>
   );
}
