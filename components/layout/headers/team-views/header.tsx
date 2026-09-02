'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { teams as demoTeams } from '@/mock-data/teams';
import { ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function Header() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const loading = useTeamsStore((state) => state.loading);
   const persistentTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const demoTeam = demoTeams.find((team) => team.id === teamId) ?? demoTeams[0];
   const name = workspace.configured ? persistentTeam?.name ?? 'Team' : demoTeam.name;
   const href = workspace.configured
      ? persistentTeam
         ? `/${orgId}/team/${persistentTeam.key}/overview`
         : `/${orgId}/team/${teamId}/overview`
      : `/${orgId}/team/${demoTeam.id}/overview`;

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            <Link href={href} className="flex items-center gap-1.5 min-w-0 hover:opacity-80">
               {workspace.configured ? (
                  <span
                     className="size-3.5 shrink-0 rounded-sm border"
                     style={{ backgroundColor: persistentTeam?.color ?? 'transparent' }}
                     aria-hidden="true"
                  />
               ) : (
                  <span className="inline-flex size-5 bg-muted/50 items-center justify-center rounded shrink-0 text-xs">{demoTeam.icon}</span>
               )}
               <span className="text-sm font-medium truncate">{name}</span>
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Views</span>
            <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
         </div>
      </div>
   );
}
