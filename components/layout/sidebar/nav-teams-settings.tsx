'use client';

import Link from 'next/link';
import { PlusIcon } from 'lucide-react';
import { useMemo } from 'react';

import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
} from '@/components/ui/sidebar';
import { teams as demoTeams } from '@/mock-data/teams';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useTeamsStore } from '@/store/teams-store';

export function NavTeamsSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const joinedTeamIds = useTeamsStore((state) => state.joinedTeamIds);
   const loading = useTeamsStore((state) => state.loading);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const joinedSet = useMemo(() => new Set(joinedTeamIds), [joinedTeamIds]);
   const configuredReady =
      workspace.configured && workspaceSlug === workspace.organization.slug && !loading;

   const runtimeTeams = configuredReady ? teams.filter((team) => joinedSet.has(team.id)) : [];
   const visibleTeams = workspace.configured
      ? runtimeTeams.map((team) => ({
           id: team.id,
           name: team.name,
           color: team.color,
           icon: null as string | null,
        }))
      : demoTeams
           .filter((team) => team.joined)
           .map((team) => ({
              id: team.id,
              name: team.name,
              color: null as string | null,
              icon: team.icon,
           }));

   return (
      <SidebarGroup>
         <SidebarGroupLabel>Your teams</SidebarGroupLabel>
         <SidebarMenu>
            {workspace.configured && !configuredReady ? (
               <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                     <span className="text-sm text-muted-foreground">Loading teams…</span>
                  </SidebarMenuButton>
               </SidebarMenuItem>
            ) : (
               visibleTeams.map((team) => (
                  <SidebarMenuItem key={team.id}>
                     <SidebarMenuButton asChild>
                        <Link href={`/${orgId}/settings/teams/${team.id}`}>
                           <span
                              className="inline-flex size-6 items-center justify-center rounded border shrink-0"
                              style={team.color ? { backgroundColor: team.color } : undefined}
                              aria-hidden="true"
                           >
                              {team.icon && <span className="text-sm">{team.icon}</span>}
                           </span>
                           <span>{team.name}</span>
                        </Link>
                     </SidebarMenuButton>
                  </SidebarMenuItem>
               ))
            )}
            <SidebarMenuItem>
               <SidebarMenuButton asChild>
                  <Button variant="ghost" className="w-full justify-start gap-2 px-2" asChild>
                     <Link href={`/${orgId}/settings/teams/new`}>
                        <PlusIcon className="size-4" />
                        <span>Join or create a team</span>
                     </Link>
                  </Button>
               </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarGroup>
   );
}
