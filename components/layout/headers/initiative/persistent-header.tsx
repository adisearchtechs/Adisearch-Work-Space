'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { ChevronRight, MoreHorizontal, Star } from 'lucide-react';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { InitiativeDto } from '@/lib/initiatives/contracts';
import { cn } from '@/lib/utils';

const TABS = ['overview', 'activity', 'projects'] as const;

export function PersistentInitiativeHeader() {
   const workspace = useWorkspace();
   const { orgId, initiativeId } = useParams<{ orgId: string; initiativeId: string }>();
   const [initiative, setInitiative] = useState<InitiativeDto | null>(null);
   const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('overview'));

   useEffect(() => {
      const controller = new AbortController();
      void fetch(
         `/api/initiatives/${encodeURIComponent(initiativeId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         { credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' } }
      )
         .then(async (response) => {
            if (!response.ok) return null;
            return (await response.json()) as { initiative: InitiativeDto };
         })
         .then((payload) => {
            if (!controller.signal.aborted && payload) setInitiative(payload.initiative);
         });
      return () => controller.abort();
   }, [initiativeId, workspace.organization.slug]);

   return (
      <div className="w-full flex flex-col">
         <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
            <div className="flex items-center gap-2 min-w-0">
               <SidebarTrigger />
               <Link href={`/${orgId}/initiatives`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">Initiatives</Link>
               <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
               <span className="inline-flex size-5 items-center justify-center rounded bg-muted/50 text-xs shrink-0">{initiative?.icon ?? '🎯'}</span>
               <span className="text-sm font-medium truncate">{initiative?.name ?? 'Initiative'}</span>
               <Star className="size-3.5 text-muted-foreground shrink-0 ml-1" />
               <MoreHorizontal className="size-3.5 text-muted-foreground shrink-0" />
            </div>
         </div>
         <div className="w-full flex items-center border-b py-1.5 px-6 h-10 gap-1.5">
            {TABS.map((candidate) => (
               <button
                  key={candidate}
                  type="button"
                  onClick={() => setTab(candidate)}
                  className={cn(
                     'px-2.5 py-1 rounded-md border text-xs font-medium capitalize transition-colors',
                     tab === candidate
                        ? 'bg-accent border-transparent'
                        : 'text-muted-foreground hover:bg-accent/50'
                  )}
               >
                  {candidate}
               </button>
            ))}
         </div>
      </div>
   );
}
