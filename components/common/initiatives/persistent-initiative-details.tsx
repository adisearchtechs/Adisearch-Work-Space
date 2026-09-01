'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { CalendarRange, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InitiativeDto, InitiativeStatus } from '@/lib/initiatives/contracts';
import { useProjectsStore } from '@/store/projects-store';
import { InitiativeActivity } from './initiative-activity';
import { InitiativeLabels } from './initiative-labels';
import { InitiativeResources } from './initiative-resources';

const TABS = ['overview', 'activity', 'projects'] as const;

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

export function PersistentInitiativeDetails({ initiativeId }: { initiativeId: string }) {
   const workspace = useWorkspace();
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const [tab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('overview'));
   const projects = useProjectsStore((state) => state.projects);
   const projectWorkspaceSlug = useProjectsStore((state) => state.workspaceSlug);
   const [initiative, setInitiative] = useState<InitiativeDto | null>(null);
   const [loading, setLoading] = useState(true);
   const [editing, setEditing] = useState(false);
   const [description, setDescription] = useState('');
   const [status, setStatus] = useState<InitiativeStatus>('planned');
   const [target, setTarget] = useState('');
   const [selectedProjectId, setSelectedProjectId] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.user.role !== 'guest';
   const endpoint = `/api/initiatives/${encodeURIComponent(initiativeId)}?organization=${encodeURIComponent(workspace.organization.slug)}`;

   const refresh = async (signal?: AbortSignal) => {
      const response = await fetch(endpoint, {
         credentials: 'same-origin',
         signal,
         headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`Initiative load failed with ${response.status}.`);
      const { initiative: loaded } = (await response.json()) as { initiative: InitiativeDto };
      setInitiative(loaded);
      setDescription(loaded.description);
      setStatus(loaded.status);
      setTarget(loaded.target ?? '');
   };

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      void refresh(controller.signal)
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load initiative.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
      // endpoint is derived from stable route/workspace identifiers.
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [endpoint]);

   const workspaceProjects = projectWorkspaceSlug === workspace.organization.slug ? projects : [];
   const assignedProjects = useMemo(
      () => workspaceProjects.filter((project) => initiative?.projectIds.includes(project.id)),
      [initiative?.projectIds, workspaceProjects]
   );
   const availableProjects = useMemo(
      () => workspaceProjects.filter((project) => !initiative?.projectIds.includes(project.id)),
      [initiative?.projectIds, workspaceProjects]
   );

   if (loading) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading initiative…</div>;
   }
   if (!initiative) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Initiative not found.</div>;
   }

   const save = async () => {
      if (!canWrite || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               description: description.trim(),
               status,
               target: target.trim() || null,
            }),
         });
         if (!response.ok) throw new Error(`Initiative update failed with ${response.status}.`);
         const { initiative: saved } = (await response.json()) as { initiative: InitiativeDto };
         setInitiative(saved);
         setEditing(false);
      } catch {
         toast.error('Unable to update initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   const assignProject = async () => {
      if (!canWrite || !selectedProjectId || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/initiatives/${encodeURIComponent(initiative.id)}/projects?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ projectId: selectedProjectId }),
            }
         );
         if (!response.ok) throw new Error(`Project assignment failed with ${response.status}.`);
         setInitiative((current) =>
            current
               ? { ...current, projectIds: [...new Set([...current.projectIds, selectedProjectId])] }
               : current
         );
         setSelectedProjectId('');
      } catch {
         toast.error('Unable to add project to initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   const removeProject = async (projectId: string) => {
      if (!canWrite || submitting) return;
      const previous = initiative.projectIds;
      setInitiative({ ...initiative, projectIds: previous.filter((id) => id !== projectId) });
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/initiatives/${encodeURIComponent(initiative.id)}/projects/${encodeURIComponent(projectId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(`Project removal failed with ${response.status}.`);
      } catch {
         setInitiative((current) => (current ? { ...current, projectIds: previous } : current));
         toast.error('Unable to remove project from initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   const deleteInitiative = async () => {
      if (!canWrite || submitting || !window.confirm(`Delete initiative “${initiative.name}”?`)) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, { method: 'DELETE', credentials: 'same-origin' });
         if (!response.ok) throw new Error(`Initiative delete failed with ${response.status}.`);
         router.push(`/${orgId}/initiatives`);
      } catch {
         toast.error('Unable to delete initiative.');
         setSubmitting(false);
      }
   };

   if (tab === 'activity') {
      return <InitiativeActivity initiative={initiative} />;
   }

   if (tab === 'projects') {
      return (
         <div className="mx-auto w-full max-w-4xl px-8 py-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div><h1 className="text-xl font-semibold">Projects</h1><p className="mt-1 text-sm text-muted-foreground">Projects contributing to {initiative.name}.</p></div>
               {canWrite && (
                  <div className="flex items-center gap-2">
                     <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="border-input bg-background h-9 max-w-64 rounded-md border px-2 text-sm" disabled={submitting || availableProjects.length === 0}>
                        <option value="">{availableProjects.length === 0 ? 'All projects assigned' : 'Choose project…'}</option>
                        {availableProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                     </select>
                     <Button onClick={() => void assignProject()} disabled={!selectedProjectId || submitting} className="gap-1"><Plus className="size-4" /> Add</Button>
                  </div>
               )}
            </div>
            <div className="mt-6 overflow-hidden rounded-xl border bg-card">
               {assignedProjects.length === 0 ? (
                  <p className="px-6 py-12 text-center text-sm text-muted-foreground">No projects assigned yet.</p>
               ) : assignedProjects.map((project) => (
                  <div key={project.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
                     <project.icon className="size-4 text-muted-foreground" />
                     <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{project.status.name} · {project.targetDate ?? 'No target date'}</p></div>
                     {canWrite && <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void removeProject(project.id)} disabled={submitting} aria-label={`Remove ${project.name}`}><Trash2 className="size-4" /></Button>}
                  </div>
               ))}
            </div>
         </div>
      );
   }

   return (
      <div className="h-full w-full overflow-y-auto">
         <div className="mx-auto flex max-w-4xl flex-col gap-6 px-8 py-10">
            <div className="flex items-start justify-between gap-4">
               <div className="min-w-0">
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-muted/50 text-2xl">{initiative.icon}</span>
                  <h1 className="mt-4 text-2xl font-semibold">{initiative.name}</h1>
                  {!editing && <p className="mt-2 text-sm leading-6 text-muted-foreground">{initiative.description || 'No description yet.'}</p>}
               </div>
               {canWrite && <div className="flex gap-2"><Button variant="outline" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel' : 'Edit'}</Button><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => void deleteInitiative()} disabled={submitting} aria-label="Delete initiative"><Trash2 className="size-4" /></Button></div>}
            </div>

            {editing && canWrite ? (
               <div className="grid gap-4 rounded-xl border bg-card p-4">
                  <label className="grid gap-1 text-sm font-medium">Description<Input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} /></label>
                  <div className="grid gap-3 sm:grid-cols-2">
                     <label className="grid gap-1 text-sm font-medium">Status<select value={status} onChange={(event) => setStatus(event.target.value as InitiativeStatus)} className="border-input bg-background h-9 rounded-md border px-2 text-sm"><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
                     <label className="grid gap-1 text-sm font-medium">Target<Input value={target} onChange={(event) => setTarget(event.target.value)} maxLength={80} placeholder="Q4 2026" /></label>
                  </div>
                  <div><Button onClick={() => void save()} disabled={submitting}>{submitting ? 'Saving…' : 'Save changes'}</Button></div>
               </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
               <span className="font-medium">{STATUS_LABEL[initiative.status]}</span>
               <span className="text-muted-foreground">Priority: {initiative.priority}</span>
               <span className="text-muted-foreground">Health: {HEALTH_LABEL[initiative.health]}</span>
               {initiative.target && <span className="inline-flex items-center gap-1 text-muted-foreground"><CalendarRange className="size-4" /> {initiative.target}</span>}
               {initiative.owner ? <span className="inline-flex items-center gap-1.5"><Avatar className="size-5"><AvatarImage src={initiative.owner.avatarUrl ?? undefined} alt={initiative.owner.displayName} /><AvatarFallback className="text-[8px]">{initiative.owner.displayName[0]}</AvatarFallback></Avatar>{initiative.owner.displayName}</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><UserRound className="size-4" /> No owner</span>}
            </div>

            <InitiativeLabels initiativeId={initiative.id} />
            <InitiativeResources initiativeId={initiative.id} />

            <div className="rounded-xl border bg-card px-4 py-4">
               <h2 className="text-sm font-medium">Projects</h2>
               <p className="mt-1 text-sm text-muted-foreground">{assignedProjects.length} project{assignedProjects.length === 1 ? '' : 's'} assigned. Use the Projects tab to manage membership.</p>
            </div>
         </div>
      </div>
   );
}
