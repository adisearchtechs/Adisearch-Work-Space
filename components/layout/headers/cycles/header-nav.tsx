'use client';

import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { CyclesCollectionResponse } from '@/lib/cycles/contracts';
import { teams } from '@/mock-data/teams';
import { ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function HeaderNav() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const demoTeam = teams.find((team) => team.id === teamId) ?? teams[0];
   const [team, setTeam] = useState<CyclesCollectionResponse['team'] | null>(null);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      void fetch(
         `/api/teams/${encodeURIComponent(teamId)}/cycles?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) return null;
            return (await response.json()) as CyclesCollectionResponse;
         })
         .then((result) => {
            if (!controller.signal.aborted && result) setTeam(result.team);
         })
         .catch(() => undefined);
      return () => controller.abort();
   }, [teamId, workspace.configured, workspace.organization.slug]);

   const name = workspace.configured ? team?.name ?? 'Team' : demoTeam.name;
   const marker = workspace.configured ? (
      <span className="size-3.5 rounded-sm border" style={{ backgroundColor: team?.color ?? 'transparent' }} />
   ) : (
      <span className="inline-flex size-5 bg-muted/50 items-center justify-center rounded shrink-0 text-xs">
         {demoTeam.icon}
      </span>
   );

   const identity = (
      <span className="flex items-center gap-1.5 min-w-0">
         {marker}
         <span className="text-sm font-medium truncate">{name}</span>
      </span>
   );

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger />
            {workspace.configured ? identity : (
               <Link href={`/${orgId}/team/${demoTeam.id}/overview`} className="hover:opacity-80 min-w-0">
                  {identity}
               </Link>
            )}
            <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Cycles</span>
            <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
         </div>
      </div>
   );
}
