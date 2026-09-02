'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { TeamDetailsDto } from '@/lib/teams/contracts';
import { teams as demoTeams } from '@/mock-data/teams';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { RiDonutChartFill } from '@remixicon/react';
import { Box, CopyMinus, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function TeamOverview() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const [details, setDetails] = useState<TeamDetailsDto | null>(null);
   const resolvedTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug
         ? resolveTeamReference(teams, teamId)
         : undefined;

   useEffect(() => {
      if (!workspace.configured || !resolvedTeam) return;
      const controller = new AbortController();
      setDetails(null);
      void fetch(
         `/api/teams/${encodeURIComponent(resolvedTeam.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error(`Team load failed with ${response.status}.`);
            return (await response.json()) as { team: TeamDetailsDto };
         })
         .then(({ team }) => {
            if (!controller.signal.aborted) setDetails(team);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load team overview.');
         });
      return () => controller.abort();
   }, [resolvedTeam, workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) {
      const team = demoTeams.find((candidate) => candidate.id === teamId) ?? demoTeams[0];
      return (
         <div className="w-full max-w-5xl mx-auto px-8 py-10 flex flex-col lg:flex-row gap-12">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-4">
                  <div className="inline-flex size-12 bg-muted/50 items-center justify-center rounded-lg text-2xl shrink-0">{team.icon}</div>
                  <h1 className="text-3xl font-semibold">{team.name}</h1>
               </div>
               <p className="mt-4 text-muted-foreground">Demo team overview</p>
            </div>
            <div className="w-full lg:w-60 shrink-0">
               <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
               <div className="mt-2 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                     {team.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="size-5 ring-2 ring-background">
                           <AvatarImage src={member.avatarUrl} alt={member.name} />
                           <AvatarFallback>{member.name[0]}</AvatarFallback>
                        </Avatar>
                     ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{team.members.length}</span>
               </div>
            </div>
         </div>
      );
   }

   if (teamsLoading || workspaceSlug !== workspace.organization.slug) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading team…</div>;
   }

   if (!resolvedTeam) {
      return <div className="mx-auto max-w-2xl px-6 py-10"><h1 className="text-2xl font-medium">Team not found</h1></div>;
   }

   const team = details ?? { ...resolvedTeam, members: [], organizationMembers: [] };
   const goToLinks = [
      { label: 'Team settings', icon: Settings, href: `/${orgId}/settings/teams/${resolvedTeam.id}` },
      { label: 'Issues', icon: CopyMinus, href: `/${orgId}/team/${resolvedTeam.key}/all` },
      { label: 'Cycles', icon: RiDonutChartFill, href: `/${orgId}/team/${resolvedTeam.key}/cycles` },
      { label: 'Projects', icon: Box, href: `/${orgId}/team/${resolvedTeam.key}/projects` },
   ];

   return (
      <div className="w-full max-w-5xl mx-auto px-8 py-10 flex flex-col lg:flex-row gap-12">
         <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
               <span className="size-12 shrink-0 rounded-xl border" style={{ backgroundColor: resolvedTeam.color }} />
               <div className="min-w-0">
                  <h1 className="truncate text-3xl font-semibold">{resolvedTeam.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{resolvedTeam.key} · issue prefix {resolvedTeam.issuePrefix}</p>
               </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
               <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Issues</p><p className="mt-1 text-2xl font-semibold">{resolvedTeam.usage.issues}</p></div>
               <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Projects</p><p className="mt-1 text-2xl font-semibold">{resolvedTeam.usage.projects}</p></div>
               <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Cycles</p><p className="mt-1 text-2xl font-semibold">{resolvedTeam.usage.cycles}</p></div>
               <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Members</p><p className="mt-1 text-2xl font-semibold">{resolvedTeam.usage.members}</p></div>
            </div>

            <div className="mt-10">
               <h2 className="text-lg font-semibold">Team workspace</h2>
               <p className="mt-1 text-sm text-muted-foreground">This overview is backed by your persisted team data. Demo documents and resources are not mixed into configured workspaces.</p>
            </div>
         </div>

         <div className="w-full lg:w-64 shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
            <div className="mt-3 flex flex-col gap-2">
               {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading member details…</p>
               ) : (
                  team.members.slice(0, 8).map((member) => (
                     <div key={member.id} className="flex items-center gap-2">
                        <Avatar className="size-6">
                           <AvatarImage src={member.avatarUrl ?? undefined} alt={member.displayName} />
                           <AvatarFallback>{member.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate text-sm">{member.displayName}</span>
                        <span className="text-[11px] capitalize text-muted-foreground">{member.role}</span>
                     </div>
                  ))
               )}
            </div>

            <h3 className="text-sm font-medium text-muted-foreground mt-8">Go to</h3>
            <div className="mt-2 flex flex-col">
               {goToLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-md hover:bg-sidebar/50 text-sm">
                     <link.icon className="size-4 text-muted-foreground" />
                     {link.label}
                  </Link>
               ))}
            </div>

            <div className="mt-8 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5"><Users className="size-3.5" /> {resolvedTeam.usage.members} assigned members</div>
            </div>
         </div>
      </div>
   );
}
