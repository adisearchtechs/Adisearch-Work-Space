'use client';

import { ContentBlocks } from '@/components/common/issues/details/content-blocks';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContentBlock } from '@/mock-data/issue-details';
import {
   getProjectDetail,
   projectUpdateHealthColor,
   projectUpdateHealthLabel,
} from '@/mock-data/project-details';
import type {
   ProjectUpdateDto,
   ProjectUpdateHealth,
   ProjectUpdateKind,
} from '@/lib/project-updates/contracts';
import { cn } from '@/lib/utils';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectUpdatesStore } from '@/store/project-updates-store';
import { useProjectsStore } from '@/store/projects-store';
import { format, parseISO } from 'date-fns';
import { Paperclip, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ProjectSidePanel } from './project-side-panel';

interface ProjectActivityProps {
   projectId: string;
}

type TimelineUpdate = {
   id: string;
   authorName: string;
   authorAvatarUrl: string | null;
   createdAt: string;
   kind: ProjectUpdateKind;
   health: ProjectUpdateHealth | null;
   blocks: ContentBlock[];
};

const EMPTY_UPDATES: ProjectUpdateDto[] = [];

function bodyToBlocks(body: string): ContentBlock[] {
   return body
      .split(/\n{2,}/)
      .filter((paragraph) => paragraph.trim() !== '')
      .map((paragraph) => ({ type: 'paragraph', text: paragraph.trim() }));
}

function dtoToTimelineUpdate(update: ProjectUpdateDto): TimelineUpdate {
   return {
      id: update.id,
      authorName: update.author.displayName,
      authorAvatarUrl: update.author.avatarUrl,
      createdAt: update.createdAt,
      kind: update.kind,
      health: update.health,
      blocks: bodyToBlocks(update.body),
   };
}

function HealthBadge({ health }: { health: ProjectUpdateHealth }) {
   return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
         <span
            className="size-2 rounded-full"
            style={{ backgroundColor: projectUpdateHealthColor[health] }}
         />
         {projectUpdateHealthLabel[health]}
      </span>
   );
}

function UpdateCard({ update }: { update: TimelineUpdate }) {
   return (
      <div className="rounded-lg border p-4">
         <div className="flex items-center gap-2 text-sm">
            <Avatar className="size-5">
               <AvatarImage src={update.authorAvatarUrl ?? undefined} alt={update.authorName} />
               <AvatarFallback>{update.authorName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{update.authorName}</span>
            <span className="text-xs text-muted-foreground">
               {format(parseISO(update.createdAt), 'MMM d')}
            </span>
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
         <div className="mt-2 text-sm leading-relaxed">
            <ContentBlocks blocks={update.blocks} />
         </div>
      </div>
   );
}

/** Project "Activity" tab: persistent update composer + monthly timeline. */
export default function ProjectActivity({ projectId }: ProjectActivityProps) {
   const workspace = useWorkspace();
   const storedProject = useProjectsStore((state) =>
      state.projects.find((item) => item.id === projectId)
   );
   const workspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const loading = useProjectsStore((state) => state.loading);
   const detail = getProjectDetail(projectId);
   const { issues: allIssues } = useIssuesStore();
   const issues = useMemo(
      () => allIssues.filter((issue) => issue.project?.id === projectId),
      [allIssues, projectId]
   );
   const storedUpdates = useProjectUpdatesStore(
      (state) => state.updatesByProject[projectId] ?? EMPTY_UPDATES
   );
   const replaceProjectUpdates = useProjectUpdatesStore((state) => state.replaceProjectUpdates);
   const prependProjectUpdate = useProjectUpdatesStore((state) => state.prependProjectUpdate);
   const postLocalUpdate = useProjectUpdatesStore((state) => state.postLocalUpdate);
   const [mode, setMode] = useState<ProjectUpdateKind>('update');
   const [health, setHealth] = useState<ProjectUpdateHealth>('on-track');
   const [text, setText] = useState('');
   const [updatesLoading, setUpdatesLoading] = useState(false);
   const [posting, setPosting] = useState(false);
   const workspaceReady = !workspace.configured || workspaceSlug === workspace.organization.slug;
   const project = workspaceReady ? storedProject : undefined;

   useEffect(() => {
      if (!workspace.configured) return;

      const controller = new AbortController();
      replaceProjectUpdates(projectId, []);
      setUpdatesLoading(true);

      void fetch(
         `/api/projects/${encodeURIComponent(projectId)}/updates?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
         }
      )
         .then(async (response) => {
            if (!response.ok) {
               throw new Error(`Project updates load failed with ${response.status}.`);
            }
            return (await response.json()) as { updates: ProjectUpdateDto[] };
         })
         .then(({ updates }) => {
            if (controller.signal.aborted) return;
            replaceProjectUpdates(projectId, updates);
            setUpdatesLoading(false);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setUpdatesLoading(false);
            toast.error('Unable to load project updates.');
         });

      return () => controller.abort();
   }, [
      projectId,
      replaceProjectUpdates,
      workspace.configured,
      workspace.organization.slug,
   ]);

   const updates = useMemo<TimelineUpdate[]>(() => {
      const runtimeUpdates = storedUpdates.map(dtoToTimelineUpdate);
      if (workspace.configured) return runtimeUpdates;

      const demoUpdates: TimelineUpdate[] = detail.updates.map((update) => ({
         id: update.id,
         authorName: update.author.name,
         authorAvatarUrl: update.author.avatarUrl,
         createdAt: update.date,
         kind: 'update',
         health: update.health,
         blocks: update.blocks,
      }));
      return [...runtimeUpdates, ...demoUpdates];
   }, [detail.updates, storedUpdates, workspace.configured]);

   const updatesByMonth = useMemo(() => {
      const groups = new Map<string, { label: string; updates: TimelineUpdate[] }>();
      for (const update of updates) {
         const date = parseISO(update.createdAt);
         const key = format(date, 'yyyy-MM');
         const existing = groups.get(key);
         if (existing) {
            existing.updates.push(update);
         } else {
            groups.set(key, { label: format(date, 'MMMM yyyy'), updates: [update] });
         }
      }
      return [...groups.values()];
   }, [updates]);

   const completedPercent =
      issues.length > 0
         ? Math.round(
              (issues.filter((issue) => issue.status.category === 'completed').length /
                 issues.length) *
                 100
           )
         : 0;

   if (!project) {
      return (
         <div
            className="flex h-full items-center justify-center text-sm text-muted-foreground"
            role="status"
         >
            {loading ? 'Loading project…' : 'Project not found.'}
         </div>
      );
   }

   const handlePost = async () => {
      const body = text.trim();
      if (!body || posting) return;

      if (!workspace.configured) {
         postLocalUpdate(project.id, mode, mode === 'update' ? health : null, body);
         setText('');
         return;
      }

      setPosting(true);
      try {
         const response = await fetch(
            `/api/projects/${encodeURIComponent(project.id)}/updates?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({
                  kind: mode,
                  health: mode === 'update' ? health : null,
                  body,
               }),
            }
         );
         if (!response.ok) {
            throw new Error(`Project update post failed with ${response.status}.`);
         }

         const { update } = (await response.json()) as { update: ProjectUpdateDto };
         prependProjectUpdate(project.id, update);
         setText('');
      } catch {
         toast.error(`Unable to post project ${mode}.`);
      } finally {
         setPosting(false);
      }
   };

   return (
      <div className="flex h-full w-full overflow-hidden">
         <div className="h-full min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
               <div className="rounded-lg border p-4">
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
                              {(Object.keys(projectUpdateHealthLabel) as ProjectUpdateHealth[]).map(
                                 (value) => (
                                    <DropdownMenuItem key={value} onClick={() => setHealth(value)}>
                                       <span
                                          className="size-2 rounded-full"
                                          style={{
                                             backgroundColor: projectUpdateHealthColor[value],
                                          }}
                                       />
                                       {projectUpdateHealthLabel[value]}
                                    </DropdownMenuItem>
                                 )
                              )}
                           </DropdownMenuContent>
                        </DropdownMenu>
                     )}
                  </div>

                  <textarea
                     value={text}
                     onChange={(event) => setText(event.target.value)}
                     placeholder={
                        mode === 'update' ? 'Write a project update…' : 'Leave a comment…'
                     }
                     maxLength={10000}
                     className="mt-3 min-h-24 w-full resize-y bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />

                  {mode === 'update' && (
                     <div className="mt-1 flex flex-col gap-1.5 border-l-2 py-1 pl-4 text-xs text-muted-foreground">
                        <div className="flex gap-6">
                           <span className="w-20">Priority</span>
                           <span>
                              No priority →{' '}
                              <span className="text-foreground">{project.priority.name}</span>
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">Lead</span>
                           <span>
                              <span className="text-foreground">{project.lead.name}</span> assigned
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">Target date</span>
                           <span>
                              set to{' '}
                              <span className="text-foreground">
                                 {project.targetDate
                                    ? format(parseISO(project.targetDate), 'MMM do')
                                    : '—'}
                              </span>
                           </span>
                        </div>
                        <div className="flex gap-6">
                           <span className="w-20">Progress</span>
                           <span>
                              0% → <span className="text-foreground">{completedPercent}%</span>
                           </span>
                        </div>
                     </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                     <Button variant="outline" size="xs" className="gap-1.5">
                        <Sparkles className="size-3.5" />
                        Write with Agent
                     </Button>
                     <div className="flex items-center gap-2">
                        <Button
                           variant="ghost"
                           size="icon"
                           className="size-7 text-muted-foreground"
                        >
                           <Paperclip className="size-4" />
                        </Button>
                        <Button
                           size="xs"
                           onClick={() => void handlePost()}
                           disabled={text.trim() === '' || posting}
                        >
                           {posting ? 'Posting…' : `Post ${mode}`}
                        </Button>
                     </div>
                  </div>
               </div>

               {workspace.configured && updatesLoading ? (
                  <p className="mt-10 text-center text-sm text-muted-foreground" role="status">
                     Loading project updates…
                  </p>
               ) : updatesByMonth.length === 0 ? (
                  <p className="mt-10 text-center text-sm text-muted-foreground">
                     No updates yet — post the first one to keep the team in the loop.
                  </p>
               ) : (
                  updatesByMonth.map((group) => (
                     <div key={group.label} className="mt-8">
                        <h3 className="mb-3 text-lg font-semibold">{group.label}</h3>
                        <div className="flex flex-col gap-3">
                           {group.updates.map((update) => (
                              <UpdateCard key={update.id} update={update} />
                           ))}
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>

         <ProjectSidePanel project={project} detail={detail} issues={issues} />
      </div>
   );
}
