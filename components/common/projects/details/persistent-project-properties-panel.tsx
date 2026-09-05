'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { Issue } from '@/mock-data/issues';
import type { ProjectDetail } from '@/mock-data/project-details';
import type { Project } from '@/mock-data/projects';
import { useProjectsStore } from '@/store/projects-store';
import { Calendar, CheckCircle2, Link2, Milestone, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

function formatDate(value?: string) {
   if (!value) return 'Not set';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default function PersistentProjectPropertiesPanel({
   project,
   detail,
   issues,
}: {
   project: Project;
   detail: ProjectDetail;
   issues: Issue[];
}) {
   const workspace = useWorkspace();
   const teams = useProjectsStore((state) => state.teams);
   const team = teams.find((candidate) => candidate.key === project.teamId);
   const base = `/${workspace.organization.slug}/project/${project.id}`;
   const completed = issues.filter((issue) => issue.status.category === 'completed').length;
   const started = issues.filter((issue) => issue.status.category === 'started').length;
   const assignees = useMemo(() => {
      const seen = new Set<string>();
      return issues
         .map((issue) => issue.assignee)
         .filter((member): member is NonNullable<typeof member> => {
            if (!member || seen.has(member.id)) return false;
            seen.add(member.id);
            return true;
         });
   }, [issues]);

   return (
      <div className="flex h-full w-full flex-col overflow-y-auto">
         <div className="border-b px-5 py-4">
            <h3 className="text-sm font-medium">Project</h3>
            <div className="mt-3 space-y-3 text-sm">
               <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                     <project.status.icon /> {project.status.name}
                  </span>
               </div>
               <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Lead</span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                     <Avatar className="size-5">
                        <AvatarImage src={project.lead.avatarUrl} alt={project.lead.name} />
                        <AvatarFallback>{project.lead.name[0]}</AvatarFallback>
                     </Avatar>
                     <span className="max-w-40 truncate">{project.lead.name}</span>
                  </span>
               </div>
               <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Team</span>
                  <span>{team?.name ?? project.teamId}</span>
               </div>
               <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Target</span>
                  <span className="inline-flex items-center gap-1.5">
                     <Calendar className="size-3.5 text-muted-foreground" />
                     {formatDate(project.targetDate)}
                  </span>
               </div>
               <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Initiative</span>
                  <span className="max-w-44 truncate">{project.initiative || 'None'}</span>
               </div>
               <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Labels</span>
                  <div className="flex max-w-48 flex-wrap justify-end gap-1">
                     {project.labels.length === 0 ? (
                        <span className="text-muted-foreground">None</span>
                     ) : (
                        project.labels.map((label) => (
                           <span key={label.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                              <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                              {label.name}
                           </span>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </div>

         <div className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-medium">Work</h3>
               <span className="text-xs text-muted-foreground">{issues.length} issues</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
               <div className="rounded-md border p-2">
                  <div className="text-lg font-semibold">{issues.length}</div>
                  <div className="text-[11px] text-muted-foreground">Scope</div>
               </div>
               <div className="rounded-md border p-2">
                  <div className="text-lg font-semibold">{started}</div>
                  <div className="text-[11px] text-muted-foreground">Started</div>
               </div>
               <div className="rounded-md border p-2">
                  <div className="text-lg font-semibold">{completed}</div>
                  <div className="text-[11px] text-muted-foreground">Completed</div>
               </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
               <UsersRound className="size-3.5" />
               {assignees.length > 0
                  ? `${assignees.length} active ${assignees.length === 1 ? 'assignee' : 'assignees'}`
                  : 'No active assignees'}
            </div>
         </div>

         <div className="border-b px-5 py-4">
            <div className="flex items-center justify-between">
               <h3 className="text-sm font-medium">Milestones</h3>
               <Link href={`${base}/milestones`} className="text-xs text-primary hover:underline">
                  Manage
               </Link>
            </div>
            {detail.milestones.length === 0 ? (
               <p className="mt-2 text-xs text-muted-foreground">No milestones yet.</p>
            ) : (
               <div className="mt-2 space-y-2">
                  {detail.milestones.slice(0, 4).map((milestone) => (
                     <div key={milestone.id} className="flex items-center gap-2 text-xs">
                        {milestone.completed ? (
                           <CheckCircle2 className="size-3.5 text-emerald-500" />
                        ) : (
                           <Milestone className="size-3.5 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{milestone.name}</span>
                        <span className="text-muted-foreground">{formatDate(milestone.targetDate)}</span>
                     </div>
                  ))}
               </div>
            )}
         </div>

         <div className="px-5 py-4">
            <h3 className="text-sm font-medium">Connected surfaces</h3>
            <div className="mt-3 grid gap-2 text-sm">
               <Link href={`${base}/overview`} className="rounded-md border px-3 py-2 hover:bg-accent/40">Overview</Link>
               <Link href={`${base}/issues`} className="rounded-md border px-3 py-2 hover:bg-accent/40">Issues</Link>
               <Link href={`${base}/milestones`} className="rounded-md border px-3 py-2 hover:bg-accent/40">Milestones</Link>
               <Link href={`${base}/activity`} className="rounded-md border px-3 py-2 hover:bg-accent/40">Activity & updates</Link>
            </div>
            <div className="mt-4 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
               <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Link2 className="size-3.5" /> Slack
               </div>
               <p className="mt-1">No Slack integration is connected. The previous dead “Connect channel” control is intentionally hidden.</p>
            </div>
         </div>
      </div>
   );
}
