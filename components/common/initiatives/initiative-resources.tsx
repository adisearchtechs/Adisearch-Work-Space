'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InitiativeResourceDto } from '@/lib/initiative-resources/contracts';

export function InitiativeResources({ initiativeId }: { initiativeId: string }) {
   const workspace = useWorkspace();
   const [resources, setResources] = useState<InitiativeResourceDto[]>([]);
   const [loading, setLoading] = useState(true);
   const [formOpen, setFormOpen] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [label, setLabel] = useState('');
   const [url, setUrl] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.user.role !== 'guest';

   const collectionEndpoint = useMemo(
      () =>
         `/api/initiatives/${encodeURIComponent(initiativeId)}/resources?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [initiativeId, workspace.organization.slug]
   );

   const resourceEndpoint = (resourceId: string) =>
      `/api/initiatives/${encodeURIComponent(initiativeId)}/resources/${encodeURIComponent(resourceId)}?organization=${encodeURIComponent(workspace.organization.slug)}`;

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      setLoading(true);
      void fetch(collectionEndpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Resource load failed with ${response.status}.`);
            return (await response.json()) as { resources: InitiativeResourceDto[] };
         })
         .then(({ resources: loadedResources }) => {
            if (!controller.signal.aborted) setResources(loadedResources);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load initiative resources.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [collectionEndpoint, workspace.configured]);

   const closeForm = () => {
      setFormOpen(false);
      setEditingId(null);
      setLabel('');
      setUrl('');
   };

   const beginCreate = () => {
      setEditingId(null);
      setLabel('');
      setUrl('');
      setFormOpen(true);
   };

   const beginEdit = (resource: InitiativeResourceDto) => {
      setEditingId(resource.id);
      setLabel(resource.label);
      setUrl(resource.url);
      setFormOpen(true);
   };

   const saveResource = async () => {
      if (!canWrite || submitting) return;
      const nextLabel = label.trim();
      const nextUrl = url.trim();
      if (!nextLabel || !nextUrl) {
         toast.error('Resource label and URL are required.');
         return;
      }

      setSubmitting(true);
      try {
         const response = await fetch(
            editingId ? resourceEndpoint(editingId) : collectionEndpoint,
            {
               method: editingId ? 'PATCH' : 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ label: nextLabel, url: nextUrl }),
            }
         );
         if (!response.ok) throw new Error(`Resource save failed with ${response.status}.`);
         const { resource } = (await response.json()) as { resource: InitiativeResourceDto };
         setResources((current) =>
            editingId
               ? current.map((item) => (item.id === resource.id ? resource : item))
               : [...current, resource].sort((a, b) => a.position - b.position)
         );
         closeForm();
      } catch {
         toast.error('Unable to save initiative resource.');
      } finally {
         setSubmitting(false);
      }
   };

   const deleteResource = async (resource: InitiativeResourceDto) => {
      if (!canWrite || !window.confirm(`Delete resource “${resource.label}”?`)) return;
      const previous = resources;
      setResources((current) => current.filter((item) => item.id !== resource.id));
      try {
         const response = await fetch(resourceEndpoint(resource.id), {
            method: 'DELETE',
            credentials: 'same-origin',
         });
         if (!response.ok) throw new Error(`Resource delete failed with ${response.status}.`);
      } catch {
         setResources(previous);
         toast.error('Unable to delete initiative resource.');
      }
   };

   if (!workspace.configured) return null;

   return (
      <section className="rounded-xl border bg-card">
         <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
               <h2 className="text-sm font-medium">Resources</h2>
               <p className="mt-0.5 text-xs text-muted-foreground">
                  Keep briefs, plans, dashboards and reference links with this initiative.
               </p>
            </div>
            {canWrite && (
               <Button size="sm" variant="outline" className="gap-1.5" onClick={beginCreate}>
                  <Plus className="size-3.5" /> Add resource
               </Button>
            )}
         </div>

         {formOpen && canWrite && (
            <div className="grid gap-2 border-b bg-muted/20 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-end">
               <label className="grid gap-1 text-xs font-medium">
                  Label
                  <Input
                     value={label}
                     onChange={(event) => setLabel(event.target.value)}
                     maxLength={120}
                     placeholder="Product brief"
                     autoFocus
                  />
               </label>
               <label className="grid gap-1 text-xs font-medium">
                  URL
                  <Input
                     type="url"
                     value={url}
                     onChange={(event) => setUrl(event.target.value)}
                     maxLength={2048}
                     placeholder="https://…"
                  />
               </label>
               <div className="flex gap-2">
                  <Button size="sm" onClick={() => void saveResource()} disabled={submitting}>
                     {submitting ? 'Saving…' : editingId ? 'Save' : 'Add'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={closeForm} disabled={submitting}>
                     Cancel
                  </Button>
               </div>
            </div>
         )}

         {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground" role="status">
               Loading initiative resources…
            </p>
         ) : resources.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-9 text-center">
               <Link2 className="size-5 text-muted-foreground" />
               <p className="mt-2 text-sm font-medium">No resources yet</p>
               <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {canWrite
                     ? 'Add the first link the team should keep close to this initiative.'
                     : 'No shared resources have been added to this initiative.'}
               </p>
            </div>
         ) : (
            <div>
               {resources.map((resource) => (
                  <div
                     key={resource.id}
                     className="group flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                  >
                     <Link2 className="size-4 shrink-0 text-muted-foreground" />
                     <a
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="min-w-0 flex-1"
                     >
                        <div className="flex items-center gap-1.5 text-sm font-medium hover:underline">
                           <span className="truncate">{resource.label}</span>
                           <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{resource.url}</p>
                     </a>
                     {canWrite && (
                        <div className="flex items-center gap-1">
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground"
                              onClick={() => beginEdit(resource)}
                              aria-label={`Edit ${resource.label}`}
                           >
                              <Pencil className="size-3.5" />
                           </Button>
                           <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-destructive"
                              onClick={() => void deleteResource(resource)}
                              aria-label={`Delete ${resource.label}`}
                           >
                              <Trash2 className="size-3.5" />
                           </Button>
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}
      </section>
   );
}
