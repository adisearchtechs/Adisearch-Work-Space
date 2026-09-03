'use client';

import { themePreferencesSchema, type ThemePreferencesDto } from '@/lib/preferences/contracts';
import { useThemeStore } from '@/store/theme-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { ThemePreferences } from './theme-preferences';

type SyncStatus = 'loading' | 'saving' | 'synced' | 'local';

const statusCopy: Record<SyncStatus, string> = {
   loading: 'Loading account preferences…',
   saving: 'Saving preferences to your account…',
   synced: 'Saved to your account and available across signed-in devices.',
   local: 'Account sync is unavailable. Changes remain saved on this device and will retry on the next edit.',
};

async function savePreferences(preferences: ThemePreferencesDto) {
   const response = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
   });
   if (!response.ok) throw new Error('Unable to save preferences.');

   const payload = (await response.json()) as { preferences?: unknown };
   const parsed = themePreferencesSchema.safeParse(payload.preferences);
   if (!parsed.success) throw new Error('Invalid preference response.');
   return parsed.data;
}

export default function PersistentPreferences() {
   const { mode, lightVariant, darkVariant, custom } = useThemeStore();
   const [ready, setReady] = useState(false);
   const [status, setStatus] = useState<SyncStatus>('loading');
   const skipNextSave = useRef(false);

   const preferences = useMemo<ThemePreferencesDto>(
      () => ({ mode, lightVariant, darkVariant, custom }),
      [mode, lightVariant, darkVariant, custom]
   );
   const serializedPreferences = useMemo(() => JSON.stringify(preferences), [preferences]);

   useEffect(() => {
      let cancelled = false;

      void (async () => {
         try {
            const response = await fetch('/api/preferences', { cache: 'no-store' });
            if (!response.ok) throw new Error('Unable to load preferences.');

            const payload = (await response.json()) as { preferences?: unknown };
            if (payload.preferences === null) {
               setStatus('saving');
               await savePreferences(preferences);
               if (!cancelled) setStatus('synced');
            } else {
               const parsed = themePreferencesSchema.safeParse(payload.preferences);
               if (!parsed.success) throw new Error('Invalid preference response.');
               skipNextSave.current = true;
               useThemeStore.setState(parsed.data);
               if (!cancelled) setStatus('synced');
            }
         } catch {
            if (!cancelled) setStatus('local');
         } finally {
            if (!cancelled) setReady(true);
         }
      })();

      return () => {
         cancelled = true;
      };
      // The first load intentionally captures the already hydrated local fallback once.
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   useEffect(() => {
      if (!ready) return;
      if (skipNextSave.current) {
         skipNextSave.current = false;
         return;
      }

      const timer = window.setTimeout(() => {
         setStatus('saving');
         void savePreferences(preferences)
            .then(() => setStatus('synced'))
            .catch(() => setStatus('local'));
      }, 400);

      return () => window.clearTimeout(timer);
   }, [ready, serializedPreferences, preferences]);

   return (
      <SettingsShell
         title="Preferences"
         description="Personal interface settings are stored against your signed-in account."
      >
         <SettingsSection title="Sync status">
            <SettingsCard>
               <SettingsRow title="Personal preferences" description={statusCopy[status]} />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection
            title="Interface and theme"
            description="Theme choices sync across your signed-in devices. Device storage remains a fallback if account sync is temporarily unavailable."
         >
            {ready ? (
               <ThemePreferences />
            ) : (
               <SettingsCard>
                  <SettingsRow title="Theme" description="Loading your saved preference…" muted />
               </SettingsCard>
            )}
         </SettingsSection>

         <SettingsSection
            title="Other preferences"
            description="Home-view, display-name formatting, comment shortcuts, desktop behavior, and workflow automation settings are not released yet."
         >
            <SettingsCard>
               <SettingsRow
                  title="Not configurable yet"
                  description="These controls remain hidden until they have authoritative persistence and product behavior behind them."
                  muted
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
