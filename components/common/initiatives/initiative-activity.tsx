'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
   InitiativeUpdateDto,
   InitiativeUpdateHealth,
   InitiativeUpdateKind,
} from '@/lib/initiative-updates/contracts';
import type { InitiativeDto } from '@/lib/initiatives/contracts';
import { cn } from '@/lib/utils';

const HEALTH_LABEL: Record<InitiativeUpdateHealth, string> = {
   'on-track': 'On track',
   'at-risk': 'At risk',
   'off-track': 'Off track',
};

const HEALTH_COLOR: Record<InitiativeUpdateHealth, string> = {
   'on-track': '#16a34a',
   'at-risk': '#d97706',
   'off-track': '#dc2626',
};

function HealthBadge({ health }: { health: InitiativeUpdateHealth }) {
   return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
         <span className="size-2 rounded-full" style={{ backgroundColor: HEALTH_COLOR[health] }} />
         {HEALTH_LABEL[health]}
      </span>
   );
}

function UpdateCard({ update }: { update: InitiativeUpdateDto }) {
   return (
      <article className="rounded-lg border bg-card p-4">
         <div className="flex items-center gap-2 text-sm">
            <Avatar className="size-5">
               <AvatarImage src={update.author.avatarUrl ?? undefined} alt={update.author.displayName} />
               <AvatarFallback>{update.author.displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{update.author.displayName}</span>
            <time className="text-xs text-muted-foreground" dateTime={update.createdAt}>
               {format(parseISO(update.createdAt), 'MMM d, yyyy')}
            </time>
            <span className="ml-auto">
               {update.kind === 'update' && update.health ? (
                  <HealthBadge health={update.health} />
               ) : (
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                     Comment
                  </span>
               )}
            </span>
         </div>
         <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{update.body}</p>
      </article>
   );
}

export function InitiativeActivity({ initiative }: { initiative: InitiativeDto }) {
   const workspace = useWorkspace();
   const [updates, setUpdates] = useState<InitiativeUpdateDto[]>([]);
   const [loading, setLoading] = useState(true);
   const [posting, setPosting] = useState(false);
   const [mode, setMode] = useState<InitiativeUpdateKind>('update');
   const [health, setHealth] = useState<InitiativeUpdateHealth>(
      initiative.health === 'no-update' ? 'on-track' : initiative.health
   );
   const [body, setBody] = useState('');
   const canWrite = workspace.user.role !== 'guest';
   const endpoint = `/api/initiatives/${encodeURIComponent(initiative.id)}/updates?organization=${encodeURIComponent(workspace.organization.slug)}`;

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Initiative updates load failed with ${response.status}.`);
            return (await response.json()) as { updates: InitiativeUpdateDto[] };
         })
         .then(({ updates: loadedUpdates }) => {
            if (controller.signal.aborted) return;
            setUpdates(loadedUpdates);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load initiative updates.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint]);

   const updatesByMonth = useMemo(() => {
      const groups = new Map<string, { label: string; updates: InitiativeUpdateDto[] }>();
      for (const update of updates) {
         const date = parseISO(update.createdAt);
         const key = format(date, 'yyyy-MM');
         const current = groups.get(key);
         if (current) current.updates.push(update);
         else groups.set(key, { label: format(date, 'MMMM yyyy'), updates: [update] });
      }
      return [...groups.values()];
   }, [updates]);

   const handlePost = async () => {
      const text = body.trim();
      if (!canWrite || !text || posting) return;

      setPosting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               kind: mode,
               health: mode === 'update' ? health : null,
               body: text,
            }),
         });
         if (!response.ok) throw new Error(`Initiative update post failed with ${response.status}.`);
         const { update } = (await response.json()) as { update: InitiativeUpdateDto };
         setUpdates((current) => [update, ...current]);
         setBody('');
      } catch {
         toast.error(`Unable to post initiative ${mode}.`);
      } finally {
         setPosting(false);
      }
   };

   return (
      <div className="mx-auto w-full max-w-3xl px-8 py-10">
         <div>
            <h1 className="text-xl font-semibold">Initiative activity</h1>
            <p className="mt-1 text-sm text-muted-foreground">
               Share progress updates and discussion for {initiative.name}.
            </p>
         </div>

         {canWrite && (
            <div className="mt-6 rounded-lg border bg-card p-4">
               <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-md border p-0.5 text-xs">
                     {(['comment', 'update'] as const).map((value) => (
                        <button
                           key={value}
                           type="button"
                           onClick={() => setMode(value)}
                           className={cn(
                              'rounded-[5px] px-2 py-1 capitalize transition-colors',
                              mode === value
                                 ? 'bg-accent text-foreground'
                                 : 'text-muted-foreground hover:text-foreground'
                           )}
                        >
                           {value}
                        </button>
                     ))}
                  </div>
                  {mode === 'update' && (
                     <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                           <HealthBadge health={health} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                           {(Object.keys(HEALTH_LABEL) as InitiativeUpdateHealth[]).map((value) => (
                              <DropdownMenuItem key={value} onClick={() => setHealth(value)}>
                                 <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: HEALTH_COLOR[value] }}
                                 />
                                 {HEALTH_LABEL[value]}
                              </DropdownMenuItem>
                           ))}
                        </DropdownMenuContent>
                     </DropdownMenu>
                  )}
               </div>

               <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={mode === 'update' ? 'Write an initiative update…' : 'Leave a comment…'}
                  maxLength={10000}
                  className="mt-3 min-h-28 w-full resize-y bg-transparent text-sm outline-none placeholder:text-muted-foreground"
               />

               <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{body.length.toLocaleString()} / 10,000</span>
                  <Button size="sm" onClick={() => void handlePost()} disabled={!body.trim() || posting}>
                     {posting ? 'Posting…' : `Post ${mode}`}
                  </Button>
               </div>
            </div>
         )}

         {loading ? (
            <p className="mt-10 text-center text-sm text-muted-foreground" role="status">
               Loading initiative updates…
            </p>
         ) : updatesByMonth.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
               No updates yet{canWrite ? ' — post the first one to keep the workspace aligned.' : '.'}
            </p>
         ) : (
            updatesByMonth.map((group) => (
               <section key={group.label} className="mt-8">
                  <h2 className="mb-3 text-lg font-semibold">{group.label}</h2>
                  <div className="flex flex-col gap-3">
                     {group.updates.map((update) => (
                        <UpdateCard key={update.id} update={update} />
                     ))}
                  </div>
               </section>
            ))
         )}
      </div>
   );
}
