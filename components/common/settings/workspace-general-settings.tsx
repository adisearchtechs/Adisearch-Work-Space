'use client';

import { useWorkspace } from '@/components/providers/workspace-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WorkspaceSettingsDto } from '@/lib/workspace-settings/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

export default function WorkspaceGeneralSettings() {
   const { configured, organization, user } = useWorkspace();
   const router = useRouter();
   const canManage = user.role === 'owner' || user.role === 'admin';
   const [name, setName] = useState(organization.name);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [saved, setSaved] = useState(false);

   useEffect(() => setName(organization.name), [organization.name]);

   const trimmedName = name.trim();
   const valid = trimmedName.length >= 2 && trimmedName.length <= 100;
   const dirty = trimmedName !== organization.name;
   const canSave = configured && canManage && valid && dirty && !saving;

   async function saveWorkspace() {
      if (!canSave) return;
      setSaving(true);
      setError(null);
      setSaved(false);

      try {
         const response = await fetch(
            `/api/workspace-settings?organization=${encodeURIComponent(organization.slug)}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify({ name: trimmedName }),
            }
         );
         const payload = (await response.json().catch(() => ({}))) as {
            workspace?: WorkspaceSettingsDto;
            error?: string;
         };
         if (!response.ok || !payload.workspace) {
            throw new Error(payload.error ?? 'Unable to save workspace settings.');
         }

         setName(payload.workspace.name);
         setSaved(true);
         router.refresh();
      } catch (saveError) {
         setError(
            saveError instanceof Error
               ? saveError.message
               : 'Unable to save workspace settings.'
         );
      } finally {
         setSaving(false);
      }
   }

   const description = !configured
      ? 'Workspace editing is unavailable in the demo workspace.'
      : !canManage
        ? 'Only workspace owners and admins can change workspace settings.'
        : saved && !dirty
          ? 'Saved.'
          : 'Changes are persisted to the workspace and become the authoritative organization name.';

   return (
      <SettingsShell
         title="Workspace"
         description="Manage the core identity of this Adisearch Workspace."
      >
         <SettingsSection title="General" description={description}>
            <SettingsCard>
               <SettingsRow
                  title="Workspace name"
                  description="Shown in workspace navigation and shared workspace surfaces"
                  trailing={
                     <Input
                        value={name}
                        onChange={(event) => {
                           setName(event.target.value);
                           setSaved(false);
                        }}
                        disabled={!configured || !canManage || saving}
                        maxLength={100}
                        aria-label="Workspace name"
                        className="h-8 w-56"
                     />
                  }
               />
               <SettingsRow
                  title="Workspace URL slug"
                  description="URL changes are intentionally disabled because they affect existing workspace links."
                  trailing={
                     <Input
                        value={organization.slug}
                        readOnly
                        aria-label="Workspace URL slug"
                        className="h-8 w-56 bg-muted/40"
                     />
                  }
               />
            </SettingsCard>
            {error && (
               <div className="text-sm text-destructive" role="alert">
                  {error}
               </div>
            )}
            {configured && canManage && (
               <div className="flex justify-end">
                  <Button type="button" size="sm" disabled={!canSave} onClick={() => void saveWorkspace()}>
                     {saving ? 'Saving…' : 'Save workspace'}
                  </Button>
               </div>
            )}
         </SettingsSection>
      </SettingsShell>
   );
}
