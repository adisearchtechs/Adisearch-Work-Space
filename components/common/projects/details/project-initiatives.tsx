'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { InitiativeDto } from '@/lib/initiatives/contracts';

interface ProjectInitiativesProps {
   projectId: string;
   demoInitiative?: string;
}

export function ProjectInitiatives({ projectId, demoInitiative }: ProjectInitiativesProps) {
   const workspace = useWorkspace();
   const [initiatives, setInitiatives] = useState<InitiativeDto[]>([]);
   const [selectedId, setSelectedId] = useState('');
   const [loading, setLoading] = useState(workspace.configured);
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.configured && workspace.user.role !== 'guest';

   const endpoint = useMemo(
      () => `/api/initiatives?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );

   useEffect(() => {
      if (!workspace.configured) return;
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
            toast.error('Unable to load project initiatives.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   if (!workspace.configured) {
      if (!demoInitiative) return null;
      return (
         <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-muted-foreground">Initiatives</span>
            <span className="inline-flex items-center gap-1.5">📄 {demoInitiative}</span>
         </div>
      );
   }

   const assigned = initiatives.filter((initiative) => initiative.projectIds.includes(projectId));
   const available = initiatives.filter((initiative) => !initiative.projectIds.includes(projectId));

   const addInitiative = async () => {
      if (!canWrite || !selectedId || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/initiatives/${encodeURIComponent(selectedId)}/projects?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ projectId }),
            }
         );
         if (!response.ok) throw new Error(`Initiative assignment failed with ${response.status}.`);
         setInitiatives((current) =>
            current.map((initiative) =>
               initiative.id === selectedId && !initiative.projectIds.includes(projectId)
                  ? { ...initiative, projectIds: [...initiative.projectIds, projectId] }
                  : initiative
            )
         );
         setSelectedId('');
      } catch {
         toast.error('Unable to add project to initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   const removeInitiative = async (initiative: InitiativeDto) => {
      if (!canWrite || submitting) return;
      const previous = initiatives;
      setInitiatives((current) =>
         current.map((item) =>
            item.id === initiative.id
               ? { ...item, projectIds: item.projectIds.filter((id) => id !== projectId) }
               : item
         )
      );
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/initiatives/${encodeURIComponent(initiative.id)}/projects/${encodeURIComponent(projectId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(`Initiative removal failed with ${response.status}.`);
      } catch {
         setInitiatives(previous);
         toast.error('Unable to remove project from initiative.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="flex items-start gap-3">
         <span className="w-24 shrink-0 pt-0.5 text-muted-foreground">Initiatives</span>
         <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
               {loading ? (
                  <span className="text-xs text-muted-foreground">Loading initiatives…</span>
               ) : (
                  assigned.map((initiative) => (
                     <span
                        key={initiative.id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                     >
                        <span aria-hidden>{initiative.icon}</span>
                        <Link
                           href={`/${workspace.organization.slug}/initiative/${initiative.id}`}
                           className="hover:underline"
                        >
                           {initiative.name}
                        </Link>
                        {canWrite && (
                           <button
                              type="button"
                              onClick={() => void removeInitiative(initiative)}
                              className="ml-0.5 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${initiative.name}`}
                              disabled={submitting}
                           >
                              <X className="size-3" />
                           </button>
                        )}
                     </span>
                  ))
               )}
               {!loading && assigned.length === 0 && !canWrite && (
                  <span className="text-xs text-muted-foreground">No initiatives yet.</span>
               )}
            </div>

            {canWrite && (
               <div className="mt-2 flex max-w-sm items-center gap-2">
                  <select
                     value={selectedId}
                     onChange={(event) => setSelectedId(event.target.value)}
                     className="border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs"
                     aria-label="Choose initiative"
                     disabled={submitting || available.length === 0}
                  >
                     <option value="">
                        {available.length === 0 ? 'All initiatives assigned' : 'Choose initiative…'}
                     </option>
                     {available.map((initiative) => (
                        <option key={initiative.id} value={initiative.id}>
                           {initiative.icon} {initiative.name}
                        </option>
                     ))}
                  </select>
                  <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     onClick={() => void addInitiative()}
                     disabled={!selectedId || submitting}
                     className="h-8 gap-1"
                  >
                     <Plus className="size-3.5" /> Add
                  </Button>
               </div>
            )}
         </div>
      </div>
   );
}
