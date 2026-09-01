'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { ProjectLabelDto } from '@/lib/project-labels/contracts';
import type { LabelInterface } from '@/mock-data/labels';

interface ProjectLabelsProps {
   projectId: string;
   demoLabels: LabelInterface[];
}

export function ProjectLabels({ projectId, demoLabels }: ProjectLabelsProps) {
   const workspace = useWorkspace();
   const [labels, setLabels] = useState<ProjectLabelDto[]>([]);
   const [assignedIds, setAssignedIds] = useState<string[]>([]);
   const [selectedId, setSelectedId] = useState('');
   const [loading, setLoading] = useState(workspace.configured);
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.configured && workspace.user.role !== 'guest';

   const endpoint = useMemo(
      () =>
         `/api/projects/${encodeURIComponent(projectId)}/labels?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [projectId, workspace.organization.slug]
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
            if (!response.ok) throw new Error(`Project labels load failed with ${response.status}.`);
            return (await response.json()) as {
               labels: ProjectLabelDto[];
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
            toast.error('Unable to load project labels.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const assignedLabels = workspace.configured
      ? labels.filter((label) => assignedIds.includes(label.id))
      : demoLabels;
   const availableLabels = labels.filter((label) => !assignedIds.includes(label.id));

   const addLabel = async () => {
      if (!canWrite || !selectedId || submitting) return;
      setSubmitting(true);
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ labelId: selectedId }),
         });
         if (!response.ok) throw new Error(`Project label assignment failed with ${response.status}.`);
         setAssignedIds((current) => (current.includes(selectedId) ? current : [...current, selectedId]));
         setSelectedId('');
      } catch {
         toast.error('Unable to add project label.');
      } finally {
         setSubmitting(false);
      }
   };

   const removeLabel = async (label: ProjectLabelDto) => {
      if (!canWrite || submitting) return;
      const previous = assignedIds;
      setAssignedIds((current) => current.filter((id) => id !== label.id));
      setSubmitting(true);
      try {
         const response = await fetch(
            `/api/projects/${encodeURIComponent(projectId)}/labels/${encodeURIComponent(label.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(`Project label removal failed with ${response.status}.`);
      } catch {
         setAssignedIds(previous);
         toast.error('Unable to remove project label.');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="flex items-start gap-3">
         <span className="w-24 shrink-0 pt-0.5 text-muted-foreground">Labels</span>
         <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
               {loading ? (
                  <span className="text-xs text-muted-foreground">Loading labels…</span>
               ) : (
                  assignedLabels.map((label) => (
                     <span
                        key={label.id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                     >
                        <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.name}
                        {canWrite && workspace.configured && (
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
               {!loading && assignedLabels.length === 0 && !canWrite && (
                  <span className="text-xs text-muted-foreground">No labels yet.</span>
               )}
            </div>

            {canWrite && (
               <div className="mt-2 flex max-w-sm items-center gap-2">
                  <select
                     value={selectedId}
                     onChange={(event) => setSelectedId(event.target.value)}
                     className="border-input bg-background h-8 min-w-0 flex-1 rounded-md border px-2 text-xs"
                     aria-label="Choose project label"
                     disabled={submitting || availableLabels.length === 0}
                  >
                     <option value="">
                        {availableLabels.length === 0 ? 'All labels assigned' : 'Choose label…'}
                     </option>
                     {availableLabels.map((label) => (
                        <option key={label.id} value={label.id}>
                           {label.name}
                        </option>
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
      </div>
   );
}
