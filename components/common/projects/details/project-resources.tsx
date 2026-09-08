'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProjectResourceDto } from '@/lib/project-resources/contracts';
import type { ProjectResource } from '@/mock-data/project-details';

interface ProjectResourcesProps {
   projectId: string;
   demoResources: ProjectResource[];
}

export function ProjectResources({ projectId, demoResources }: ProjectResourcesProps) {
   const workspace = useWorkspace();
   const [resources, setResources] = useState<ProjectResourceDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [formOpen, setFormOpen] = useState(false);
   const [label, setLabel] = useState('');
   const [url, setUrl] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const canWrite = workspace.configured && workspace.user.role !== 'guest';
   const organization = encodeURIComponent(workspace.organization.slug);
   const encodedProjectId = encodeURIComponent(projectId);

   const collectionEndpoint = useMemo(
      () => `/api/projects/${encodedProjectId}/resources?organization=${organization}`,
      [encodedProjectId, organization]
   );

   const itemEndpoint = (resourceId: string) =>
      `/api/projects/${encodedProjectId}/resources/${encodeURIComponent(resourceId)}?organization=${organization}`;

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
            return (await response.json()) as { resources: ProjectResourceDto[] };
         })
         .then(({ resources: loadedResources }) => {
            if (!controller.signal.aborted) setResources(loadedResources);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error('Unable to load project resources.');
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

   const beginEdit = (resource: ProjectResourceDto) => {
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
            editingId ? itemEndpoint(editingId) : collectionEndpoint,
            {
               method: editingId ? 'PATCH' : 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ label: nextLabel, url: nextUrl }),
            }
         );
         if (!response.ok) throw new Error(`Resource save failed with ${response.status}.`);
         const { resource } = (await response.json()) as { resource: ProjectResourceDto };
         setResources((current) =>
            editingId
               ? current.map((item) => (item.id === resource.id ? resource : item))
               : [...current, resource].sort((a, b) => a.position - b.position)
         );
         closeForm();
      } catch {
         toast.error('Unable to save project resource.');
      } finally {
         setSubmitting(false);
      }
   };

   const deleteResource = async (resource: ProjectResourceDto) => {
      if (!canWrite || !window.confirm(`Delete resource “${resource.label}”?`)) return;
      const previous = resources;
      setResources((current) => current.filter((item) => item.id !== resource.id));
      try {
         const response = await fetch(itemEndpoint(resource.id), {
            method: 'DELETE',
            credentials: 'same-origin',
         });
         if (!response.ok) throw new Error(`Resource delete failed with ${response.status}.`);
      } catch {
         setResources(previous);
         toast.error('Unable to delete project resource.');
      }
   };

   const visibleResources = workspace.configured
      ? resources
      : demoResources.map((resource, index) => ({
           id: `demo-${index}`,
           projectId,
           label: resource.label,
           url: resource.url,
           position: index,
           createdAt: '',
        }));

   if (!workspace.configured && visibleResources.length === 0) return null;

   return (
      <div className="flex items-start gap-3">
         <span className="w-24 shrink-0 pt-1 text-muted-foreground">Resources</span>
         <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
               {loading ? (
                  <span className="text-xs text-muted-foreground">Loading resources…</span>
               ) : (
                  visibleResources.map((resource) => (
                     <span key={resource.id} className="group inline-flex items-center rounded-md border bg-background">
                        <a
                           href={resource.url}
                           target={workspace.configured ? '_blank' : undefined}
                           rel={workspace.configured ? 'noreferrer noopener' : undefined}
                           className="inline-flex items-center gap-1.5 px-2 py-1 text-xs hover:bg-accent/50"
                        >
                           <FileText className="size-3.5 text-muted-foreground" />
                           <span className="max-w-48 truncate">{resource.label}</span>
                           {workspace.configured && <ExternalLink className="size-3 text-muted-foreground" />}
                        </a>
                        {canWrite && (
                           <span className="flex border-l">
                              <button
                                 type="button"
                                 onClick={() => beginEdit(resource)}
                                 className="p-1 text-muted-foreground hover:text-foreground"
                                 aria-label={`Edit ${resource.label}`}
                              >
                                 <Pencil className="size-3" />
                              </button>
                              <button
                                 type="button"
                                 onClick={() => void deleteResource(resource)}
                                 className="p-1 text-muted-foreground hover:text-destructive"
                                 aria-label={`Delete ${resource.label}`}
                              >
                                 <Trash2 className="size-3" />
                              </button>
                           </span>
                        )}
                     </span>
                  ))
               )}
               {canWrite && (
                  <button
                     type="button"
                     onClick={beginCreate}
                     className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                     <Plus className="size-3.5" /> Add resource
                  </button>
               )}
               {workspace.configured && !loading && visibleResources.length === 0 && !canWrite && (
                  <span className="text-xs text-muted-foreground">No resources yet.</span>
               )}
            </div>

            {formOpen && canWrite && (
               <div className="mt-2 grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] sm:items-end">
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
         </div>
      </div>
   );
}
