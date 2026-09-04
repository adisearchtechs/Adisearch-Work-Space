'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Clipboard, GitCompareArrows, GitBranch, ListChecks } from 'lucide-react';
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
type SeriesOption = { key: string; label: string; scope: 'workspace' | 'team'; teamId: string | null };

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
      { label: 'Completed issues', value: payload.dashboard.summary.completedIssues },
      { label: 'Attention', value: payload.dashboard.summary.attention },
      { label: 'Active projects', value: payload.dashboard.portfolio.activeProjects },
      { label: 'Open milestones', value: payload.dashboard.portfolio.openMilestones },
      { label: 'Unresolved dependencies', value: payload.dependencies.summary.unresolvedDependencies },
   ];
}

function teamDependencies(payload: TeamStatusReportSnapshotPayload) {
   return payload.dependencies.dependencies.filter(
      (dependency) =>
         dependency.blocking.team.id === payload.teamId ||
         dependency.blocked.team.id === payload.teamId
   );
}

function teamMetrics(payload: TeamStatusReportSnapshotPayload): Metric[] {
   return [
      { label: 'Active work', value: payload.dashboard.work.active },
      { label: 'Completed work', value: payload.dashboard.work.completed },
      { label: 'Attention', value: payload.dashboard.work.attention },
      { label: 'Blocked', value: payload.dashboard.work.blocked },
      { label: 'Overdue', value: payload.dashboard.work.overdue },
      { label: 'Unresolved dependencies', value: teamDependencies(payload).length },
   ];
}

function metricsFor(snapshot: StatusReportSnapshotDto) {
   return snapshot.payload.kind === 'workspace'
      ? workspaceMetrics(snapshot.payload)
      : teamMetrics(snapshot.payload);
}

function dependenciesFor(snapshot: StatusReportSnapshotDto) {
   return snapshot.payload.kind === 'workspace'
      ? snapshot.payload.dependencies.dependencies
      : teamDependencies(snapshot.payload);
}

function seriesMatches(snapshot: StatusReportSnapshotDto, option: SeriesOption) {
   return option.scope === snapshot.scope && option.teamId === snapshot.teamId;
}

function buildComparisonText(
   left: StatusReportSnapshotDto,
   right: StatusReportSnapshotDto,
   seriesLabel: string
) {
   const leftMetrics = metricsFor(left);
   const rightMetrics = metricsFor(right);
   const lines = [
      `${seriesLabel} — Saved status snapshot comparison`,
      `Snapshot A: ${left.createdAt}`,
      `Snapshot B: ${right.createdAt}`,
      '',
      'Numeric differences (A - B):',
   ];

   for (const metric of leftMetrics) {
      const rightValue = rightMetrics.find((candidate) => candidate.label === metric.label)?.value;
      if (rightValue === undefined) continue;
      const difference = metric.value - rightValue;
      lines.push(`- ${metric.label}: A ${metric.value}, B ${rightValue}, difference ${difference > 0 ? '+' : ''}${difference}`);
   }

   const leftAttention = new Set(left.payload.dashboard.attention.map((item) => item.id));
   const rightAttention = new Set(right.payload.dashboard.attention.map((item) => item.id));
   const onlyA = [...leftAttention].filter((id) => !rightAttention.has(id)).length;
   const onlyB = [...rightAttention].filter((id) => !leftAttention.has(id)).length;

   lines.push(
      '',
      `Attention membership: ${onlyA} only in A, ${onlyB} only in B.`,
      'Source: two immutable saved status snapshots. Differences are factual set/numeric comparisons only; no trend, performance, risk, forecast, velocity, or capacity interpretation is included.'
   );

   return lines.join('\n');
}

export function StatusReportSnapshotComparison() {
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const [snapshots, setSnapshots] = useState<StatusReportSnapshotDto[]>([]);
   const [seriesKey, setSeriesKey] = useState('workspace');
   const [leftId, setLeftId] = useState('');
   const [rightId, setRightId] = useState('');
   const [loading, setLoading] = useState(false);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setLoading(true);
      setLoadError(false);

      void fetch(
         `/api/status-report-snapshots?organization=${encodeURIComponent(workspace.organization.slug)}&limit=50`,
         {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
         }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error(`Snapshot comparison load failed with ${response.status}.`);
            return (await response.json()) as StatusReportSnapshotsResponse;
         })
         .then((result) => {
            if (!controller.signal.aborted) setSnapshots(result.snapshots);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load saved status snapshots.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });

      return () => controller.abort();
   }, [workspace.configured, workspace.organization.slug]);

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Compare saved snapshots</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Snapshot comparison requires persistent workspace data. Demo mode does not fabricate historical records.
            </p>
         </div>
      );
   }

   const teamIds = Array.from(
      new Set(snapshots.filter((snapshot) => snapshot.scope === 'team' && snapshot.teamId).map((snapshot) => snapshot.teamId!))
   );
   const seriesOptions: SeriesOption[] = [
      { key: 'workspace', label: 'Workspace', scope: 'workspace', teamId: null },
      ...teamIds.map((teamId) => ({
         key: `team:${teamId}`,
         label:
            workspaceSlug === workspace.organization.slug
               ? teams.find((team) => team.id === teamId)?.name ?? `Archived team ${teamId.slice(0, 8)}`
               : `Team ${teamId.slice(0, 8)}`,
         scope: 'team' as const,
         teamId,
      })),
   ];
   const selectedSeries = seriesOptions.find((option) => option.key === seriesKey) ?? seriesOptions[0];
   const seriesSnapshots = snapshots.filter((snapshot) => seriesMatches(snapshot, selectedSeries));
   const left = seriesSnapshots.find((snapshot) => snapshot.id === leftId) ?? seriesSnapshots[0] ?? null;
   const right =
      seriesSnapshots.find((snapshot) => snapshot.id === rightId && snapshot.id !== left?.id) ??
      seriesSnapshots.find((snapshot) => snapshot.id !== left?.id) ??
      null;

   const leftMetrics = left ? metricsFor(left) : [];
   const rightMetrics = right ? metricsFor(right) : [];
   const leftAttention = left?.payload.dashboard.attention ?? [];
   const rightAttention = right?.payload.dashboard.attention ?? [];
   const leftAttentionIds = new Set(leftAttention.map((item) => item.id));
   const rightAttentionIds = new Set(rightAttention.map((item) => item.id));
   const onlyLeftAttention = leftAttention.filter((item) => !rightAttentionIds.has(item.id));
   const onlyRightAttention = rightAttention.filter((item) => !leftAttentionIds.has(item.id));

   const leftDependencies = left ? dependenciesFor(left) : [];
   const rightDependencies = right ? dependenciesFor(right) : [];
   const leftDependencyIds = new Set(leftDependencies.map((item) => item.id));
   const rightDependencyIds = new Set(rightDependencies.map((item) => item.id));
   const onlyLeftDependencies = leftDependencies.filter((item) => !rightDependencyIds.has(item.id));
   const onlyRightDependencies = rightDependencies.filter((item) => !leftDependencyIds.has(item.id));

   const copyComparison = async () => {
      if (!left || !right) return;
      try {
         await navigator.clipboard.writeText(
            buildComparisonText(left, right, selectedSeries.label)
         );
         toast.success('Saved snapshot comparison copied.');
      } catch {
         toast.error('Unable to copy saved snapshot comparison.');
      }
   };

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <Link
            href={`/${workspace.organization.slug}/status-history`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
         >
            <ArrowLeft className="size-4" /> Status history
         </Link>

         <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitCompareArrows className="size-4" /> Immutable saved records
               </div>
               <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compare saved status snapshots</h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Compare two saved snapshots from the same workspace or team series. Differences are arithmetic and set membership only; this view does not infer direction, performance, risk, trend, velocity, capacity, or forecast.
               </p>
            </div>
            <button
               type="button"
               disabled={!left || !right}
               onClick={() => void copyComparison()}
               className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
               <Clipboard className="size-4" /> Copy comparison
            </button>
         </div>

         <section className="mt-8 grid gap-3 rounded-xl border p-5 lg:grid-cols-3">
            <label className="text-sm">
               <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Series</span>
               <select
                  aria-label="Snapshot series"
                  value={selectedSeries.key}
                  onChange={(event) => {
                     setSeriesKey(event.target.value);
                     setLeftId('');
                     setRightId('');
                  }}
                  className="h-10 w-full rounded-md border bg-background px-3"
               >
                  {seriesOptions.map((option) => (
                     <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
               </select>
            </label>
            <label className="text-sm">
               <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Snapshot A</span>
               <select
                  aria-label="Snapshot A"
                  value={left?.id ?? ''}
                  onChange={(event) => setLeftId(event.target.value)}
                  disabled={seriesSnapshots.length === 0}
                  className="h-10 w-full rounded-md border bg-background px-3 disabled:opacity-60"
               >
                  {seriesSnapshots.map((snapshot) => (
                     <option key={snapshot.id} value={snapshot.id}>{formatTimestamp(snapshot.createdAt)}</option>
                  ))}
               </select>
            </label>
            <label className="text-sm">
               <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Snapshot B</span>
               <select
                  aria-label="Snapshot B"
                  value={right?.id ?? ''}
                  onChange={(event) => setRightId(event.target.value)}
                  disabled={seriesSnapshots.length < 2}
                  className="h-10 w-full rounded-md border bg-background px-3 disabled:opacity-60"
               >
                  {seriesSnapshots
                     .filter((snapshot) => snapshot.id !== left?.id)
                     .map((snapshot) => (
                        <option key={snapshot.id} value={snapshot.id}>{formatTimestamp(snapshot.createdAt)}</option>
                     ))}
               </select>
            </label>
         </section>

         {loading ? (
            <div className="mt-8 text-sm text-muted-foreground" role="status">Loading saved snapshots…</div>
         ) : loadError ? (
            <div className="mt-8 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
               Saved snapshots could not be loaded. Return to Status history and retry the authenticated request.
            </div>
         ) : !left || !right ? (
            <div className="mt-8 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
               At least two saved snapshots in the same series are required for comparison.
            </div>
         ) : (
            <>
               <section className="mt-8">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                     <h2 className="text-lg font-semibold">Numeric comparison</h2>
                     <p className="text-xs text-muted-foreground">Difference = Snapshot A − Snapshot B</p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                     {leftMetrics.map((metric) => {
                        const rightValue = rightMetrics.find((candidate) => candidate.label === metric.label)?.value;
                        const difference = rightValue === undefined ? null : metric.value - rightValue;
                        return (
                           <div key={metric.label} className="rounded-xl border p-4">
                              <p className="text-xs text-muted-foreground">{metric.label}</p>
                              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                 <div><p className="text-[11px] text-muted-foreground">A</p><p className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</p></div>
                                 <div><p className="text-[11px] text-muted-foreground">B</p><p className="mt-1 text-lg font-semibold tabular-nums">{rightValue ?? '—'}</p></div>
                                 <div><p className="text-[11px] text-muted-foreground">A − B</p><p className="mt-1 text-lg font-semibold tabular-nums">{difference === null ? '—' : `${difference > 0 ? '+' : ''}${difference}`}</p></div>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </section>

               <section className="mt-8 grid gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border p-5">
                     <div className="flex items-center gap-2">
                        <ListChecks className="size-4 text-muted-foreground" />
                        <h2 className="font-semibold">Attention membership</h2>
                     </div>
                     <p className="mt-1 text-xs text-muted-foreground">Items shown only in one saved payload. This does not infer why membership differs.</p>
                     <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                           <p className="text-xs font-medium text-muted-foreground">Only in A · {onlyLeftAttention.length}</p>
                           <div className="mt-2 space-y-2">
                              {onlyLeftAttention.slice(0, 8).map((item) => (
                                 <div key={item.id} className="rounded-lg border p-3 text-sm"><span className="mr-2 text-xs text-muted-foreground">{item.identifier}</span>{item.title}</div>
                              ))}
                              {onlyLeftAttention.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : null}
                           </div>
                        </div>
                        <div>
                           <p className="text-xs font-medium text-muted-foreground">Only in B · {onlyRightAttention.length}</p>
                           <div className="mt-2 space-y-2">
                              {onlyRightAttention.slice(0, 8).map((item) => (
                                 <div key={item.id} className="rounded-lg border p-3 text-sm"><span className="mr-2 text-xs text-muted-foreground">{item.identifier}</span>{item.title}</div>
                              ))}
                              {onlyRightAttention.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : null}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="rounded-xl border p-5">
                     <div className="flex items-center gap-2">
                        <GitBranch className="size-4 text-muted-foreground" />
                        <h2 className="font-semibold">Dependency membership</h2>
                     </div>
                     <p className="mt-1 text-xs text-muted-foreground">Unresolved dependency edges present in only one selected saved payload.</p>
                     <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                           <p className="text-xs font-medium text-muted-foreground">Only in A · {onlyLeftDependencies.length}</p>
                           <div className="mt-2 space-y-2">
                              {onlyLeftDependencies.slice(0, 8).map((item) => (
                                 <div key={item.id} className="rounded-lg border p-3 text-xs">{item.blocking.identifier} → {item.blocked.identifier}</div>
                              ))}
                              {onlyLeftDependencies.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : null}
                           </div>
                        </div>
                        <div>
                           <p className="text-xs font-medium text-muted-foreground">Only in B · {onlyRightDependencies.length}</p>
                           <div className="mt-2 space-y-2">
                              {onlyRightDependencies.slice(0, 8).map((item) => (
                                 <div key={item.id} className="rounded-lg border p-3 text-xs">{item.blocking.identifier} → {item.blocked.identifier}</div>
                              ))}
                              {onlyRightDependencies.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : null}
                           </div>
                        </div>
                     </div>
                  </div>
               </section>

               <section className="mt-8 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                  Snapshot A: {formatTimestamp(left.createdAt)} · Snapshot B: {formatTimestamp(right.createdAt)}. All values come from immutable saved payloads and are not re-evaluated against current workspace state.
               </section>
            </>
         )}
      </div>
   );
}
