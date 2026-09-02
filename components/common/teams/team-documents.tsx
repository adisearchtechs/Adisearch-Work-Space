'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { FileText, Pin, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TeamDocumentDto } from '@/lib/team-documents/contracts';
import { documentFolders } from '@/mock-data/documents';
import { resolveTeamReference, useTeamsStore } from '@/store/teams-store';

const timeAgo = (date: string) =>
   formatDistanceToNowStrict(parseISO(date), { addSuffix: true })
      .replace(' minutes', 'min')
      .replace(' hours', 'h')
      .replace(' days', 'd')
      .replace(' weeks', 'w')
      .replace(' months', 'mo')
      .replace(' years', 'y');

const sortDocuments = (documents: TeamDocumentDto[]) =>
   [...documents].sort((left, right) => {
      if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
      return right.updatedAt.localeCompare(left.updatedAt);
   });

async function readError(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

function DemoTeamDocuments() {
   const documents = documentFolders.flatMap((folder) => folder.documents);
   return (
      <div className="w-full">
         <div className="flex items-center justify-between border-b px-6 py-3">
            <div>
               <p className="text-sm font-medium">Documents</p>
               <p className="text-xs text-muted-foreground">Demo documents are read-only.</p>
            </div>
            <Button size="xs" variant="secondary" disabled>
               <Plus className="size-4 md:mr-1" />
               <span className="hidden md:inline">New document</span>
            </Button>
         </div>
         <div className="divide-y">
            {documents.map((document) => (
               <div key={document.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{document.name}</span>
                  {document.pinned && <Pin className="size-3.5 text-muted-foreground" />}
                  <span className="hidden text-xs text-muted-foreground sm:inline">{timeAgo(document.updatedAt)}</span>
               </div>
            ))}
         </div>
      </div>
   );
}

type EditorState = {
   open: boolean;
   documentId: string | null;
   title: string;
   body: string;
   pinned: boolean;
};

const EMPTY_EDITOR: EditorState = {
   open: false,
   documentId: null,
   title: '',
   body: '',
   pinned: false,
};

export default function TeamDocuments() {
   const workspace = useWorkspace();
   const { teamId } = useParams<{ orgId: string; teamId: string }>();
   const teams = useTeamsStore((state) => state.teams);
   const workspaceSlug = useTeamsStore((state) => state.workspaceSlug);
   const teamsLoading = useTeamsStore((state) => state.loading);
   const resolvedTeam =
      workspace.configured && workspaceSlug === workspace.organization.slug
         ? resolveTeamReference(teams, teamId)
         : undefined;
   const [documents, setDocuments] = useState<TeamDocumentDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [canWrite, setCanWrite] = useState(workspace.user.role !== 'guest');
   const [saving, setSaving] = useState(false);
   const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);

   const collectionEndpoint = useMemo(() => {
      if (!resolvedTeam) return null;
      return `/api/teams/${encodeURIComponent(resolvedTeam.id)}/documents`;
   }, [resolvedTeam]);
   const organizationQuery = `?organization=${encodeURIComponent(workspace.organization.slug)}`;

   useEffect(() => {
      if (!workspace.configured || !collectionEndpoint) return;
      const controller = new AbortController();
      setLoading(true);
      void fetch(`${collectionEndpoint}${organizationQuery}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(await readError(response, 'Unable to load team documents.'));
            return (await response.json()) as { documents: TeamDocumentDto[]; canWrite: boolean };
         })
         .then((result) => {
            if (controller.signal.aborted) return;
            setDocuments(sortDocuments(result.documents));
            setCanWrite(result.canWrite);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            toast.error(error instanceof Error ? error.message : 'Unable to load team documents.');
         })
         .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
         });
      return () => controller.abort();
   }, [collectionEndpoint, organizationQuery, workspace.configured]);

   if (!workspace.configured) return <DemoTeamDocuments />;

   if (teamsLoading || workspaceSlug !== workspace.organization.slug || loading) {
      return (
         <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">
            Loading documents…
         </div>
      );
   }

   if (!resolvedTeam || !collectionEndpoint) {
      return <div className="mx-auto max-w-2xl px-6 py-10"><h1 className="text-2xl font-medium">Team not found</h1></div>;
   }

   const openNewDocument = () =>
      setEditor({ open: true, documentId: null, title: 'Untitled document', body: '', pinned: false });

   const openDocument = (document: TeamDocumentDto) =>
      setEditor({
         open: true,
         documentId: document.id,
         title: document.title,
         body: document.body,
         pinned: document.pinned,
      });

   const saveDocument = async () => {
      if (!canWrite || saving || editor.title.trim().length === 0) return;
      setSaving(true);
      try {
         const editingExisting = editor.documentId !== null;
         const endpoint = editingExisting
            ? `${collectionEndpoint}/${encodeURIComponent(editor.documentId!)}${organizationQuery}`
            : `${collectionEndpoint}${organizationQuery}`;
         const response = await fetch(endpoint, {
            method: editingExisting ? 'PATCH' : 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
               title: editor.title.trim(),
               body: editor.body,
               pinned: editor.pinned,
            }),
         });
         if (!response.ok) throw new Error(await readError(response, 'Unable to save team document.'));
         const result = (await response.json()) as { document: TeamDocumentDto };
         setDocuments((current) =>
            sortDocuments(
               editingExisting
                  ? current.map((document) =>
                       document.id === result.document.id ? result.document : document
                    )
                  : [...current, result.document]
            )
         );
         setEditor(EMPTY_EDITOR);
         toast.success(editingExisting ? 'Document updated.' : 'Document created.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to save team document.');
      } finally {
         setSaving(false);
      }
   };

   const togglePinned = async (document: TeamDocumentDto) => {
      if (!canWrite) return;
      try {
         const response = await fetch(
            `${collectionEndpoint}/${encodeURIComponent(document.id)}${organizationQuery}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ pinned: !document.pinned }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to update pin.'));
         const result = (await response.json()) as { document: TeamDocumentDto };
         setDocuments((current) =>
            sortDocuments(
               current.map((item) => (item.id === result.document.id ? result.document : item))
            )
         );
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update pin.');
      }
   };

   const deleteDocument = async () => {
      if (!canWrite || !editor.documentId || saving) return;
      if (!window.confirm('Delete this team document? This cannot be undone.')) return;
      setSaving(true);
      try {
         const response = await fetch(
            `${collectionEndpoint}/${encodeURIComponent(editor.documentId)}${organizationQuery}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to delete team document.'));
         setDocuments((current) => current.filter((document) => document.id !== editor.documentId));
         setEditor(EMPTY_EDITOR);
         toast.success('Document deleted.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete team document.');
      } finally {
         setSaving(false);
      }
   };

   return (
      <div className="w-full">
         <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
            <div>
               <p className="text-sm font-medium">{resolvedTeam.name} documents</p>
               <p className="text-xs text-muted-foreground">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'} · pinned items appear on Team Overview
               </p>
            </div>
            {canWrite && (
               <Button size="xs" variant="secondary" onClick={openNewDocument}>
                  <Plus className="size-4 md:mr-1" />
                  <span className="hidden md:inline">New document</span>
               </Button>
            )}
         </div>

         {documents.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-16 text-center">
               <FileText className="size-8 text-muted-foreground" />
               <div>
                  <p className="text-sm font-medium">No team documents yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                     {canWrite ? 'Create the first document for this team.' : 'A team member can add documents here.'}
                  </p>
               </div>
               {canWrite && <Button size="sm" onClick={openNewDocument}>Create document</Button>}
            </div>
         ) : (
            <div className="divide-y">
               {documents.map((document) => (
                  <div key={document.id} className="flex items-center gap-2 px-4 hover:bg-sidebar/40 sm:px-6">
                     <button
                        type="button"
                        onClick={() => openDocument(document)}
                        className="grid min-w-0 flex-1 grid-cols-[1fr_90px] items-center gap-3 py-3 text-left md:grid-cols-[1fr_110px_110px]"
                     >
                        <span className="flex min-w-0 items-center gap-2">
                           <FileText className="size-4 shrink-0 text-muted-foreground" />
                           <span className="truncate text-sm font-medium">{document.title}</span>
                           {document.pinned && <Pin className="size-3.5 shrink-0 text-muted-foreground" />}
                        </span>
                        <span className="hidden text-xs text-muted-foreground md:block">{timeAgo(document.createdAt)}</span>
                        <span className="text-right text-xs text-muted-foreground md:text-left">{timeAgo(document.updatedAt)}</span>
                     </button>
                     {canWrite && (
                        <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           className="size-8 shrink-0"
                           aria-label={document.pinned ? `Unpin ${document.title}` : `Pin ${document.title}`}
                           onClick={() => void togglePinned(document)}
                        >
                           <Pin className="size-4" />
                        </Button>
                     )}
                  </div>
               ))}
            </div>
         )}

         <Dialog open={editor.open} onOpenChange={(open) => !open && setEditor(EMPTY_EDITOR)}>
            <DialogContent className="sm:max-w-2xl">
               <DialogHeader>
                  <DialogTitle>{editor.documentId ? 'Team document' : 'New team document'}</DialogTitle>
                  <DialogDescription>
                     {canWrite ? 'Keep lightweight team notes and references in the workspace.' : 'This document is read-only for guests.'}
                  </DialogDescription>
               </DialogHeader>
               <div className="grid gap-4">
                  <label className="grid gap-1.5 text-sm font-medium">
                     Title
                     <Input
                        value={editor.title}
                        onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))}
                        maxLength={160}
                        disabled={!canWrite || saving}
                     />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                     Document
                     <Textarea
                        value={editor.body}
                        onChange={(event) => setEditor((current) => ({ ...current, body: event.target.value }))}
                        maxLength={50000}
                        rows={16}
                        className="min-h-64 resize-y"
                        disabled={!canWrite || saving}
                        placeholder="Write notes, decisions, links, or team context…"
                     />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                     <input
                        type="checkbox"
                        checked={editor.pinned}
                        onChange={(event) => setEditor((current) => ({ ...current, pinned: event.target.checked }))}
                        disabled={!canWrite || saving}
                     />
                     Pin to Team Overview
                  </label>
               </div>
               <DialogFooter className="sm:justify-between">
                  <div>
                     {canWrite && editor.documentId && (
                        <Button variant="destructive" onClick={() => void deleteDocument()} disabled={saving}>
                           <Trash2 className="size-4" /> Delete
                        </Button>
                     )}
                  </div>
                  <div className="flex justify-end gap-2">
                     <Button variant="outline" onClick={() => setEditor(EMPTY_EDITOR)} disabled={saving}>Close</Button>
                     {canWrite && (
                        <Button onClick={() => void saveDocument()} disabled={saving || editor.title.trim().length === 0}>
                           {saving ? 'Saving…' : 'Save'}
                        </Button>
                     )}
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
