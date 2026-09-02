'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceLabelDto } from '@/lib/workspace-labels/contracts';
import { issues } from '@/mock-data/issues';
import { labels as demoLabels } from '@/mock-data/labels';

const DEFAULT_COLOR = '#64748B';

const formatCount = (count: number) =>
   count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);

const errorMessage = async (response: Response, fallback: string) => {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
};

export default function IssueLabelsSettings() {
   const workspace = useWorkspace();
   const [query, setQuery] = useState('');
   const [labels, setLabels] = useState<WorkspaceLabelDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [showCreate, setShowCreate] = useState(false);
   const [name, setName] = useState('');
   const [color, setColor] = useState(DEFAULT_COLOR);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [editName, setEditName] = useState('');
   const [editColor, setEditColor] = useState(DEFAULT_COLOR);
   const [submittingId, setSubmittingId] = useState<string | null>(null);

   const canWrite = workspace.configured && workspace.user.role !== 'guest';
   const endpoint = useMemo(
      () => `/api/labels?organization=${encodeURIComponent(workspace.organization.slug)}`,
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
            if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load workspace labels.'));
            return (await response.json()) as { labels: WorkspaceLabelDto[] };
         })
         .then(({ labels: loaded }) => {
            if (!controller.signal.aborted) setLabels(loaded);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load workspace labels.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const demoRows = useMemo<WorkspaceLabelDto[]>(() => {
      const issueCounts = new Map<string, number>();
      for (const issue of issues) {
         for (const label of issue.labels) {
            issueCounts.set(label.id, (issueCounts.get(label.id) ?? 0) + 1);
         }
      }
      return demoLabels.map((label) => {
         const count = issueCounts.get(label.id) ?? 0;
         return {
            id: label.id,
            name: label.name,
            color: label.color,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            usage: { issues: count, projects: 0, initiatives: 0, total: count },
         };
      });
   }, []);

   const rows = (workspace.configured ? labels : demoRows)
      .filter((label) => label.name.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

   const resetCreate = () => {
      setShowCreate(false);
      setName('');
      setColor(DEFAULT_COLOR);
   };

   const createLabel = async () => {
      if (!canWrite || submittingId || name.trim() === '') return;
      setSubmittingId('create');
      try {
         const response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ name: name.trim(), color }),
         });
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to create workspace label.'));
         const { label } = (await response.json()) as { label: WorkspaceLabelDto };
         setLabels((current) => [...current, label]);
         resetCreate();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to create workspace label.');
      } finally {
         setSubmittingId(null);
      }
   };

   const beginEdit = (label: WorkspaceLabelDto) => {
      setEditingId(label.id);
      setEditName(label.name);
      setEditColor(label.color);
   };

   const saveLabel = async (label: WorkspaceLabelDto) => {
      if (!canWrite || submittingId || editName.trim() === '') return;
      setSubmittingId(label.id);
      try {
         const response = await fetch(
            `/api/labels/${encodeURIComponent(label.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ name: editName.trim(), color: editColor }),
            }
         );
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to update workspace label.'));
         const { label: saved } = (await response.json()) as {
            label: Pick<WorkspaceLabelDto, 'id' | 'name' | 'color' | 'createdAt' | 'updatedAt'>;
         };
         setLabels((current) =>
            current.map((item) => (item.id === label.id ? { ...item, ...saved } : item))
         );
         setEditingId(null);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update workspace label.');
      } finally {
         setSubmittingId(null);
      }
   };

   const deleteLabel = async (label: WorkspaceLabelDto) => {
      if (!canWrite || submittingId) return;
      const usageMessage =
         label.usage.total > 0
            ? ` It will also remove ${label.usage.total} assignment${label.usage.total === 1 ? '' : 's'} across issues, projects, and initiatives.`
            : '';
      if (!window.confirm(`Delete workspace label “${label.name}”?${usageMessage}`)) return;

      setSubmittingId(label.id);
      try {
         const response = await fetch(
            `/api/labels/${encodeURIComponent(label.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to delete workspace label.'));
         setLabels((current) => current.filter((item) => item.id !== label.id));
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete workspace label.');
      } finally {
         setSubmittingId(null);
      }
   };

   return (
      <div className="h-full w-full overflow-y-auto">
         <div className="mx-auto max-w-5xl px-6 py-10 pb-20">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-medium">Workspace labels</h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                     One shared label catalog for issues, projects, and initiatives.
                  </p>
               </div>
               {canWrite && (
                  <Button size="sm" onClick={() => setShowCreate(true)} disabled={showCreate} className="gap-1.5">
                     <Plus className="size-4" /> New label
                  </Button>
               )}
            </div>

            {!workspace.configured && (
               <div className="mb-5 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Demo labels are read-only. Connect the workspace to Supabase to manage the shared catalog.
               </div>
            )}

            {showCreate && canWrite && (
               <div className="mb-5 rounded-xl border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                     <label className="grid gap-1.5 text-xs font-medium">
                        Color
                        <Input
                           type="color"
                           value={color}
                           onChange={(event) => setColor(event.target.value.toUpperCase())}
                           className="h-9 w-14 p-1"
                           aria-label="New label color"
                        />
                     </label>
                     <label className="grid gap-1.5 text-xs font-medium">
                        Name
                        <Input
                           value={name}
                           onChange={(event) => setName(event.target.value)}
                           maxLength={60}
                           placeholder="e.g. Customer request"
                           autoFocus
                        />
                     </label>
                     <div className="flex gap-2">
                        <Button size="sm" onClick={() => void createLabel()} disabled={!name.trim() || submittingId !== null}>
                           {submittingId === 'create' ? 'Creating…' : 'Create'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={resetCreate} disabled={submittingId !== null}>
                           Cancel
                        </Button>
                     </div>
                  </div>
               </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
               <Input
                  placeholder="Filter labels…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-8 w-64 max-w-full"
               />
               <span className="text-xs text-muted-foreground">
                  {rows.length} {rows.length === 1 ? 'label' : 'labels'}
               </span>
            </div>

            <div className="overflow-hidden rounded-xl border bg-card">
               <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem_4rem_6rem] items-center gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
                  <span>Name</span>
                  <span className="text-right">Issues</span>
                  <span className="text-right">Projects</span>
                  <span className="text-right">Initiatives</span>
                  <span className="text-right">Created</span>
               </div>

               {loading ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">Loading workspace labels…</p>
               ) : rows.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-muted-foreground">No labels match your filter.</p>
               ) : (
                  rows.map((label) => {
                     const editing = editingId === label.id;
                     const pending = submittingId === label.id;
                     return (
                        <div key={label.id} className="grid grid-cols-[minmax(0,1fr)_4rem_4rem_4rem_6rem] items-center gap-2 border-b px-4 py-2.5 text-sm last:border-0">
                           <div className="min-w-0">
                              {editing && canWrite ? (
                                 <div className="flex min-w-0 items-center gap-2">
                                    <Input
                                       type="color"
                                       value={editColor}
                                       onChange={(event) => setEditColor(event.target.value.toUpperCase())}
                                       className="h-8 w-12 shrink-0 p-1"
                                       aria-label={`Color for ${label.name}`}
                                    />
                                    <Input
                                       value={editName}
                                       onChange={(event) => setEditName(event.target.value)}
                                       maxLength={60}
                                       className="h-8 min-w-0"
                                       aria-label={`Name for ${label.name}`}
                                    />
                                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => void saveLabel(label)} disabled={pending || !editName.trim()} aria-label={`Save ${label.name}`}>
                                       <Check className="size-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setEditingId(null)} disabled={pending} aria-label="Cancel label edit">
                                       <X className="size-4" />
                                    </Button>
                                 </div>
                              ) : (
                                 <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                                    <span className="truncate font-medium">{label.name}</span>
                                    {canWrite && (
                                       <div className="ml-auto flex shrink-0 items-center opacity-70 hover:opacity-100">
                                          <Button variant="ghost" size="icon" className="size-7" onClick={() => beginEdit(label)} disabled={submittingId !== null} aria-label={`Edit ${label.name}`}>
                                             <Pencil className="size-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => void deleteLabel(label)} disabled={submittingId !== null} aria-label={`Delete ${label.name}`}>
                                             <Trash2 className="size-3.5" />
                                          </Button>
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                           <span className="text-right text-xs text-muted-foreground">{formatCount(label.usage.issues)}</span>
                           <span className="text-right text-xs text-muted-foreground">{formatCount(label.usage.projects)}</span>
                           <span className="text-right text-xs text-muted-foreground">{formatCount(label.usage.initiatives)}</span>
                           <span className="text-right text-xs text-muted-foreground">{format(parseISO(label.createdAt), 'MMM yyyy')}</span>
                        </div>
                     );
                  })
               )}
            </div>
         </div>
      </div>
   );
}
