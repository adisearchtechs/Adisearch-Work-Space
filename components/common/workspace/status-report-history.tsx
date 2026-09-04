'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Archive, Camera, ChevronRight, History, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   StatusReportSnapshotDto,
   StatusReportSnapshotsResponse,
   TeamStatusReportSnapshotPayload,
   WorkspaceStatusReportSnapshotPayload,
} from '@/lib/status-report-snapshots/contracts';
import { useTeamsStore } from '@/store/teams-store';

type Metric = { label: string; value: number };

function formatTimestamp(value: string) {
   return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   }).format(new Date(value));
}

function workspaceMetrics(payload: WorkspaceStatusReportSnapshotPayload): Metric[] {
   return [
      { label: 'Active issues', value: payload.dashboard.summary.activeIssues },
      { label: 'Attention', value: payload.dashboard.summary.attention },
      { label: 'Active projects', value: payload.dashboard.portfolio.activeProjects },
      {
         label: 'At risk / off track',
         value:
            payload.dashboard.portfolio.atRiskProjects +
            payload.dashboard.portfolio.offTrackProjects,
      },
      { label: 'Open milestones', value: payload.dashboard.portfolio.openMilestones },
      {
         label: 'Unresolved dependencies',
         value: payload.dependencies.summary.unresolvedDependencies,
      },
   ];
}

function teamMetrics(payload: TeamStatusReportSnapshotPayload): Metric[] {
   const teamDependencies = payload.dependencies.dependencies.filter(
      (dependency) =>
         dependency.blocking.team.id === payload.teamId ||
         dependency.blocked.team.id === payload.teamId
   );
   return [
      { label: 'Active work', value: payload.dashboard.work.active },
      { label: 'Completed work', value: payload.dashboard.work.completed },
      { label: 'Attention', value: payload.dashboard.work.attention },
      { label: 'Blocked', value: payload.dashboard.work.blocked },
      { label: 'Overdue', value: payload.dashboard.work.overdue },
      { label: 'Unresolved dependencies', value: teamDependencies.length },
   ];
}

function snapshotMetrics(snapshot: StatusReportSnapshotDto) {
   return snapshot.payload.kind === 'workspace'
      ? workspaceMetrics(snapshot.payload)
      : teamMetrics(snapshot.payload);
}

function sameSeries(left: StatusReportSnapshotDto, right: StatusReportSnapshotDto) {
   return left.scope === right.scope && left.teamId === right.teamId;
}

export function StatusReportHistory() {
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const [snapshots, setSnapshots] = useState<StatusReportSnapshotDto[]>([]);
   const [selectedTeamId, setSelectedTeamId] = useState('');
   const [loading, setLoading] = useState(false);
   const [savingScope, setSavingScope] = useState<'workspace' | 'team' | null>(null);
   const [loadError, setLoadError] = useState(false);

   const configuredTeams = useMemo(
      () =>
         workspace.configured && workspaceSlug === workspace.organization.slug
            ? teams
            : [],
      [teams, workspace.configured, workspace.organization.slug, workspaceSlug]
   );

   useEffect(() => {
      if (!selectedTeamId && configuredTeams[0]) setSelectedTeamId(configuredTeams[0].id);
   }, [configuredTeams, selectedTeamId]);

   const loadHistory = async (signal?: AbortSignal) => {
      if (!workspace.configured) return;
      setLoading(true);
      setLoadError(false);
      try {
         const response = await fetch(
            `/api/status-report-snapshots?organization=${encodeURIComponent(workspace.organization.slug)}&limit=50`,
            {
               credentials: 'same-origin',
               headers: { Accept: 'application/json' },
               signal,
            }
         );
         if (!response.ok) throw new Error(`History load failed with ${response.status}.`);
         const result = (await response.json()) as StatusReportSnapshotsResponse;
         setSnapshots(result.snapshots);
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError') return;
         setLoadError(true);
         toast.error('Unable to load status report history.');
      } finally {
         if (!signal?.aborted) setLoading(false);
      }
   };

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      void loadHistory(controller.signal);
      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   const saveSnapshot = async (scope: 'workspace' | 'team') => {
      if (!workspace.configured || (scope === 'team' && !selectedTeamId)) return;
      setSavingScope(scope);
      try {
         const response = await fetch(
            `/api/status-report-snapshots?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify(
                  scope === 'workspace'
                     ? { scope: 'workspace' }
                     : { scope: 'team', teamId: selectedTeamId }
               ),
            }
         );
         if (!response.ok) throw new Error(`Snapshot save failed with ${response.status}.`);
         toast.success(scope === 'workspace' ? 'Workspace snapshot saved.' : 'Team snapshot saved.');
         await loadHistory();
      } catch {
         toast.error('Unable to save status report snapshot.');
      } finally {
         setSavingScope(null);
      }
   };

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Status history</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Status snapshots require persistent workspace data. Demo mode does not create historical operating records.
            </p>
         </div>
      );
   }

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
               <p className="text-sm font-medium text-muted-foreground">{workspace.organization.name}</p>
               <h1 className="mt-1 text-3xl font-semibold tracking-tight">Status report history</h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Immutable, tenant-scoped captures of workspace and team status read models. Changes shown below are arithmetic differences between saved snapshots only; no forecast or inferred trend is generated.
               </p>
            </div>
            <Link
               href={`/${workspace.organization.slug}/status-report`}
               className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted"
            >
               Current workspace report <ChevronRight className="size-4" />
            </Link>
         </div>

         <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-5">
               <div className="flex items-center gap-2">
                  <Camera className="size-4 text-muted-foreground" />
                  <h2 className="font-semibold">Workspace snapshot</h2>
               </div>
               <p className="mt-2 text-sm text-muted-foreground">
                  Capture the current workspace portfolio, attention, milestones, and dependency read models as one immutable record.
               </p>
               <button
                  type="button"
                  disabled={savingScope !== null}
                  onClick={() => void saveSnapshot('workspace')}
                  className="mt-4 inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
               >
                  {savingScope === 'workspace' ? 'Saving…' : 'Save workspace snapshot'}
               </button>
            </div>

            <div className="rounded-xl border p-5">
               <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="font-semibold">Team snapshot</h2>
               </div>
               <p className="mt-2 text-sm text-muted-foreground">
                  Capture a team operating dashboard together with the workspace dependency records that support its blocker history.
               </p>
               <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <select
                     aria-label="Team to snapshot"
                     value={selectedTeamId}
                     onChange={(event) => setSelectedTeamId(event.target.value)}
                     disabled={teamsLoading || configuredTeams.length === 0}
                     className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
                  >
                     {configuredTeams.length === 0 ? <option value="">No teams available</option> : null}
                     {configuredTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                           {team.name}
                        </option>
                     ))}
                  </select>
                  <button
                     type="button"
                     disabled={savingScope !== null || !selectedTeamId}
                     onClick={() => void saveSnapshot('team')}
                     className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                     {savingScope === 'team' ? 'Saving…' : 'Save team snapshot'}
                  </button>
               </div>
            </div>
         </section>

         <section className="mt-10 pb-10">
            <div className="flex items-end justify-between gap-3">
               <div>
                  <div className="flex items-center gap-2">
                     <History className="size-4 text-muted-foreground" />
                     <h2 className="text-lg font-semibold">Saved snapshots</h2>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                     Latest first. Each comparison uses only the immediately previous snapshot for the same workspace or team.
                  </p>
               </div>
               <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadHistory()}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
               >
                  {loading ? 'Refreshing…' : 'Refresh'}
               </button>
            </div>

            <div className="mt-4 space-y-3">
               {loadError ? (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                     Status history could not be loaded. Refresh to retry the authenticated request.
                  </div>
               ) : !loading && snapshots.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                     No status snapshots have been saved yet.
                  </div>
               ) : (
                  snapshots.map((snapshot, index) => {
                     const previous = snapshots.slice(index + 1).find((candidate) => sameSeries(snapshot, candidate));
                     const metrics = snapshotMetrics(snapshot);
                     const previousMetrics = previous ? snapshotMetrics(previous) : [];
                     const teamName = snapshot.teamId
                        ? configuredTeams.find((team) => team.id === snapshot.teamId)?.name ?? 'Team'
                        : null;
                     return (
                        <article key={snapshot.id} className="rounded-xl border p-5">
                           <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                 <div className="flex items-center gap-2">
                                    <Archive className="size-4 text-muted-foreground" />
                                    <h3 className="font-semibold">
                                       {snapshot.scope === 'workspace' ? 'Workspace snapshot' : `${teamName} snapshot`}
                                    </h3>
                                 </div>
                                 <p className="mt-1 text-xs text-muted-foreground">
                                    Captured {formatTimestamp(snapshot.createdAt)} · source generated {formatTimestamp(snapshot.generatedAt)}
                                 </p>
                              </div>
                              {snapshot.scope === 'team' && snapshot.teamId ? (
                                 <Link
                                    href={`/${workspace.organization.slug}/team/${snapshot.teamId}/status-report`}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                 >
                                    Current team report
                                 </Link>
                              ) : null}
                           </div>

                           <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                              {metrics.map((metric) => {
                                 const oldValue = previousMetrics.find((item) => item.label === metric.label)?.value;
                                 const delta = oldValue === undefined ? null : metric.value - oldValue;
                                 return (
                                    <div key={metric.label} className="rounded-lg bg-muted/40 p-3">
                                       <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                                       <div className="mt-1 flex items-baseline gap-1.5">
                                          <p className="text-lg font-semibold tabular-nums">{metric.value}</p>
                                          {delta !== null ? (
                                             <span className="text-[11px] text-muted-foreground tabular-nums">
                                                {delta > 0 ? '+' : ''}{delta}
                                             </span>
                                          ) : null}
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           <p className="mt-3 text-[11px] text-muted-foreground">
                              {previous
                                 ? `Delta compares with ${formatTimestamp(previous.createdAt)}. Positive and negative values are numeric differences only.`
                                 : 'No earlier snapshot exists for this scope, so no comparison is shown.'}
                           </p>
                           <Link
                              href={`/${workspace.organization.slug}/status-history/${snapshot.id}`}
                              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                           >
                              View saved snapshot <ChevronRight className="size-4" />
                           </Link>
                        </article>
                     );
                  })
               )}
            </div>
         </section>
      </div>
   );
}
