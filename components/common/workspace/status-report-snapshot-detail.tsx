'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, Clipboard, Download, GitBranch, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type {
   StatusReportSnapshotDetailResponse,
   StatusReportSnapshotDto,
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

function buildFrozenUpdate(snapshot: StatusReportSnapshotDto, workspaceName: string, teamName: string) {
   if (snapshot.payload.kind === 'workspace') {
      const { dashboard, dependencies } = snapshot.payload;
      const lines = [
         `${workspaceName} — Saved workspace status`,
         `Captured: ${snapshot.createdAt}`,
         `Source generated: ${snapshot.generatedAt}`,
         '',
         `Issues: ${dashboard.summary.activeIssues} active, ${dashboard.summary.completedIssues} completed, ${dashboard.summary.attention} attention items.`,
         `Projects: ${dashboard.portfolio.activeProjects} active, ${dashboard.portfolio.atRiskProjects} persisted at-risk, ${dashboard.portfolio.offTrackProjects} persisted off-track.`,
         `Milestones: ${dashboard.portfolio.openMilestones} open, ${dashboard.portfolio.overdueMilestones} overdue.`,
         `Dependencies: ${dependencies.summary.unresolvedDependencies} unresolved, ${dependencies.summary.crossProjectDependencies} cross-project, ${dependencies.summary.projectsBlocked} projects blocked.`,
      ];

      if (dashboard.attention.length > 0) {
         lines.push('', 'Attention at capture:');
         for (const issue of dashboard.attention.slice(0, 5)) {
            lines.push(`- ${issue.identifier} — ${issue.title} (${issue.reason})`);
         }
      }

      lines.push(
         '',
         'Source: immutable saved workspace snapshot. No forecast, inferred trend, capacity estimate, or AI-generated claim is included.'
      );
      return lines.join('\n');
   }

   const { dashboard } = snapshot.payload;
   const dependencies = teamDependencies(snapshot.payload);
   const lines = [
      `${teamName} — Saved team status`,
      `Captured: ${snapshot.createdAt}`,
      `Source generated: ${snapshot.generatedAt}`,
      '',
      `Work: ${dashboard.work.active} active, ${dashboard.work.completed} completed, ${dashboard.work.attention} attention items.`,
      `Attention signals: ${dashboard.work.blocked} blocked, ${dashboard.work.overdue} overdue, ${dashboard.work.urgent} urgent, ${dashboard.work.dueSoon} due soon.`,
      `Dependencies: ${dependencies.length} unresolved touching this team.`,
   ];

   if (dashboard.currentCycle) {
      lines.push(
         `Current cycle at capture: ${dashboard.currentCycle.name} — ${dashboard.currentCycle.completed}/${dashboard.currentCycle.scope} completed (${dashboard.currentCycle.successRate}% issue completion).`
      );
   } else {
      lines.push('Current cycle at capture: none active.');
   }

   if (dashboard.attention.length > 0) {
      lines.push('', 'Attention at capture:');
      for (const issue of dashboard.attention.slice(0, 5)) {
         lines.push(`- ${issue.identifier} — ${issue.title} (${issue.reason})`);
      }
   }

   lines.push(
      '',
      'Source: immutable saved team snapshot. No forecast, inferred trend, velocity, capacity estimate, or AI-generated claim is included.'
   );
   return lines.join('\n');
}

function HealthProjects({ snapshot }: { snapshot: StatusReportSnapshotDto }) {
   const projects = snapshot.payload.dashboard.projects
      .filter((project) => project.health === 'at-risk' || project.health === 'off-track')
      .slice(0, 8);

   return (
      <section className="rounded-xl border p-5">
         <h2 className="text-base font-semibold">Persisted project health at capture</h2>
         <p className="mt-1 text-sm text-muted-foreground">
            Only health values that were already persisted when this snapshot was saved.
         </p>
         <div className="mt-4 divide-y rounded-lg border">
            {projects.length === 0 ? (
               <p className="p-4 text-sm text-muted-foreground">No persisted at-risk or off-track project health was captured.</p>
            ) : (
               projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                     <div className="min-w-0">
                        <p className="truncate font-medium">{project.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{project.progress}% issue completion</p>
                     </div>
                     <span className="shrink-0 rounded-full border px-2 py-1 text-xs">
                        {project.health === 'off-track' ? 'Off track' : 'At risk'}
                     </span>
                  </div>
               ))
            )}
         </div>
      </section>
   );
}

export function StatusReportSnapshotDetail({ snapshotId }: { snapshotId: string }) {
   const workspace = useWorkspace();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const [detail, setDetail] = useState<StatusReportSnapshotDetailResponse | null>(null);
   const [loadError, setLoadError] = useState(false);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setLoadError(false);
      setDetail(null);

      void fetch(
         `/api/status-report-snapshots/${encodeURIComponent(snapshotId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
         }
      )
         .then(async (response) => {
            if (!response.ok) throw new Error(`Snapshot detail load failed with ${response.status}.`);
            return (await response.json()) as StatusReportSnapshotDetailResponse;
         })
         .then((result) => {
            if (!controller.signal.aborted) setDetail(result);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load saved status snapshot.');
         });

      return () => controller.abort();
   }, [snapshotId, workspace.configured, workspace.organization.slug]);

   const teamName = useMemo(() => {
      if (!detail?.snapshot.teamId || workspaceSlug !== workspace.organization.slug) return 'Team';
      return teams.find((team) => team.id === detail.snapshot.teamId)?.name ?? 'Team';
   }, [detail?.snapshot.teamId, teams, workspace.organization.slug, workspaceSlug]);

   if (!workspace.configured) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <h1 className="text-2xl font-semibold">Saved status snapshot</h1>
            <p className="mt-2 text-sm text-muted-foreground">
               Saved status snapshots require persistent workspace data. Demo mode does not fabricate historical records.
            </p>
         </div>
      );
   }

   if (loadError) {
      return (
         <div className="mx-auto max-w-3xl px-6 py-12">
            <Link href={`/${workspace.organization.slug}/status-history`} className="text-sm text-muted-foreground hover:text-foreground">
               ← Back to status history
            </Link>
            <h1 className="mt-5 text-2xl font-semibold">Unable to load saved snapshot</h1>
            <p className="mt-2 text-sm text-muted-foreground">The snapshot may not exist in this workspace, or the authenticated request could not be completed.</p>
         </div>
      );
   }

   if (!detail) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading saved status snapshot…</div>;
   }

   const { snapshot, previous } = detail;
   const metrics = metricsFor(snapshot);
   const previousMetrics = previous ? metricsFor(previous) : [];
   const currentReportHref =
      snapshot.scope === 'workspace'
         ? `/${workspace.organization.slug}/status-report`
         : `/${workspace.organization.slug}/team/${snapshot.teamId}/status-report`;

   const copyUpdate = async () => {
      try {
         await navigator.clipboard.writeText(
            buildFrozenUpdate(snapshot, workspace.organization.name, teamName)
         );
         toast.success('Saved status update copied.');
      } catch {
         toast.error('Unable to copy saved status update.');
      }
   };

   const exportJson = () => {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adisearch-${snapshot.scope}-status-${snapshot.createdAt.replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
   };

   const attention = snapshot.payload.dashboard.attention.slice(0, 8);
   const dependencies =
      snapshot.payload.kind === 'workspace'
         ? snapshot.payload.dependencies.dependencies.slice(0, 8)
         : teamDependencies(snapshot.payload).slice(0, 8);

   return (
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
         <Link
            href={`/${workspace.organization.slug}/status-history`}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
         >
            <ArrowLeft className="size-4" /> Status history
         </Link>

         <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Archive className="size-4" /> Immutable saved record
               </div>
               <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  {snapshot.scope === 'workspace' ? 'Workspace status snapshot' : `${teamName} status snapshot`}
               </h1>
               <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                  Captured {formatTimestamp(snapshot.createdAt)} from source data generated {formatTimestamp(snapshot.generatedAt)}. This page renders the frozen saved payload, not today's workspace state.
               </p>
            </div>
            <div className="flex flex-wrap gap-2">
               <button type="button" onClick={() => void copyUpdate()} className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted">
                  <Clipboard className="size-4" /> Copy saved update
               </button>
               <button type="button" onClick={exportJson} className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted">
                  <Download className="size-4" /> Export JSON
               </button>
               <Link href={currentReportHref} className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted">
                  Current report
               </Link>
            </div>
         </div>

         <section aria-label="Saved status metrics" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {metrics.map((metric) => {
               const oldValue = previousMetrics.find((item) => item.label === metric.label)?.value;
               const delta = oldValue === undefined ? null : metric.value - oldValue;
               return (
                  <div key={metric.label} className="rounded-xl border p-4">
                     <p className="text-xs text-muted-foreground">{metric.label}</p>
                     <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-2xl font-semibold tabular-nums">{metric.value}</p>
                        {delta !== null ? (
                           <span className="text-xs text-muted-foreground tabular-nums">{delta > 0 ? '+' : ''}{delta}</span>
                        ) : null}
                     </div>
                  </div>
               );
            })}
         </section>

         <p className="mt-3 text-xs text-muted-foreground">
            {previous
               ? `Numeric differences compare only with the previous saved snapshot from ${formatTimestamp(previous.createdAt)}. They are not labeled as improvement, deterioration, trend, risk, or forecast.`
               : 'No earlier saved snapshot exists in this series, so no numeric comparison is shown.'}
         </p>

         <section className="mt-10 grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border p-5">
               <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold">Attention at capture</h2>
               </div>
               <div className="mt-4 divide-y rounded-lg border">
                  {attention.length === 0 ? (
                     <p className="p-4 text-sm text-muted-foreground">No attention items were present in this saved payload.</p>
                  ) : (
                     attention.map((issue) => (
                        <div key={issue.id} className="p-3 text-sm">
                           <p className="font-medium"><span className="mr-2 text-xs text-muted-foreground">{issue.identifier}</span>{issue.title}</p>
                           <p className="mt-1 text-xs text-muted-foreground">{issue.reason}{issue.dueDate ? ` · due ${issue.dueDate}` : ''}</p>
                        </div>
                     ))
                  )}
               </div>
            </div>

            <HealthProjects snapshot={snapshot} />
         </section>

         <section className="mt-6 rounded-xl border p-5">
            <div className="flex items-center gap-2">
               <GitBranch className="size-4 text-muted-foreground" />
               <h2 className="text-base font-semibold">Unresolved dependencies at capture</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
               Saved dependency edges only. The list does not re-query their current state.
            </p>
            <div className="mt-4 divide-y rounded-lg border">
               {dependencies.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No unresolved dependency edges were captured.</p>
               ) : (
                  dependencies.map((dependency) => (
                     <div key={dependency.id} className="grid gap-1 p-3 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
                        <span className="min-w-0 truncate">{dependency.blocking.identifier} · {dependency.blocking.title}</span>
                        <span className="text-xs text-muted-foreground">blocks</span>
                        <span className="min-w-0 truncate">{dependency.blocked.identifier} · {dependency.blocked.title}</span>
                     </div>
                  ))
               )}
            </div>
         </section>

         <div className="mt-8 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            Snapshot ID: <span className="font-mono">{snapshot.id}</span> · Schema version {snapshot.schemaVersion}. Export contains the same authenticated frozen record rendered here.
         </div>
      </div>
   );
}
