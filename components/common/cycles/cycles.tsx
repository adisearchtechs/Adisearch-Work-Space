'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Fragment } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { CycleDto, CyclesCollectionResponse } from '@/lib/cycles/contracts';
import { cycles as demoCycles } from '@/mock-data/cycles';
import CycleLine from './cycle-line';
import { CycleBurnupChart, CycleProgressLegend } from './cycle-burnup-chart';

const readError = async (response: Response, fallback: string) => {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
};

function DemoCycles() {
   return (
      <div className="w-full py-4">
         {demoCycles.map((cycle) => (
            <Fragment key={cycle.id}>
               <div className="w-full flex items-stretch">
                  <div className="relative w-14 sm:w-20 shrink-0 flex flex-col items-end pr-4">
                     <div className="absolute right-[20.5px] top-0 bottom-0 w-px bg-border" />
                     <div className="flex items-center gap-2 h-12">
                        <span className="text-[11px] leading-tight text-muted-foreground text-right">
                           {format(parseISO(cycle.startDate), 'MMM')}
                           <br />
                           {format(parseISO(cycle.startDate), 'd')}
                        </span>
                        <span
                           className={
                              'relative z-10 size-2.5 rounded-full border-2 bg-background ' +
                              (cycle.status === 'current'
                                 ? 'border-indigo-400 bg-indigo-400'
                                 : 'border-muted-foreground/40')
                           }
                        />
                     </div>
                  </div>
                  <div className="flex-1 min-w-0 border-b border-border/60">
                     <CycleLine cycle={cycle} />
                     {cycle.status === 'current' && (
                        <div className="flex flex-col lg:flex-row items-stretch gap-8 px-6 pb-6 pt-2">
                           <div className="flex-1 min-w-0">
                              <CycleBurnupChart cycle={cycle} height={220} />
                           </div>
                           <div className="lg:w-64 shrink-0 flex items-center">
                              <CycleProgressLegend cycle={cycle} />
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </Fragment>
         ))}
      </div>
   );
}

export default function Cycles() {
   const workspace = useWorkspace();
   const { teamId } = useParams<{ teamId: string }>();
   const [data, setData] = useState<CyclesCollectionResponse | null>(null);
   const [loading, setLoading] = useState(workspace.configured);
   const [submitting, setSubmitting] = useState(false);
   const [name, setName] = useState('');
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [editingId, setEditingId] = useState<string | null>(null);
   const [editName, setEditName] = useState('');
   const [editStart, setEditStart] = useState('');
   const [editEnd, setEditEnd] = useState('');
   const [issueChoice, setIssueChoice] = useState<Record<string, string>>({});

   const endpoint = useMemo(
      () =>
         `/api/teams/${encodeURIComponent(teamId)}/cycles?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [teamId, workspace.organization.slug]
   );

   const loadCycles = useCallback(async () => {
      if (!workspace.configured) return;
      setLoading(true);
      try {
         const response = await fetch(endpoint, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to load cycles.'));
         setData((await response.json()) as CyclesCollectionResponse);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to load cycles.');
      } finally {
         setLoading(false);
      }
   }, [endpoint, workspace.configured]);

   useEffect(() => {
      void loadCycles();
   }, [loadCycles]);

   const mutate = async (url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object) => {
      const response = await fetch(url, {
         method,
         credentials: 'same-origin',
         headers: body ? { 'Content-Type': 'application/json' } : undefined,
         body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(await readError(response, 'Cycle change failed.'));
   };

   const createCycle = async () => {
      if (!data?.canWrite || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: name.trim(), startDate, endDate }),
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to create cycle.'));
         setName('');
         setStartDate('');
         setEndDate('');
         await loadCycles();
         toast.success('Cycle created.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to create cycle.');
      } finally {
         setSubmitting(false);
      }
   };

   const beginEdit = (cycle: CycleDto) => {
      setEditingId(cycle.id);
      setEditName(cycle.name);
      setEditStart(cycle.startDate);
      setEditEnd(cycle.endDate);
   };

   const saveEdit = async (cycle: CycleDto) => {
      if (!data?.canWrite || submitting) return;
      setSubmitting(true);
      try {
         await mutate(
            `/api/teams/${encodeURIComponent(teamId)}/cycles/${encodeURIComponent(cycle.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            'PATCH',
            { name: editName.trim(), startDate: editStart, endDate: editEnd }
         );
         setEditingId(null);
         await loadCycles();
         toast.success('Cycle updated.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update cycle.');
      } finally {
         setSubmitting(false);
      }
   };

   const deleteCycle = async (cycle: CycleDto) => {
      if (!data?.canWrite || submitting) return;
      if (!window.confirm(`Delete ${cycle.name}? Assigned issues will return to the team backlog.`)) return;
      setSubmitting(true);
      try {
         await mutate(
            `/api/teams/${encodeURIComponent(teamId)}/cycles/${encodeURIComponent(cycle.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            'DELETE'
         );
         await loadCycles();
         toast.success('Cycle deleted.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete cycle.');
      } finally {
         setSubmitting(false);
      }
   };

   const assignIssue = async (issueId: string, cycleId: string | null) => {
      if (!data?.canWrite || submitting) return;
      setSubmitting(true);
      try {
         await mutate(
            `/api/teams/${encodeURIComponent(teamId)}/cycles/issues?organization=${encodeURIComponent(workspace.organization.slug)}`,
            'PATCH',
            { issueId, cycleId }
         );
         await loadCycles();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update cycle assignment.');
      } finally {
         setSubmitting(false);
      }
   };

   if (!workspace.configured) return <DemoCycles />;
   if (loading) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading cycles…</div>;
   }
   if (!data) {
      return <div className="p-8 text-sm text-muted-foreground">Unable to load this team’s cycles.</div>;
   }

   return (
      <div className="h-full overflow-y-auto">
         <div className="mx-auto max-w-5xl px-6 py-8 pb-20">
            <div className="flex flex-wrap items-start justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-semibold">{data.team.name} cycles</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Plan bounded work windows and assign team issues without mixing demo data.
                  </p>
               </div>
               <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  {data.team.key}
               </span>
            </div>

            {data.canWrite && (
               <div className="mt-6 grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_160px_160px_auto]">
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Cycle name" maxLength={120} />
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  <Button onClick={() => void createCycle()} disabled={submitting || !name.trim() || !startDate || !endDate} className="gap-1.5">
                     <Plus className="size-4" /> Create
                  </Button>
               </div>
            )}

            {!data.canWrite && (
               <div className="mt-6 rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Guests can view cycle planning but cannot change dates, membership, or issue assignments.
               </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
               {data.cycles.length === 0 && (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                     No persistent cycles yet for this team.
                  </div>
               )}

               {data.cycles.map((cycle) => (
                  <section key={cycle.id} className="rounded-xl border bg-card">
                     <div className="flex flex-wrap items-center gap-3 border-b p-4">
                        <span className="size-3 rounded-full" style={{ backgroundColor: data.team.color }} />
                        {editingId === cycle.id ? (
                           <div className="grid flex-1 gap-2 md:grid-cols-[1fr_150px_150px]">
                              <Input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={120} />
                              <Input type="date" value={editStart} onChange={(event) => setEditStart(event.target.value)} />
                              <Input type="date" value={editEnd} onChange={(event) => setEditEnd(event.target.value)} />
                           </div>
                        ) : (
                           <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                 <h2 className="font-medium">{cycle.name}</h2>
                                 <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{cycle.status}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                 {format(parseISO(cycle.startDate), 'MMM d, yyyy')} → {format(parseISO(cycle.endDate), 'MMM d, yyyy')}
                              </p>
                           </div>
                        )}

                        {data.canWrite && (
                           <div className="flex items-center gap-1">
                              {editingId === cycle.id ? (
                                 <>
                                    <Button size="icon" variant="ghost" className="size-8" onClick={() => void saveEdit(cycle)} disabled={submitting || !editName.trim() || !editStart || !editEnd} aria-label="Save cycle"><Check className="size-4" /></Button>
                                    <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditingId(null)} disabled={submitting} aria-label="Cancel editing"><X className="size-4" /></Button>
                                 </>
                              ) : (
                                 <>
                                    <Button size="icon" variant="ghost" className="size-8" onClick={() => beginEdit(cycle)} disabled={submitting} aria-label={`Edit ${cycle.name}`}><Pencil className="size-4" /></Button>
                                    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void deleteCycle(cycle)} disabled={submitting} aria-label={`Delete ${cycle.name}`}><Trash2 className="size-4" /></Button>
                                 </>
                              )}
                           </div>
                        )}
                     </div>

                     <div className="grid gap-3 border-b p-4 text-sm sm:grid-cols-4">
                        <div><p className="text-xs text-muted-foreground">Scope</p><p className="mt-1 font-medium">{cycle.scope}</p></div>
                        <div><p className="text-xs text-muted-foreground">Started</p><p className="mt-1 font-medium">{cycle.started}</p></div>
                        <div><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 font-medium">{cycle.completed}</p></div>
                        <div><p className="text-xs text-muted-foreground">Success</p><p className="mt-1 font-medium">{cycle.successRate}%</p></div>
                     </div>

                     <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                           <h3 className="text-sm font-medium">Issues</h3>
                           {cycle.canceled > 0 && <span className="text-xs text-muted-foreground">{cycle.canceled} canceled</span>}
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                           {cycle.issues.length === 0 && <p className="py-2 text-sm text-muted-foreground">No issues assigned.</p>}
                           {cycle.issues.map((issue) => (
                              <div key={issue.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40">
                                 <span className="w-20 shrink-0 text-xs text-muted-foreground">{issue.identifier}</span>
                                 <span className="min-w-0 flex-1 truncate text-sm">{issue.title}</span>
                                 <span className="text-xs capitalize text-muted-foreground">{issue.statusCategory}</span>
                                 {data.canWrite && (
                                    <Button size="icon" variant="ghost" className="size-7" disabled={submitting} onClick={() => void assignIssue(issue.id, null)} aria-label={`Remove ${issue.identifier} from cycle`}><X className="size-3.5" /></Button>
                                 )}
                              </div>
                           ))}
                        </div>

                        {data.canWrite && (
                           <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                              <select
                                 value={issueChoice[cycle.id] ?? ''}
                                 onChange={(event) => setIssueChoice((current) => ({ ...current, [cycle.id]: event.target.value }))}
                                 className="border-input bg-background h-9 min-w-64 flex-1 rounded-md border px-2 text-sm"
                                 disabled={submitting || data.backlogIssues.length === 0}
                                 aria-label={`Choose issue for ${cycle.name}`}
                              >
                                 <option value="">{data.backlogIssues.length === 0 ? 'No unassigned team issues' : 'Choose unassigned issue…'}</option>
                                 {data.backlogIssues.map((issue) => <option key={issue.id} value={issue.id}>{issue.identifier} · {issue.title}</option>)}
                              </select>
                              <Button
                                 variant="outline"
                                 disabled={submitting || !(issueChoice[cycle.id] ?? '')}
                                 onClick={() => {
                                    const issueId = issueChoice[cycle.id];
                                    if (!issueId) return;
                                    setIssueChoice((current) => ({ ...current, [cycle.id]: '' }));
                                    void assignIssue(issueId, cycle.id);
                                 }}
                              >
                                 Add issue
                              </Button>
                           </div>
                        )}
                     </div>
                  </section>
               ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
               Progress is calculated from each issue’s current workflow status. Historical burn-up snapshots are intentionally not fabricated for configured workspaces.
            </p>
         </div>
      </div>
   );
}
