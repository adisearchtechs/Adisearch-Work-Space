'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { ProfileSettingsDto } from '@/lib/profile/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

function isValidTimeZone(value: string) {
   try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
      return true;
   } catch {
      return false;
   }
}

export default function Profile() {
   const { configured, user, organization } = useWorkspace();
   const router = useRouter();
   const persistedDisplayName = user.displayName || 'Workspace member';
   const persistedTimezone = user.timezone || 'UTC';
   const [displayName, setDisplayName] = useState(persistedDisplayName);
   const [timezone, setTimezone] = useState(persistedTimezone);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [saved, setSaved] = useState(false);

   useEffect(() => {
      setDisplayName(persistedDisplayName);
      setTimezone(persistedTimezone);
   }, [persistedDisplayName, persistedTimezone]);

   const trimmedDisplayName = displayName.trim();
   const trimmedTimezone = timezone.trim();
   const username = trimmedDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 32);
   const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
   const fallback = (trimmedDisplayName || persistedDisplayName).slice(0, 2).toUpperCase();
   const valid =
      trimmedDisplayName.length >= 1 &&
      trimmedDisplayName.length <= 120 &&
      trimmedTimezone.length >= 1 &&
      trimmedTimezone.length <= 100 &&
      isValidTimeZone(trimmedTimezone);
   const dirty =
      trimmedDisplayName !== persistedDisplayName || trimmedTimezone !== persistedTimezone;
   const canSave = configured && valid && dirty && !saving;

   const helperText = useMemo(() => {
      if (!configured) return 'Profile editing is unavailable in the demo workspace.';
      if (!trimmedDisplayName) return 'Display name is required.';
      if (trimmedDisplayName.length > 120) return 'Display name must be 120 characters or fewer.';
      if (!isValidTimeZone(trimmedTimezone)) return 'Use a valid IANA time zone such as Africa/Nairobi.';
      if (saved && !dirty) return 'Saved.';
      return 'Display name and time zone are persisted to your authenticated profile.';
   }, [configured, dirty, saved, trimmedDisplayName, trimmedTimezone]);

   async function saveProfile() {
      if (!canSave) return;
      setSaving(true);
      setError(null);
      setSaved(false);

      try {
         const response = await fetch('/api/profile', {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: {
               Accept: 'application/json',
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               displayName: trimmedDisplayName,
               timezone: trimmedTimezone,
            }),
         });
         const payload = (await response.json().catch(() => ({}))) as {
            profile?: ProfileSettingsDto;
            error?: string;
         };
         if (!response.ok || !payload.profile) {
            throw new Error(payload.error ?? 'Unable to save profile settings.');
         }

         setDisplayName(payload.profile.displayName);
         setTimezone(payload.profile.timezone);
         setSaved(true);
         router.refresh();
      } catch (saveError) {
         setError(
            saveError instanceof Error ? saveError.message : 'Unable to save profile settings.'
         );
      } finally {
         setSaving(false);
      }
   }

   return (
      <SettingsShell
         title="My Profile"
         description="Manage the authenticated identity and time zone used across Adisearch Workspace."
      >
         <SettingsSection title="Profile" description={helperText}>
            <SettingsCard>
               <SettingsRow
                  title="Profile picture"
                  description="Avatar editing is not released yet; the current authenticated avatar is shown."
                  trailing={
                     <Avatar className="size-10 border">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={persistedDisplayName} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                     </Avatar>
                  }
               />
               <SettingsRow
                  title="Display name"
                  description="Shown on projects, updates, and workspace activity"
                  trailing={
                     <Input
                        value={displayName}
                        onChange={(event) => {
                           setDisplayName(event.target.value);
                           setSaved(false);
                        }}
                        disabled={!configured || saving}
                        maxLength={120}
                        aria-label="Display name"
                        className="h-8 w-52"
                     />
                  }
               />
               <SettingsRow
                  title="Time zone"
                  description="Used to present dates and scheduling context consistently"
                  trailing={
                     <Input
                        value={timezone}
                        onChange={(event) => {
                           setTimezone(event.target.value);
                           setSaved(false);
                        }}
                        disabled={!configured || saving}
                        maxLength={100}
                        placeholder="Africa/Nairobi"
                        aria-label="Time zone"
                        className="h-8 w-52"
                     />
                  }
               />
               <SettingsRow
                  title="Username"
                  description="Derived from your display name; it is not a separately persisted username."
                  trailing={
                     <Input
                        value={username || 'member'}
                        readOnly
                        aria-label="Username"
                        className="h-8 w-52 bg-muted/40"
                     />
                  }
               />
               <SettingsRow
                  title="Email"
                  trailing={<span className="text-sm text-foreground">{user.email}</span>}
               />
               <SettingsRow
                  title="Workspace role"
                  trailing={
                     <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium">
                        {roleLabel}
                     </span>
                  }
               />
            </SettingsCard>
            {error && (
               <div className="text-sm text-destructive" role="alert">
                  {error}
               </div>
            )}
            {configured && (
               <div className="flex justify-end">
                  <Button type="button" size="sm" disabled={!canSave} onClick={() => void saveProfile()}>
                     {saving ? 'Saving…' : 'Save profile'}
                  </Button>
               </div>
            )}
         </SettingsSection>

         <SettingsSection title="Workspace access">
            <SettingsCard>
               <SettingsRow
                  title={organization.name}
                  description={`Signed in as ${persistedDisplayName}`}
                  trailing={
                     <span className="text-xs text-muted-foreground">
                        Membership changes are managed by workspace administrators
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
