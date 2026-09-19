'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
   WORKSPACE_STATUS_CATEGORIES,
   type WorkspaceStatusCategory,
   type WorkspaceStatusDto,
} from '@/lib/workspace-statuses/contracts';
import { status as demoStatuses } from '@/mock-data/status';
import { SettingsShell } from './shared';

const DEFAULT_COLOR = '#64748B';
const DEFAULT_CATEGORY: WorkspaceStatusCategory = 'unstarted';

const CATEGORY_LABELS: Record<WorkspaceStatusCategory, string> = {
   triage: 'Triage',
   backlog: 'Backlog',
   unstarted: 'Unstarted',
   started: 'Started',
   completed: 'Completed',
   canceled: 'Canceled',
};

async function errorMessage(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

const DEMO_ROWS: WorkspaceStatusDto[] = demoStatuses.map((item, index) => ({
   id: item.id,
   name: item.name,
   slug: item.id,
   color: item.color.toUpperCase(),
   category: item.category,
   position: (index + 1) * 10,
}));

export default function ProjectStatusesSettings() {
   const workspace = useWorkspace();
   const [statuses, setStatuses] = useState<WorkspaceStatusDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [loadError, setLoadError] = useState(false);
   const [showCreate, setShowCreate] = useState(false);
   const [name, setName] = useState('');
   const [color, setColor] = useState(DEFAULT_COLOR);
   const [category, setCategory] = useState<WorkspaceStatusCategory>(DEFAULT_CATEGORY);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [editName, setEditName] = useState('');
   const [editColor, setEditColor] = useState(DEFAULT_COLOR);
   const [editCategory, setEditCategory] = useState<WorkspaceStatusCategory>(DEFAULT_CATEGORY);
   const [submittingId, setSubmittingId] = useState<string | null>(null);

   const canAdmin =
      workspace.configured &&
      (workspace.user.role === 'owner' || workspace.user.role === 'admin');
   const endpoint = useMemo(
      () => `/api/statuses?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );

   const loadStatuses = async (signal?: AbortSignal) => {
      if (!workspace.configured) return;
      setLoading(true);
      setLoadError(false);
      try {
         const response = await fetch(endpoint, {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
            signal,
         });
         if (!response.ok) {
            throw new Error(await errorMessage(response, 'Unable to load workspace statuses.'));
         }
         const result = (await response.json()) as { statuses: WorkspaceStatusDto[] };
         if (!signal?.aborted) setStatuses(result.statuses);
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError') return;
         setLoadError(true);
         toast.error(error instanceof Error ? error.message : 'Unable to load workspace statuses.');
      } finally {
         if (!signal?.aborted) setLoading(false);
      }
   };

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      void loadStatuses(controller.signal);
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const rows = workspace.configured ? statuses : DEMO_ROWS;

   const resetCreate = () => {
      setShowCreate(false);
      setName('');
      setColor(DEFAULT_COLOR);
      setCategory(DEFAULT_CATEGORY);
   };

   const createStatus = async () => {
      if (!canAdmin || submittingId || !name.trim()) return;
      setSubmittingId('create');
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: name.trim(), color, category }),
         });
         if (!response.ok) {
            throw new Error(await errorMessage(response, 'Unable to create workspace status.'));
         }
         const result = (await response.json()) as { status: WorkspaceStatusDto };
         setStatuses((current) => [...current, result.status].sort((a, b) => a.position - b.position));
         resetCreate();
         toast.success('Workspace status created.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to create workspace status.');
      } finally {
         setSubmittingId(null);
      }
   };

   const beginEdit = (status: WorkspaceStatusDto) => {
      setEditingId(status.id);
      setEditName(status.name);
      setEditColor(status.color);
      setEditCategory(status.category);
   };

   const saveStatus = async (status: WorkspaceStatusDto) => {
      if (!canAdmin || submittingId || !editName.trim()) return;
      setSubmittingId(status.id);
      try {
         const response = await fetch(
            `/api/statuses/${encodeURIComponent(status.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({
                  name: editName.trim(),
                  color: editColor,
                  category: editCategory,
               }),
            }
         );
         if (!response.ok) {
            throw new Error(await errorMessage(response, 'Unable to update workspace status.'));
         }
         const result = (await response.json()) as { status: WorkspaceStatusDto };
         setStatuses((current) =>
            current.map((item) => (item.id === status.id ? result.status : item))
         );
         setEditingId(null);
         toast.success('Workspace status updated.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update workspace status.');
      } finally {
         setSubmittingId(null);
      }
   };

   const deleteStatus = async (status: WorkspaceStatusDto) => {
      if (!canAdmin || submittingId) return;
      if (
         !window.confirm(
            `Delete workspace status “${status.name}”? Statuses assigned to issues cannot be deleted.`
         )
      ) {
         return;
      }

      setSubmittingId(status.id);
      try {
         const response = await fetch(
            `/api/statuses/${encodeURIComponent(status.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) {
            throw new Error(await errorMessage(response, 'Unable to delete workspace status.'));
         }
         setStatuses((current) => current.filter((item) => item.id !== status.id));
         toast.success('Workspace status deleted.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete workspace status.');
      } finally {
         setSubmittingId(null);
      }
   };

   const moveStatus = async (statusId: string, direction: -1 | 1) => {
      if (!canAdmin || submittingId) return;
      const index = statuses.findIndex((status) => status.id === statusId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= statuses.length) return;

      const ordered = [...statuses];
      [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
      setSubmittingId('reorder');
      try {
         const response = await fetch(endpoint, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ orderedStatusIds: ordered.map((status) => status.id) }),
         });
         if (!response.ok) {
            throw new Error(await errorMessage(response, 'Unable to reorder workspace statuses.'));
         }
         const result = (await response.json()) as { statuses: WorkspaceStatusDto[] };
         setStatuses(result.statuses);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to reorder workspace statuses.');
      } finally {
         setSubmittingId(null);
      }
   };

   return (
      <SettingsShell
         title="Project statuses"
         description="Manage the persisted workflow catalog used by issues and milestone planning."
      >
         <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <p className="max-w-2xl text-sm text-muted-foreground">
                  Status names, categories, colors, and ordering are shared across this workspace.
               </p>
               {canAdmin ? (
                  <Button
                     size="sm"
                     onClick={() => setShowCreate(true)}
                     disabled={showCreate || submittingId !== null}
                     className="gap-1.5"
                  >
                     <Plus className="size-4" /> New status
                  </Button>
               ) : null}
            </div>

            {!workspace.configured ? (
               <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Demo statuses are read-only. Persistent workflow administration is available only in a configured workspace.
               </div>
            ) : !canAdmin ? (
               <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Only workspace owners and admins can create, edit, reorder, or delete statuses.
               </div>
            ) : null}

            {showCreate && canAdmin ? (
               <div className="rounded-xl border bg-card p-4">
                  <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_11rem_auto] md:items-end">
                     <label className="grid gap-1.5 text-xs font-medium">
                        Color
                        <Input
                           type="color"
                           value={color}
                           onChange={(event) => setColor(event.target.value.toUpperCase())}
                           className="h-9 w-14 p-1"
                           aria-label="New status color"
                        />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Name
                        <Input
                           value={name}
                           onChange={(event) => setName(event.target.value)}
                           maxLength={60}
                           placeholder="e.g. Ready for QA"
                           autoFocus
                        />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Category
                        <select
                           value={category}
                           onChange={(event) =>
                              setCategory(event.target.value as WorkspaceStatusCategory)
                           }
                           className="h-9 rounded-md border bg-background px-3 text-sm"
                        >
                           {WORKSPACE_STATUS_CATEGORIES.map((value) => (
                              <option key={value} value={value}>
                                 {CATEGORY_LABELS[value]}
                              </option>
                           ))}
                        </select>
                     </label>
                     <div className="flex gap-2">
                        <Button
                           size="sm"
                           onClick={() => void createStatus()}
                           disabled={!name.trim() || submittingId !== null}
                        >
                           {submittingId === 'create' ? 'Creating…' : 'Create'}
                        </Button>
                        <Button
                           size="sm"
                           variant="outline"
                           onClick={resetCreate}
                           disabled={submittingId !== null}
                        >
                           Cancel
                        </Button>
                     </div>
                  </div>
               </div>
            ) : null}

            {loadError && workspace.configured ? (
               <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  <p>Workspace statuses could not be loaded. No demo workflow has been substituted.</p>
                  <Button
                     size="sm"
                     variant="outline"
                     className="mt-3"
                     onClick={() => void loadStatuses()}
                     disabled={loading}
                  >
                     {loading ? 'Retrying…' : 'Retry'}
                  </Button>
               </div>
            ) : (
               <div className="overflow-hidden rounded-xl border bg-card">
                  <div className="grid grid-cols-[minmax(0,1fr)_9rem_7rem] items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_10rem_8rem_8rem]">
                     <span>Status</span>
                     <span>Category</span>
                     <span className="hidden sm:block">Slug</span>
                     <span className="text-right">Order</span>
                  </div>

                  {loading && workspace.configured ? (
                     <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">
                        Loading workspace statuses…
                     </p>
                  ) : rows.length === 0 ? (
                     <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No workspace statuses are configured.
                     </p>
                  ) : (
                     rows.map((status, index) => {
                        const editing = editingId === status.id;
                        const pending = submittingId === status.id;
                        return (
                           <div
                              key={status.id}
                              className="grid grid-cols-[minmax(0,1fr)_9rem_7rem] items-center gap-3 border-b px-4 py-3 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_8rem]"
                           >
                              <div className="min-w-0">
                                 {editing && canAdmin ? (
                                    <div className="flex min-w-0 items-center gap-2">
                                       <Input
                                          type="color"
                                          value={editColor}
                                          onChange={(event) =>
                                             setEditColor(event.target.value.toUpperCase())
                                          }
                                          className="h-8 w-12 shrink-0 p-1"
                                          aria-label={`Color for ${status.name}`}
                                       />
                                       <Input
                                          value={editName}
                                          onChange={(event) => setEditName(event.target.value)}
                                          maxLength={60}
                                          className="h-8 min-w-0"
                                          aria-label={`Name for ${status.name}`}
                                       />
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 shrink-0"
                                          onClick={() => void saveStatus(status)}
                                          disabled={pending || !editName.trim()}
                                          aria-label={`Save ${status.name}`}
                                       >
                                          <Check className="size-4" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 shrink-0"
                                          onClick={() => setEditingId(null)}
                                          disabled={pending}
                                          aria-label="Cancel status edit"
                                       >
                                          <X className="size-4" />
                                       </Button>
                                    </div>
                                 ) : (
                                    <div className="flex min-w-0 items-center gap-2.5">
                                       <span
                                          className="size-2.5 shrink-0 rounded-full"
                                          style={{ backgroundColor: status.color }}
                                       />
                                       <span className="truncate font-medium">{status.name}</span>
                                       {canAdmin ? (
                                          <div className="ml-auto flex shrink-0 items-center opacity-70 hover:opacity-100">
                                             <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-7"
                                                onClick={() => beginEdit(status)}
                                                disabled={submittingId !== null}
                                                aria-label={`Edit ${status.name}`}
                                             >
                                                <Pencil className="size-3.5" />
                                             </Button>
                                             <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => void deleteStatus(status)}
                                                disabled={submittingId !== null}
                                                aria-label={`Delete ${status.name}`}
                                             >
                                                <Trash2 className="size-3.5" />
                                             </Button>
                                          </div>
                                       ) : null}
                                    </div>
                                 )}
                              </div>

                              {editing && canAdmin ? (
                                 <select
                                    value={editCategory}
                                    onChange={(event) =>
                                       setEditCategory(event.target.value as WorkspaceStatusCategory)
                                    }
                                    className="h-8 rounded-md border bg-background px-2 text-xs"
                                    aria-label={`Category for ${status.name}`}
                                 >
                                    {WORKSPACE_STATUS_CATEGORIES.map((value) => (
                                       <option key={value} value={value}>
                                          {CATEGORY_LABELS[value]}
                                       </option>
                                    ))}
                                 </select>
                              ) : (
                                 <span className="text-xs text-muted-foreground">
                                    {CATEGORY_LABELS[status.category]}
                                 </span>
                              )}

                              <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:block">
                                 {status.slug}
                              </span>

                              <div className="flex justify-end gap-1">
                                 {canAdmin ? (
                                    <>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7"
                                          onClick={() => void moveStatus(status.id, -1)}
                                          disabled={submittingId !== null || index === 0}
                                          aria-label={`Move ${status.name} up`}
                                       >
                                          <ArrowUp className="size-3.5" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-7"
                                          onClick={() => void moveStatus(status.id, 1)}
                                          disabled={submittingId !== null || index === rows.length - 1}
                                          aria-label={`Move ${status.name} down`}
                                       >
                                          <ArrowDown className="size-3.5" />
                                       </Button>
                                    </>
                                 ) : (
                                    <span className="text-xs tabular-nums text-muted-foreground">
                                       {status.position}
                                    </span>
                                 )}
                              </div>
                           </div>
                        );
                     })
                  )}
               </div>
            )}

            <p className="text-xs text-muted-foreground">
               Status slugs are generated when a status is created and remain stable when its display name changes. Deleting a status is blocked while issues still reference it.
            </p>
         </div>
      </SettingsShell>
   );
}
