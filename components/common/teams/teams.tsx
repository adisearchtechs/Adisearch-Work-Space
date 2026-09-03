'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { teams as allTeams } from '@/mock-data/teams';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useTeamsStore } from '@/store/teams-store';
import { useTeamsFilterStore } from '@/store/team-filter-store';
import { useTeamsDisplayStore } from '@/store/teams-display-store';
import { Filter } from '@/components/layout/headers/teams/filter';
import TeamLine from './team-line';
import PersistentTeamLine from './persistent-team-line';
import { TeamsDisplayOptions } from './teams-display-options';

export default function Teams() {
   const workspace = useWorkspace();
   const persistentTeams = useTeamsStore((state) => state.teams);
   const joinedTeamIds = useTeamsStore((state) => state.joinedTeamIds);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const teamsWorkspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const { filters } = useTeamsFilterStore();
   const { ordering, displayProperties } = useTeamsDisplayStore();

   const configuredReady =
      workspace.configured &&
      teamsWorkspaceSlug === workspace.organization.slug &&
      !teamsLoading;

   const sortedPersistentTeams = useMemo(() => {
      const list = persistentTeams.slice();
      return list.sort((a, b) => {
         switch (ordering) {
            case 'members':
               return b.usage.members - a.usage.members;
            case 'projects':
               return b.usage.projects - a.usage.projects;
            case 'name':
            default:
               return a.name.localeCompare(b.name);
         }
      });
   }, [ordering, persistentTeams]);

   const displayedDemoTeams = useMemo(() => {
      let list = allTeams.slice();

      if (filters.membership.length > 0) {
         const selectedMembership = new Set(filters.membership);
         list = list.filter((team) =>
            selectedMembership.has(team.joined ? 'Joined' : 'Not-Joined')
         );
      }
      if (filters.identifier.length > 0) {
         const selectedIdentifiers = new Set(filters.identifier);
         list = list.filter((team) => selectedIdentifiers.has(team.id));
      }

      return list.sort((a, b) => {
         switch (ordering) {
            case 'members':
               return b.members.length - a.members.length;
            case 'projects':
               return b.projects.length - a.projects.length;
            case 'name':
            default:
               return a.name.localeCompare(b.name);
         }
      });
   }, [filters, ordering]);

   const displayedCount = workspace.configured
      ? configuredReady
         ? sortedPersistentTeams.length
         : 0
      : displayedDemoTeams.length;
   const joinedSet = useMemo(() => new Set(joinedTeamIds), [joinedTeamIds]);

   return (
      <div className="w-full">
         <div className="sticky top-0 z-20 flex h-10 w-full items-center justify-between border-b bg-container px-4 py-1.5 sm:px-6">
            <span className="text-sm text-muted-foreground">
               {workspace.configured && !configuredReady
                  ? 'Loading teams…'
                  : `${displayedCount} ${displayedCount === 1 ? 'team' : 'teams'}`}
            </span>
            <div className="flex items-center gap-1">
               {!workspace.configured && <Filter />}
               <TeamsDisplayOptions />
            </div>
         </div>

         <div className="sticky top-10 z-10 flex items-center border-b bg-container px-4 py-1.5 text-sm text-muted-foreground sm:px-6">
            <div className="min-w-0 flex-1">Name</div>
            {displayProperties.membership && (
               <div className="hidden w-[110px] shrink-0 sm:block">Membership</div>
            )}
            {displayProperties.owners && (
               <div className="hidden w-[70px] shrink-0 lg:block">Owners</div>
            )}
            {displayProperties.members && <div className="w-[86px] shrink-0 sm:w-[110px]">Members</div>}
            {displayProperties.cycle && (
               <div className="hidden w-[80px] shrink-0 md:block">Cycles</div>
            )}
            {displayProperties.projects && (
               <div className="hidden w-[80px] shrink-0 sm:block">Projects</div>
            )}
            {displayProperties.created && (
               <div className="hidden w-[110px] shrink-0 xl:block">Created</div>
            )}
            {displayProperties.updated && (
               <div className="hidden w-[110px] shrink-0 xl:block">Updated</div>
            )}
         </div>

         <div className="w-full">
            {workspace.configured ? (
               !configuredReady ? (
                  <div className="px-4 py-8 text-sm text-muted-foreground sm:px-6">
                     Loading your workspace teams…
                  </div>
               ) : sortedPersistentTeams.length === 0 ? (
                  <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
                     <p>No teams exist in this workspace yet.</p>
                     {(workspace.user.role === 'owner' || workspace.user.role === 'admin') && (
                        <Link
                           href={`/${workspace.organization.slug}/settings/teams/new`}
                           className="mt-2 inline-block text-foreground underline underline-offset-4"
                        >
                           Create the first team
                        </Link>
                     )}
                  </div>
               ) : (
                  sortedPersistentTeams.map((team) => (
                     <PersistentTeamLine
                        key={team.id}
                        team={team}
                        joined={joinedSet.has(team.id)}
                     />
                  ))
               )
            ) : (
               displayedDemoTeams.map((team) => <TeamLine key={team.id} team={team} />)
            )}
         </div>
      </div>
   );
}
