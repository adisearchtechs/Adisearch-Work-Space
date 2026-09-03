'use client';

import { Switch } from '@/components/ui/switch';
import {
   DEFAULT_NOTIFICATION_PREFERENCES,
   notificationPreferencesSchema,
   type NotificationPreferencesDto,
} from '@/lib/notifications/preferences-contracts';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

export default function NotificationPreferences() {
   const [preferences, setPreferences] = useState<NotificationPreferencesDto>(
      DEFAULT_NOTIFICATION_PREFERENCES
   );
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [available, setAvailable] = useState(true);

   useEffect(() => {
      let cancelled = false;

      void (async () => {
         try {
            const response = await fetch('/api/notification-preferences', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load notification preferences.');
            const payload = (await response.json()) as { preferences?: unknown };
            const parsed = notificationPreferencesSchema.safeParse(payload.preferences);
            if (!parsed.success) throw new Error('Invalid notification preference response.');
            if (!cancelled) {
               setPreferences(parsed.data);
               setAvailable(true);
            }
         } catch {
            if (!cancelled) setAvailable(false);
         } finally {
            if (!cancelled) setLoading(false);
         }
      })();

      return () => {
         cancelled = true;
      };
   }, []);

   const save = async (next: NotificationPreferencesDto) => {
      const previous = preferences;
      setPreferences(next);
      setSaving(true);

      try {
         const response = await fetch('/api/notification-preferences', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
         });
         if (!response.ok) throw new Error('Unable to save notification preferences.');

         const payload = (await response.json()) as { preferences?: unknown };
         const parsed = notificationPreferencesSchema.safeParse(payload.preferences);
         if (!parsed.success) throw new Error('Invalid notification preference response.');
         setPreferences(parsed.data);
         setAvailable(true);
         toast.success('Notification preferences saved');
      } catch {
         setPreferences(previous);
         setAvailable(false);
         toast.error('Notification preferences could not be saved');
      } finally {
         setSaving(false);
      }
   };

   const disabled = loading || saving || !available;

   return (
      <SettingsShell
         title="Notifications"
         description="Choose which supported workspace events create notifications in your Adisearch Inbox."
      >
         <SettingsSection
            title="In-app Inbox"
            description="These settings affect the persistent Adisearch Inbox only. Email, push, digest, and external-channel delivery are not enabled by these controls."
         >
            <SettingsCard>
               <SettingsRow
                  title="Issue assignments"
                  description="Create an Inbox notification when another workspace member assigns an issue to you."
                  trailing={
                     <Switch
                        aria-label="Issue assignment notifications"
                        checked={preferences.issueAssignment}
                        disabled={disabled}
                        onCheckedChange={(issueAssignment) =>
                           void save({ ...preferences, issueAssignment })
                        }
                     />
                  }
               />
               <SettingsRow
                  title="Assigned issue status changes"
                  description="Create an Inbox notification when another workspace member changes the status of an issue assigned to you."
                  trailing={
                     <Switch
                        aria-label="Assigned issue status notifications"
                        checked={preferences.issueStatus}
                        disabled={disabled}
                        onCheckedChange={(issueStatus) => void save({ ...preferences, issueStatus })}
                     />
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection title="Delivery status">
            <SettingsCard>
               <SettingsRow
                  title={available ? 'Preference storage available' : 'Preference storage unavailable'}
                  description={
                     available
                        ? loading
                           ? 'Loading your saved notification settings…'
                           : saving
                             ? 'Saving your notification settings…'
                             : 'Your choices are stored against your signed-in account and enforced when issue notifications are generated.'
                        : 'Controls are disabled because the server-backed preference store could not be reached. Existing notification behavior remains unchanged.'
                  }
                  muted={!available}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
