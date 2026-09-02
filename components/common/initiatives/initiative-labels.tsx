'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { InitiativeLabelDto } from '@/lib/initiative-labels/contracts';

export function InitiativeLabels({ initiativeId }: { initiativeId: string }) {
   const workspace = useWorkspace();
   const [labels, setLabels] = useState<InitiativeLabelDto[]>([]);
   const [assignedIds, setAssignedIds] = useState<string[]>([]);
   const [selectedId, setSelectedId] = useState('');
   const [loading, setLoading] = useState(true);
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.user.role !== 'guest';

   const endpoint = useMemo(
      () =>
         `/api/initiatives/${encodeURIComponent(initiativeId)}/labels?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [initiativeId, workspace.organization.slug]
   );

   useEffect(() => {
      const controller = new AbortController();
      setLoading(true);
      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Initiative labels load failed with ${response.status}.`);
            return (await response.json()) as {
               labels: InitiativeLabelDto[];
               assignedLabelIds: string[];
            };
         })
         .then(({ labels: loadedLabels, assignedLabelIds }) => {
            if (controller.signal.aborted) return;
            setLabels(loadedLabels);
            setAssignedIds(assignedLabelIds);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load initiative labels.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint]);

   const assignedLabels = labels.filter((label) => assignedIds.includes(label.id));
   const availableLabels = labels.filter((label) => !assignedIds.includes(label.id));

   const addLabel = async () => {
      if (!canWrite || !selectedId || submitting) return;
      const labelId = selectedId;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ labelId }),
         });
         if (!response.ok) throw new Error(`Initiative label assignment failed with ${response.status}.`);
         setAssignedIds((current) => (current.includes(labelId) ? current : [...current, labelId]));
         setSelectedId('');
      } catch {
         toast.error('Unable to add initiative label.');
      } finally {
         setSubmitting(false);
      }
   };

   const removeLabel = async (label: InitiativeLabelDto) => {
      if (!canWrite || submitting) return;
      const previous = assignedIds;
      setAssignedIds((current) => current.filter((id) => id !== label.id));
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/initiatives/${encodeURIComponent(initiativeId)}/labels/${encodeURIComponent(label.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(`Initiative label removal failed with ${response.status}.`);
      } catch {
         setAssignedIds(previous);
         toast.error('Unable to remove initiative label.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="rounded-xl border bg-card px-4 py-4">
         <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
               <h2 className="text-sm font-medium">Labels</h2>
               <p className="mt-1 text-xs text-muted-foreground">Organize this initiative with workspace labels.</p>
            </div>
            {canWrite && (
               <div className="flex min-w-64 items-center gap-2">
                  <select
                     value={selectedId}
                     onChange={(event) => setSelectedId(event.target.value)}
                     className="border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs"
                     aria-label="Choose initiative label"
                     disabled={submitting || loading || availableLabels.length === 0}
                  >
                     <option value="">
                        {availableLabels.length === 0 ? 'All labels assigned' : 'Choose label…'}
                     </option>
                     {availableLabels.map((label) => (
                        <option key={label.id} value={label.id}>{label.name}</option>
                     ))}
                  </select>
                  <Button
                     type="button"
                     size="sm"
                     variant="outline"
                     onClick={() => void addLabel()}
                     disabled={!selectedId || submitting}
                     className="h-8 gap-1"
                  >
                     <Plus className="size-3.5" /> Add
                  </Button>
               </div>
            )}
         </div>

         <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {loading ? (
               <span className="text-xs text-muted-foreground">Loading labels…</span>
            ) : assignedLabels.length === 0 ? (
               <span className="text-xs text-muted-foreground">No labels assigned.</span>
            ) : (
               assignedLabels.map((label) => (
                  <span key={label.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                     <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                     {label.name}
                     {canWrite && (
                        <button
                           type="button"
                           onClick={() => void removeLabel(label)}
                           className="ml-0.5 text-muted-foreground hover:text-destructive"
                           aria-label={`Remove ${label.name}`}
                           disabled={submitting}
                        >
                           <X className="size-3" />
                        </button>
                     )}
                  </span>
               ))
            )}
         </div>
      </div>
   );
}
