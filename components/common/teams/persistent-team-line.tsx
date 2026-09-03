'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Box, Check, Play, Users } from 'lucide-react';
import type { TeamDto } from '@/lib/teams/contracts';
import { useTeamsDisplayStore } from '@/store/teams-display-store';

function formatDate(value: string) {
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function PersistentTeamLine({
   team,
   joined,
}: {
   team: TeamDto;
   joined: boolean;
}) {
   const { orgId } = useParams<{ orgId: string }>();
   const { displayProperties } = useTeamsDisplayStore();

   return (
      <div className="flex w-full items-center border-b border-muted-foreground/5 px-4 py-3 text-sm hover:bg-sidebar/50 sm:px-6">
         <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
               className="size-6 shrink-0 rounded-md border border-border/70"
               style={{ backgroundColor: team.color }}
               aria-hidden="true"
            />
            <Link
               href={`/${orgId}/team/${team.key}/overview`}
               className="min-w-0 truncate font-medium hover:underline"
            >
               {team.name}
            </Link>
            <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
               {team.key}
            </span>
         </div>

         {displayProperties.membership && (
            <div className="hidden w-[110px] shrink-0 sm:block">
               <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
                  {joined && <Check className="size-3" />}
                  {joined ? 'Joined' : 'Not joined'}
               </span>
            </div>
         )}

         {displayProperties.owners && (
            <div className="hidden w-[70px] shrink-0 text-xs text-muted-foreground lg:block">—</div>
         )}

         {displayProperties.members && (
            <div className="flex w-[86px] shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:w-[110px]">
               <Users className="size-3.5" />
               {team.usage.members}
            </div>
         )}

         {displayProperties.cycle && (
            <div className="hidden w-[80px] shrink-0 items-center gap-1.5 text-xs text-muted-foreground md:flex">
               <Play className="size-3.5" />
               {team.usage.cycles}
            </div>
         )}

         {displayProperties.projects && (
            <div className="hidden w-[80px] shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
               <Box className="size-3.5" />
               {team.usage.projects}
            </div>
         )}

         {displayProperties.created && (
            <div className="hidden w-[110px] shrink-0 text-xs text-muted-foreground xl:block">
               {formatDate(team.createdAt)}
            </div>
         )}

         {displayProperties.updated && (
            <div className="hidden w-[110px] shrink-0 text-xs text-muted-foreground xl:block">
               {formatDate(team.updatedAt)}
            </div>
         )}
      </div>
   );
}
