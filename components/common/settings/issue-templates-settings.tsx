'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { IssueTemplateDto } from '@/lib/issue-templates/contracts';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

const errorMessage = async (response: Response, fallback: string) => {
   try {
      return ((await response.json()) as { error?: string }).error ?? fallback;
   } catch {
      return fallback;
   }
};

export default function IssueTemplatesSettings() {
   const workspace = useWorkspace();
   const [templates, setTemplates] = useState<IssueTemplateDto[]>([]);
   const [loading, setLoading] = useState(workspace.configured);
   const [editing, setEditing] = useState<IssueTemplateDto | null>(null);
   const [creating, setCreating] = useState(false);
   const [busy, setBusy] = useState(false);
   const [name, setName] = useState('');
   const [description, setDescription] = useState('');
   const [title, setTitle] = useState('');
   const [body, setBody] = useState('');
   const endpoint = useMemo(
      () => `/api/issue-templates?organization=${encodeURIComponent(workspace.organization.slug)}`,
      [workspace.organization.slug]
   );
   const canAdmin = workspace.configured && ['owner', 'admin'].includes(workspace.user.role);

   useEffect(() => {
      if (!workspace.configured) {
         setLoading(false);
         return;
      }
      const controller = new AbortController();
      void fetch(endpoint, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok)
               throw new Error(await errorMessage(response, 'Unable to load issue templates.'));
            return (await response.json()) as { templates: IssueTemplateDto[] };
         })
         .then((result) => setTemplates(result.templates))
         .catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === 'AbortError'))
               toast.error(
                  error instanceof Error ? error.message : 'Unable to load issue templates.'
               );
         })
         .finally(() => setLoading(false));
      return () => controller.abort();
   }, [endpoint, workspace.configured]);

   const reset = () => {
      setCreating(false);
      setEditing(null);
      setName('');
      setDescription('');
      setTitle('');
      setBody('');
   };
   const startEdit = (template: IssueTemplateDto) => {
      setEditing(template);
      setCreating(false);
      setName(template.name);
      setDescription(template.description);
      setTitle(template.title);
      setBody(template.body);
   };
   const save = async () => {
      if (!canAdmin || busy || !name.trim()) return;
      setBusy(true);
      try {
         const url = editing
            ? `/api/issue-templates/${editing.id}?organization=${encodeURIComponent(workspace.organization.slug)}`
            : endpoint;
         const response = await fetch(url, {
            method: editing ? 'PATCH' : 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
               name: name.trim(),
               description: description.trim(),
               title: title.trim(),
               body,
            }),
         });
         if (!response.ok)
            throw new Error(await errorMessage(response, 'Unable to save issue template.'));
         const result = (await response.json()) as { template: IssueTemplateDto };
         setTemplates((current) =>
            editing
               ? current.map((item) => (item.id === editing.id ? result.template : item))
               : [...current, result.template]
         );
         reset();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to save issue template.');
      } finally {
         setBusy(false);
      }
   };
   const setActive = async (template: IssueTemplateDto, active: boolean) => {
      const response = await fetch(
         `/api/issue-templates/${template.id}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active }),
         }
      );
      if (!response.ok)
         return toast.error(await errorMessage(response, 'Unable to update issue template.'));
      setTemplates((current) =>
         current.map((item) => (item.id === template.id ? { ...item, active } : item))
      );
   };
   const remove = async (template: IssueTemplateDto) => {
      if (!window.confirm(`Delete “${template.name}”?`)) return;
      const response = await fetch(
         `/api/issue-templates/${template.id}?organization=${encodeURIComponent(workspace.organization.slug)}`,
         { method: 'DELETE', credentials: 'same-origin' }
      );
      if (!response.ok)
         return toast.error(await errorMessage(response, 'Unable to delete issue template.'));
      setTemplates((current) => current.filter((item) => item.id !== template.id));
   };
   const move = async (index: number, offset: -1 | 1) => {
      const target = index + offset;
      if (target < 0 || target >= templates.length) return;
      const previous = templates;
      const reordered = [...templates];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      setTemplates(reordered);
      const response = await fetch(endpoint, {
         method: 'PATCH',
         credentials: 'same-origin',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ orderedTemplateIds: reordered.map((item) => item.id) }),
      });
      if (!response.ok) {
         setTemplates(previous);
         toast.error(await errorMessage(response, 'Unable to reorder issue templates.'));
      }
   };

   const formOpen = creating || editing !== null;
   return (
      <SettingsShell
         title="Issue templates"
         description="Reusable, workspace-wide starting points for new issues."
      >
         {!workspace.configured && (
            <p className="text-sm text-muted-foreground">
               Templates are read-only in demo mode. Configure Supabase to manage workspace
               templates.
            </p>
         )}
         <SettingsSection
            action={
               canAdmin && !formOpen ? (
                  <Button size="sm" onClick={() => setCreating(true)}>
                     <Plus className="size-4" />
                     New template
                  </Button>
               ) : undefined
            }
         >
            {formOpen && (
               <SettingsCard className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                     <h2 className="font-medium">{editing ? 'Edit template' : 'New template'}</h2>
                     <Button size="icon" variant="ghost" onClick={reset}>
                        <X className="size-4" />
                     </Button>
                  </div>
                  <Input
                     value={name}
                     onChange={(event) => setName(event.target.value)}
                     maxLength={80}
                     placeholder="Template name"
                  />
                  <Input
                     value={description}
                     onChange={(event) => setDescription(event.target.value)}
                     maxLength={500}
                     placeholder="Short description (optional)"
                  />
                  <Input
                     value={title}
                     onChange={(event) => setTitle(event.target.value)}
                     maxLength={200}
                     placeholder="Default issue title (optional)"
                  />
                  <Textarea
                     value={body}
                     onChange={(event) => setBody(event.target.value)}
                     maxLength={10000}
                     placeholder="Default issue description (optional)"
                     rows={6}
                  />
                  <div className="flex justify-end">
                     <Button onClick={() => void save()} disabled={busy || !name.trim()}>
                        {busy ? 'Saving…' : 'Save template'}
                     </Button>
                  </div>
               </SettingsCard>
            )}
            <SettingsCard>
               {loading && <SettingsRow title="Loading issue templates…" />}
               {!loading && templates.length === 0 && (
                  <SettingsRow
                     title="No issue templates"
                     description="Create the first persisted template for this workspace."
                  />
               )}
               {templates.map((template, index) => (
                  <SettingsRow
                     key={template.id}
                     icon={<FileText className="size-4" />}
                     title={template.name}
                     description={
                        template.description || template.title || 'No defaults configured'
                     }
                     muted={!template.active}
                     trailing={
                        <>
                           {canAdmin && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 disabled={index === 0}
                                 onClick={() => void move(index, -1)}
                                 aria-label={`Move ${template.name} up`}
                              >
                                 <ArrowUp className="size-4" />
                              </Button>
                           )}
                           {canAdmin && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 disabled={index === templates.length - 1}
                                 onClick={() => void move(index, 1)}
                                 aria-label={`Move ${template.name} down`}
                              >
                                 <ArrowDown className="size-4" />
                              </Button>
                           )}
                           {canAdmin && (
                              <Switch
                                 checked={template.active}
                                 onCheckedChange={(active) => void setActive(template, active)}
                                 aria-label={`Enable ${template.name}`}
                              />
                           )}
                           {canAdmin && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={() => startEdit(template)}
                              >
                                 <Pencil className="size-4" />
                              </Button>
                           )}
                           {canAdmin && (
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 onClick={() => void remove(template)}
                              >
                                 <Trash2 className="size-4" />
                              </Button>
                           )}
                        </>
                     }
                  />
               ))}
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
