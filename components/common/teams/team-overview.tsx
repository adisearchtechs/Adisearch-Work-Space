'use client';

import { useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { TeamDashboardAttentionReason, TeamDashboardHealth, TeamDashboardResponse } from '@/lib/team-dashboard/contracts';
import type { TeamDocumentDto } from '@/lib/team-documents/contracts';
import type { TeamDetailsDto } from '@/lib/teams/contracts';
import { teams as demoTeams } from '@/mock-data/teams';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';
import { RiDonutChartFill } from '@remixicon/react';
import {
   Activity,
   AlertTriangle,
   Box,
   CalendarDays,
   CheckCircle2,
   Clock3,
   CopyMinus,
   FileText,
   Pin,
   Settings,
   Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

function formatDate(value: string | null) {
   if (!value) return 'No target date';
   return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
      new Date(`${value}T00:00:00`)
   );
}

function healthLabel(health: TeamDashboardHealth | null) {
   if (!health) return 'No health update';
   if (health === 'on-track') return 'On track';
   if (health === 'at-risk') return 'At risk';
   return 'Off track';
}

function reasonLabel(reason: TeamDashboardAttentionReason) {
   if (reason === 'due-soon') return 'Due soon';
   return reason.slice(0, 1).toUpperCase() + reason.slice(1);
}

function projectStatusLabel(status: TeamDashboardResponse['projects'][number]['status']) {
   return status.slice(0, 1).toUpperCase() + status.slice(1);
}

export default function TeamOverview() {
   const workspace = useWorkspace();
   const { orgId, teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const [details, setDetails] = useState<TeamDetailsDto | null>(null);
   const [documents, setDocuments] = useState<TeamDocumentDto[]>([]);
   const [dashboard, setDashboard] = useState<TeamDashboardResponse | null>(null);
   const [loadError, setLoadError] = useState(false);
   const resolvedTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const pinnedDocuments = useMemo(
      () => documents.filter((document) => document.pinned).slice(0, 6),
      [documents]
   );

   useEffect(() => {
      if (!workspace.configured || !resolvedTeam) return;
      const controller = new AbortController();
      setDetails(null);
      setDocuments([]);
      setDashboard(null);
      setLoadError(false);
      const query = `?organization=${encodeURIComponent(workspace.organization.slug)}`;
      const requestOptions = {
         credentials: 'same-origin' as const,
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      };
      void Promise.all([
         fetch(`/api/teams/${encodeURIComponent(resolvedTeam.id)}${query}`, requestOptions).then(
            async (response) => {
               if (!response.ok) throw new Error(`Team load failed with ${response.status}.`);
               return (await response.json()) as { team: TeamDetailsDto };
            }
         ),
         fetch(
            `/api/teams/${encodeURIComponent(resolvedTeam.id)}/documents${query}`,
            requestOptions
         ).then(async (response) => {
            if (!response.ok) {
               throw new Error(`Team documents load failed with ${response.status}.`);
            }
            return (await response.json()) as { documents: TeamDocumentDto[] };
         }),
         fetch(
            `/api/teams/${encodeURIComponent(resolvedTeam.id)}/dashboard${query}`,
            requestOptions
         ).then(async (response) => {
            if (!response.ok) {
               throw new Error(`Team dashboard load failed with ${response.status}.`);
            }
            return (await response.json()) as TeamDashboardResponse;
         }),
      ])
         .then(([teamResult, documentResult, dashboardResult]) => {
            if (controller.signal.aborted) return;
            setDetails(teamResult.team);
            setDocuments(documentResult.documents);
            setDashboard(dashboardResult);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError(true);
            toast.error('Unable to load team operating dashboard.');
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

   if (loadError) {
      return (
         <div className="mx-auto max-w-2xl px-6 py-10">
            <h1 className="text-2xl font-medium">Unable to load team dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Refresh the page to retry the workspace data request.</p>
         </div>
      );
   }

   if (!details || !dashboard) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading operating dashboard…</div>;
   }

   const team = details;
   const goToLinks = [
      { label: 'Team settings', icon: Settings, href: `/${orgId}/settings/teams/${resolvedTeam.id}` },
      { label: 'Issues', icon: CopyMinus, href: `/${orgId}/team/${resolvedTeam.key}/all` },
      { label: 'Cycles', icon: RiDonutChartFill, href: `/${orgId}/team/${resolvedTeam.key}/cycles` },
      { label: 'Projects', icon: Box, href: `/${orgId}/team/${resolvedTeam.key}/projects` },
      { label: 'Documents', icon: FileText, href: `/${orgId}/team/${resolvedTeam.key}/documents` },
   ];
   const currentCycle = dashboard.currentCycle;

   return (
      <div className="w-full max-w-6xl mx-auto px-5 sm:px-8 py-8 lg:py-10 flex flex-col lg:flex-row gap-10 xl:gap-12">
         <main className="flex-1 min-w-0">
            <div className="flex items-center gap-4">
               <span className="size-12 shrink-0 rounded-xl border" style={{ backgroundColor: resolvedTeam.color }} />
               <div className="min-w-0">
                  <h1 className="truncate text-3xl font-semibold">{resolvedTeam.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{resolvedTeam.key} · issue prefix {resolvedTeam.issuePrefix}</p>
               </div>
            </div>

            <section aria-label="Team operating metrics" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
               <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="size-3.5" />Active work</div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.work.active}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{dashboard.work.completed} completed</p>
               </div>
               <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><RiDonutChartFill className="size-3.5" />Current cycle</div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{currentCycle ? `${currentCycle.completed}/${currentCycle.scope}` : '—'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentCycle ? `${currentCycle.successRate}% complete` : 'No active cycle'}</p>
               </div>
               <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="size-3.5" />Needs attention</div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.work.attention}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{dashboard.work.blocked} blocked · {dashboard.work.overdue} overdue</p>
               </div>
               <div className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Box className="size-3.5" />Owned projects</div>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{dashboard.projects.length}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Primary team ownership</p>
               </div>
            </section>

            <section className="mt-8 rounded-xl border p-5">
               <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                     <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <h2 className="font-semibold">Current cycle</h2>
                     </div>
                     {currentCycle ? (
                        <p className="mt-1 text-sm text-muted-foreground">{currentCycle.name} · {formatDate(currentCycle.startDate)} – {formatDate(currentCycle.endDate)}</p>
                     ) : (
                        <p className="mt-1 text-sm text-muted-foreground">No cycle is active for today.</p>
                     )}
                  </div>
                  <Link href={`/${orgId}/team/${resolvedTeam.key}/cycles`} className="text-sm font-medium text-muted-foreground hover:text-foreground">Open cycles</Link>
               </div>
               {currentCycle ? (
                  <div className="mt-5">
                     <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${Math.min(100, Math.max(0, currentCycle.successRate))}%` }} />
                     </div>
                     <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                        <div><p className="text-xs text-muted-foreground">Scope</p><p className="mt-0.5 font-medium tabular-nums">{currentCycle.scope}</p></div>
                        <div><p className="text-xs text-muted-foreground">Started</p><p className="mt-0.5 font-medium tabular-nums">{currentCycle.started}</p></div>
                        <div><p className="text-xs text-muted-foreground">Completed</p><p className="mt-0.5 font-medium tabular-nums">{currentCycle.completed}</p></div>
                        <div><p className="text-xs text-muted-foreground">Canceled</p><p className="mt-0.5 font-medium tabular-nums">{currentCycle.canceled}</p></div>
                     </div>
                  </div>
               ) : null}
            </section>

            <section className="mt-8">
               <div className="flex items-center justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Attention</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Blocked, overdue, urgent, and near-term work owned by this team.</p>
                  </div>
                  <Link href={`/${orgId}/team/${resolvedTeam.key}/all`} className="text-sm font-medium text-muted-foreground hover:text-foreground">View issues</Link>
               </div>
               <div className="mt-4 overflow-hidden rounded-xl border">
                  {dashboard.attention.length === 0 ? (
                     <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground"><CheckCircle2 className="size-4" />No team-owned work needs attention right now.</div>
                  ) : (
                     dashboard.attention.map((issue, index) => (
                        <div key={issue.id} className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center ${index ? 'border-t' : ''}`}>
                           <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-2">
                                 <span className="shrink-0 text-xs font-medium text-muted-foreground">{issue.identifier}</span>
                                 <p className="truncate text-sm font-medium">{issue.title}</p>
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">{issue.project?.name ?? 'No project'} · {issue.statusName}{issue.dueDate ? ` · due ${formatDate(issue.dueDate)}` : ''}</p>
                           </div>
                           <span className="inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-1 text-[11px] font-medium">{reasonLabel(issue.reason)}</span>
                        </div>
                     ))
                  )}
               </div>
               {dashboard.work.attention > dashboard.attention.length ? (
                  <p className="mt-2 text-xs text-muted-foreground">Showing {dashboard.attention.length} of {dashboard.work.attention} attention items.</p>
               ) : null}
            </section>

            <section className="mt-8">
               <div className="flex items-center justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Owned projects</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Delivery progress and latest persisted project health.</p>
                  </div>
                  <Link href={`/${orgId}/team/${resolvedTeam.key}/projects`} className="text-sm font-medium text-muted-foreground hover:text-foreground">View projects</Link>
               </div>
               <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {dashboard.projects.length === 0 ? (
                     <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground sm:col-span-2">This team is operating as a cross-cutting function and has no primary project ownership yet.</div>
                  ) : (
                     dashboard.projects.slice(0, 6).map((project) => (
                        <div key={project.id} className="rounded-xl border p-4">
                           <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                 <p className="truncate text-sm font-semibold">{project.name}</p>
                                 <p className="mt-1 text-xs text-muted-foreground">{projectStatusLabel(project.status)} · {healthLabel(project.health)}</p>
                              </div>
                              <span className="shrink-0 text-sm font-semibold tabular-nums">{project.progress}%</span>
                           </div>
                           <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
                           </div>
                           <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>{project.completedIssueCount}/{project.issueCount} issues completed</span>
                              <span className="truncate">{formatDate(project.targetDate)}</span>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </section>

            <section className="mt-8">
               <div className="flex items-center justify-between gap-3">
                  <div>
                     <h2 className="text-lg font-semibold">Pinned documents</h2>
                     <p className="mt-1 text-sm text-muted-foreground">Operating charters, decisions, and references kept close to the team.</p>
                  </div>
                  <Link href={`/${orgId}/team/${resolvedTeam.key}/documents`} className="text-sm font-medium text-muted-foreground hover:text-foreground">View all</Link>
               </div>
               <div className="mt-4 grid gap-2">
                  {pinnedDocuments.length === 0 ? (
                     <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No pinned documents yet.</div>
                  ) : (
                     pinnedDocuments.map((document) => (
                        <Link
                           key={document.id}
                           href={`/${orgId}/team/${resolvedTeam.key}/documents`}
                           className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:bg-muted/30"
                        >
                           <Pin className="size-4 shrink-0 text-muted-foreground" />
                           <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{document.title}</p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">{document.body || 'Empty document'}</p>
                           </div>
                        </Link>
                     ))
                  )}
               </div>
            </section>
         </main>

         <aside className="w-full lg:w-64 shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground">Members</h3>
            <div className="mt-3 flex flex-col gap-2">
               {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assigned members.</p>
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

            <h3 className="text-sm font-medium text-muted-foreground mt-8">Work signals</h3>
            <div className="mt-3 space-y-2 rounded-xl border p-3 text-xs">
               <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><AlertTriangle className="size-3.5" />Blocked</span><span className="font-medium tabular-nums">{dashboard.work.blocked}</span></div>
               <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><Clock3 className="size-3.5" />Overdue</span><span className="font-medium tabular-nums">{dashboard.work.overdue}</span></div>
               <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><Activity className="size-3.5" />Urgent</span><span className="font-medium tabular-nums">{dashboard.work.urgent}</span></div>
               <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-muted-foreground"><CalendarDays className="size-3.5" />Due in 7 days</span><span className="font-medium tabular-nums">{dashboard.work.dueSoon}</span></div>
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

            <div className="mt-8 rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5"><Users className="size-3.5" /> {resolvedTeam.usage.members} assigned members</div>
               <div className="mt-2 flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> {dashboard.work.total} recorded team issues</div>
            </div>
         </aside>
      </div>
   );
}
