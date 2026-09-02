'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, File, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import type { AttachmentDto, AttachmentEntityType } from '@/lib/attachments/contracts';

function formatBytes(value: number) {
   if (value < 1024) return `${value} B`;
   if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
   return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function EntityAttachments({ entityType, entityId, compact = false }: { entityType: AttachmentEntityType; entityId: string; compact?: boolean }) {
   const workspace = useWorkspace();
   const [items, setItems] = useState<AttachmentDto[]>([]);
   const [loading, setLoading] = useState(false);
   const [uploading, setUploading] = useState(false);
   const [canWrite, setCanWrite] = useState(false);
   const inputRef = useRef<HTMLInputElement>(null);
   const endpoint = `/api/attachments?organization=${encodeURIComponent(workspace.organization.slug)}&entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;

   const refresh = useCallback(async (signal?: AbortSignal) => {
      if (!workspace.configured) return;
      setLoading(true);
      try {
         const response = await fetch(endpoint, { credentials: 'same-origin', signal, headers: { Accept: 'application/json' } });
         if (!response.ok) throw new Error(String(response.status));
         const data = (await response.json()) as { attachments: AttachmentDto[]; canWrite: boolean };
         setItems(data.attachments);
         setCanWrite(data.canWrite);
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError') return;
         toast.error('Unable to load attachments.');
      } finally {
         setLoading(false);
      }
   }, [endpoint, workspace.configured]);

   useEffect(() => {
      const controller = new AbortController();
      void refresh(controller.signal);
      return () => controller.abort();
   }, [refresh]);

   if (!workspace.configured) return null;

   const upload = async (file: File) => {
      setUploading(true);
      try {
         const form = new FormData();
         form.set('file', file);
         const response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', body: form });
         const payload = (await response.json().catch(() => ({}))) as { attachment?: AttachmentDto; error?: string };
         if (!response.ok || !payload.attachment) throw new Error(payload.error || 'Upload failed.');
         setItems((current) => [payload.attachment!, ...current]);
         toast.success('Attachment uploaded.');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to upload attachment.');
      } finally {
         setUploading(false);
         if (inputRef.current) inputRef.current.value = '';
      }
   };

   const download = async (attachment: AttachmentDto) => {
      try {
         const response = await fetch(`/api/attachments/${encodeURIComponent(attachment.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`, { credentials: 'same-origin' });
         const data = (await response.json()) as { url?: string };
         if (!response.ok || !data.url) throw new Error();
         const anchor = document.createElement('a');
         anchor.href = data.url;
         anchor.rel = 'noopener noreferrer';
         anchor.click();
      } catch {
         toast.error('Unable to download attachment.');
      }
   };

   const remove = async (attachment: AttachmentDto) => {
      if (!canWrite || !window.confirm(`Delete “${attachment.fileName}”?`)) return;
      try {
         const response = await fetch(`/api/attachments/${encodeURIComponent(attachment.id)}?organization=${encodeURIComponent(workspace.organization.slug)}`, { method: 'DELETE', credentials: 'same-origin' });
         if (!response.ok) throw new Error();
         setItems((current) => current.filter((item) => item.id !== attachment.id));
         toast.success('Attachment deleted.');
      } catch {
         toast.error('Unable to delete attachment.');
      }
   };

   return (
      <section className={compact ? 'mt-5' : 'rounded-xl border bg-card p-4'}>
         <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium"><Paperclip className="size-4" /> Attachments <span className="text-muted-foreground font-normal">{items.length}</span></div>
            {canWrite && (
               <>
                  <input ref={inputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv,application/json,application/zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload className="size-3.5" />{uploading ? 'Uploading…' : 'Add file'}</Button>
               </>
            )}
         </div>
         {loading ? <p className="mt-3 text-sm text-muted-foreground">Loading attachments…</p> : items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No attachments yet.</p> : (
            <div className="mt-3 divide-y rounded-lg border">
               {items.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
                     <File className="size-4 shrink-0 text-muted-foreground" />
                     <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{attachment.fileName}</p><p className="text-xs text-muted-foreground">{formatBytes(attachment.byteSize)} · {new Date(attachment.createdAt).toLocaleDateString()}</p></div>
                     <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => void download(attachment)} aria-label={`Download ${attachment.fileName}`}><Download className="size-4" /></Button>
                     {canWrite && <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => void remove(attachment)} aria-label={`Delete ${attachment.fileName}`}><Trash2 className="size-4" /></Button>}
                  </div>
               ))}
            </div>
         )}
      </section>
   );
}
