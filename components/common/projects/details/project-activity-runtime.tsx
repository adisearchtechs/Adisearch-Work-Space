'use client';

import { EntityAttachments } from '@/components/common/attachments/entity-attachments';
import ProjectActivity from '@/components/common/projects/details/project-activity';
import { ProjectSidePanel } from '@/components/common/projects/details/project-side-panel';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type {
   ProjectUpdateDto,
   ProjectUpdateHealth,
   ProjectUpdateKind,
} from '@/lib/project-updates/contracts';
import { getProjectDetail } from '@/mock-data/project-details';
import { useIssuesStore } from '@/store/issues-store';
import { useProjectsStore } from '@/store/projects-store';
import { Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

const HEALTH_LABEL: Record<ProjectUpdateHealth, string> = {
   'on-track': 'On track',
   'at-risk': 'At risk',
   'off-track': 'Off track',
};

function formatDate(value: string) {
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
   }).format(date);
}

function PersistentProjectActivity({ projectId }: { projectId: string }) {
   const workspace = useWorkspace();
   const project = useProjectsStore((state) => state.projects.find((item) => item.id === projectId));
   const projectLoading = useProjectsStore((state) => state.loading);
   const allIssues = useIssuesStore((state) => state.issues);
   const issues = useMemo(
      () => allIssues.filter((issue) => issue.project?.id === projectId),
      [allIssues, projectId]
   );
   const [updates, setUpdates] = useState<ProjectUpdateDto[]>([]);
   const [loading, setLoading] = useState(true);
   const [posting, setPosting] = useState(false);
   const [kind, setKind] = useState<ProjectUpdateKind>('update');
   const [health, setHealth] = useState<ProjectUpdateHealth>('on-track');
   const [body, setBody] = useState('');
   const canWrite = workspace.user.role !== 'guest';
   const endpoint = `/api/projects/${encodeURIComponent(projectId)}/updates?organization=${encodeURIComponent(workspace.organization.slug)}`;

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      void fetch(endpoint, {
         cache: 'no-store',
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Unable to load project activity (${response.status}).`);
            return (await response.json()) as { updates: ProjectUpdateDto[] };
         })
         .then((payload) => {
            if (!controller.signal.aborted) setUpdates(payload.updates);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load project activity.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint]);

   async function submit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const nextBody = body.trim();
      if (!canWrite || !nextBody || posting) return;
      setPosting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               kind,
               health: kind === 'update' ? health : null,
               body: nextBody,
            }),
         });
         if (!response.ok) throw new Error(`Unable to post project activity (${response.status}).`);
         const payload = (await response.json()) as { update: ProjectUpdateDto };
         setUpdates((current) => [payload.update, ...current]);
         setBody('');
      } catch {
         toast.error(`Unable to post project ${kind}.`);
      } finally {
         setPosting(false);
      }
   }

   if (!project) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            {projectLoading ? 'Loading project…' : 'Project not found.'}
         </div>
      );
   }

   const detail = getProjectDetail(project.id);
   const agentHref = `/${workspace.organization.slug}/agent`;

   return (
      <div className="flex h-full w-full overflow-hidden">
         <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10">
               {canWrite ? (
                  <form onSubmit={submit} className="rounded-lg border bg-container p-4">
                     <div className="flex flex-wrap gap-2">
                        <select
                           value={kind}
                           onChange={(event) => setKind(event.target.value as ProjectUpdateKind)}
                           className="rounded-md border bg-background px-2 py-1.5 text-sm"
                           aria-label="Activity type"
                        >
                           <option value="update">Update</option>
                           <option value="comment">Comment</option>
                        </select>
                        {kind === 'update' && (
                           <select
                              value={health}
                              onChange={(event) => setHealth(event.target.value as ProjectUpdateHealth)}
                              className="rounded-md border bg-background px-2 py-1.5 text-sm"
                              aria-label="Project health"
                           >
                              {(Object.keys(HEALTH_LABEL) as ProjectUpdateHealth[]).map((value) => (
                                 <option key={value} value={value}>
                                    {HEALTH_LABEL[value]}
                                 </option>
                              ))}
                           </select>
                        )}
                     </div>
                     <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        maxLength={10000}
                        rows={4}
                        placeholder={kind === 'update' ? 'Write a project update…' : 'Leave a project comment…'}
                        className="mt-3 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none"
                     />
                     <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <Link
                           href={agentHref}
                           className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-accent"
                        >
                           <Bot className="size-3.5" />
                           Open Agent
                        </Link>
                        <Button type="submit" size="sm" disabled={!body.trim() || posting}>
                           {posting && <Loader2 className="size-4 animate-spin" />}
                           {posting ? 'Posting…' : `Post ${kind}`}
                        </Button>
                     </div>
                  </form>
               ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                     Guest access is read-only. Existing project updates and attachments remain visible.
                  </div>
               )}

               <div className="mt-5">
                  <EntityAttachments entityType="project" entityId={project.id} />
               </div>

               <div className="mt-8 space-y-3">
                  {loading ? (
                     <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 size-4 animate-spin" /> Loading activity…
                     </div>
                  ) : updates.length === 0 ? (
                     <p className="py-10 text-center text-sm text-muted-foreground">No project activity yet.</p>
                  ) : (
                     updates.map((update) => (
                        <article key={update.id} className="rounded-lg border bg-container p-4">
                           <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{update.author.displayName}</span>
                              <span>·</span>
                              <span>{formatDate(update.createdAt)}</span>
                              <span>·</span>
                              <span className="capitalize">{update.kind}</span>
                              {update.health && (
                                 <span className="rounded-full border px-2 py-0.5">{HEALTH_LABEL[update.health]}</span>
                              )}
                           </div>
                           <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{update.body}</p>
                        </article>
                     ))
                  )}
               </div>
            </div>
         </div>
         <ProjectSidePanel project={project} detail={detail} issues={issues} />
      </div>
   );
}

export default function ProjectActivityRuntime({ projectId }: { projectId: string }) {
   const workspace = useWorkspace();
   return workspace.configured ? (
      <PersistentProjectActivity projectId={projectId} />
   ) : (
      <ProjectActivity projectId={projectId} />
   );
}
