'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus, Target, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InitiativeDto, InitiativeStatus } from '@/lib/initiatives/contracts';
import { cn } from '@/lib/utils';

const TABS: { label: string; value: 'all' | InitiativeStatus }[] = [
   { label: 'Active', value: 'active' },
   { label: 'Planned', value: 'planned' },
   { label: 'All initiatives', value: 'all' },
];

const STATUS_LABEL: Record<InitiativeStatus, string> = {
   active: 'Active',
   planned: 'Planned',
   completed: 'Completed',
};

const HEALTH_LABEL: Record<InitiativeDto['health'], string> = {
   'no-update': 'No update',
   'on-track': 'On track',
   'at-risk': 'At risk',
   'off-track': 'Off track',
};

export function PersistentInitiatives() {
   const workspace = useWorkspace();
   const { orgId } = useParams<{ orgId: string }>();
   const [initiatives, setInitiatives] = useState<InitiativeDto[]>([]);
   const [tab, setTab] = useState<'all' | InitiativeStatus>('active');
   const [loading, setLoading] = useState(true);
   const [formOpen, setFormOpen] = useState(false);
   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [target, setTarget] = useState('');
   const [status, setStatus] = useState<InitiativeStatus>('planned');
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.user.role !== 'guest';
   const endpoint = `/api/initiatives?organization=${encodeURIComponent(workspace.organization.slug)}`;

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Initiatives load failed with ${response.status}.`);
            return (await response.json()) as { initiatives: InitiativeDto[] };
         })
         .then(({ initiatives: loaded }) => {
            if (!controller.signal.aborted) setInitiatives(loaded);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load workspace initiatives.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint]);

   const displayed = useMemo(
      () => (tab === 'all' ? initiatives : initiatives.filter((initiative) => initiative.status === tab)),
      [initiatives, tab]
   );

   const createInitiative = async () => {
      const trimmedName = name.trim();
      if (!canWrite || !trimmedName || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               name: trimmedName,
               description: description.trim(),
               target: target.trim() || null,
               status,
            }),
         });
         if (!response.ok) throw new Error(`Initiative create failed with ${response.status}.`);
         const { initiative } = (await response.json()) as { initiative: InitiativeDto };
         setInitiatives((current) => [initiative, ...current]);
         setName('');
         setDescription('');
         setTarget('');
         setStatus('planned');
         setFormOpen(false);
      } catch {
         toast.error('Unable to create initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="h-full w-full overflow-y-auto">
         <div className="sticky top-0 z-10 border-b bg-background px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div className="flex items-center gap-1.5">
                  {TABS.map((item) => (
                     <button
                        key={item.value}
                        type="button"
                        onClick={() => setTab(item.value)}
                        className={cn(
                           'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                           tab === item.value
                              ? 'border-transparent bg-accent'
                              : 'text-muted-foreground hover:bg-accent/50'
                        )}
                     >
                        {item.label}
                     </button>
                  ))}
               </div>
               {canWrite && (
                  <Button size="sm" onClick={() => setFormOpen((open) => !open)} className="gap-1.5">
                     <Plus className="size-4" /> New initiative
                  </Button>
               )}
            </div>

            {formOpen && canWrite && (
               <div className="mt-3 grid gap-3 rounded-xl border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] lg:items-end">
                  <div className="grid gap-2">
                     <label className="grid gap-1 text-xs font-medium">
                        Name
                        <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoFocus placeholder="Initiative name" />
                     </label>
                     <label className="grid gap-1 text-xs font-medium">
                        Description
                        <Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} placeholder="What outcome are we driving?" />
                     </label>
                  </div>
                  <label className="grid gap-1 text-xs font-medium">
                     Status
                     <select value={status} onChange={(event) => setStatus(event.target.value as InitiativeStatus)} className="border-input bg-background h-9 rounded-md border px-2 text-sm">
                        <option value="planned">Planned</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                     </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                     Target
                     <Input value={target} onChange={(event) => setTarget(event.target.value)} maxLength={80} placeholder="Q4 2026" />
                  </label>
                  <div className="flex gap-2">
                     <Button onClick={() => void createInitiative()} disabled={submitting || name.trim() === ''}>{submitting ? 'Creating…' : 'Create'}</Button>
                     <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
                  </div>
               </div>
            )}
         </div>

         <div className="mx-auto max-w-6xl px-6 py-4">
            {loading ? (
               <p className="py-12 text-center text-sm text-muted-foreground" role="status">Loading initiatives…</p>
            ) : displayed.length === 0 ? (
               <div className="rounded-xl border px-6 py-14 text-center">
                  <Target className="mx-auto size-8 text-muted-foreground/60" />
                  <h2 className="mt-3 text-sm font-medium">No {tab === 'all' ? '' : tab} initiatives yet</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Create an initiative to group projects around a measurable outcome.</p>
               </div>
            ) : (
               <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] gap-3 border-b px-4 py-2 text-xs text-muted-foreground md:grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_7rem]">
                     <span>Name</span><span>Status</span><span>Projects</span><span className="hidden md:block">Owner</span><span>Health</span>
                  </div>
                  {displayed.map((initiative) => (
                     <Link
                        key={initiative.id}
                        href={`/${orgId}/initiative/${initiative.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] items-center gap-3 border-b px-4 py-3 text-sm transition-colors last:border-0 hover:bg-accent/30 md:grid-cols-[minmax(0,1fr)_7rem_7rem_8rem_7rem]"
                     >
                        <span className="flex min-w-0 items-center gap-2">
                           <span className="inline-flex size-7 shrink-0 items-center justify-center rounded bg-muted/60">{initiative.icon}</span>
                           <span className="min-w-0">
                              <span className="block truncate font-medium">{initiative.name}</span>
                              {initiative.description && <span className="block truncate text-xs text-muted-foreground">{initiative.description}</span>}
                           </span>
                        </span>
                        <span className="text-xs">{STATUS_LABEL[initiative.status]}</span>
                        <span className="text-xs text-muted-foreground">{initiative.projectIds.length}</span>
                        <span className="hidden min-w-0 items-center gap-1.5 md:flex">
                           {initiative.owner ? (
                              <><Avatar className="size-5"><AvatarImage src={initiative.owner.avatarUrl ?? undefined} alt={initiative.owner.displayName} /><AvatarFallback className="text-[8px]">{initiative.owner.displayName[0]}</AvatarFallback></Avatar><span className="truncate text-xs">{initiative.owner.displayName}</span></>
                           ) : <UserRound className="size-4 text-muted-foreground" />}
                        </span>
                        <span className="text-xs text-muted-foreground">{HEALTH_LABEL[initiative.health]}</span>
                     </Link>
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}
