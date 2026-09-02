'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import type { NotificationDto } from '@/lib/notifications/contracts';
import { usePersistentNotificationsStore } from '@/store/persistent-notifications-store';
import { useWorkspace } from '@/components/providers/workspace-provider';

export function SaasNotificationsProvider({ children }: { children: React.ReactNode }) {
   const workspace = useWorkspace();
   const pathname = usePathname();

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      usePersistentNotificationsStore.getState().beginLoad(workspace.organization.slug);

      void fetch(`/api/notifications?organization=${encodeURIComponent(workspace.organization.slug)}`, {
         credentials: 'same-origin',
         signal: controller.signal,
         headers: { Accept: 'application/json' },
      })
         .then(async (response) => {
            if (!response.ok) throw new Error(`Notification load failed with ${response.status}.`);
            return (await response.json()) as { notifications: NotificationDto[] };
         })
         .then(({ notifications }) => {
            if (controller.signal.aborted) return;
            usePersistentNotificationsStore
               .getState()
               .replaceNotifications(workspace.organization.slug, notifications);
         })
         .catch((error: unknown) => {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            usePersistentNotificationsStore.getState().reset();
            toast.error('Unable to load inbox notifications.');
         });

      return () => controller.abort();
   }, [pathname, workspace.configured, workspace.organization.slug]);

   useEffect(() => {
      if (workspace.configured) return;
      usePersistentNotificationsStore.getState().reset();
   }, [workspace.configured]);

   return children;
}
