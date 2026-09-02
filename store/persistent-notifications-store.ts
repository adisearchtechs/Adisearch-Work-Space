import type { NotificationDto } from '@/lib/notifications/contracts';
import { create } from 'zustand';

interface PersistentNotificationsState {
   notifications: NotificationDto[];
   workspaceSlug: string | null;
   loading: boolean;
   selectedId: string | null;
   beginLoad: (workspaceSlug: string) => void;
   replaceNotifications: (workspaceSlug: string, notifications: NotificationDto[]) => void;
   select: (notificationId: string | null) => void;
   setRead: (notificationId: string, read: boolean) => void;
   markAllRead: () => void;
   remove: (notificationId: string) => void;
   removeRead: () => void;
   clearAll: () => void;
   reset: () => void;
}

export const usePersistentNotificationsStore = create<PersistentNotificationsState>((set) => ({
   notifications: [],
   workspaceSlug: null,
   loading: false,
   selectedId: null,
   beginLoad: (workspaceSlug) =>
      set({ notifications: [], workspaceSlug, loading: true, selectedId: null }),
   replaceNotifications: (workspaceSlug, notifications) =>
      set({
         notifications,
         workspaceSlug,
         loading: false,
         selectedId: notifications[0]?.id ?? null,
      }),
   select: (selectedId) => set({ selectedId }),
   setRead: (notificationId, read) =>
      set((state) => ({
         notifications: state.notifications.map((notification) =>
            notification.id === notificationId
               ? { ...notification, readAt: read ? new Date().toISOString() : null }
               : notification
         ),
      })),
   markAllRead: () =>
      set((state) => {
         const now = new Date().toISOString();
         return {
            notifications: state.notifications.map((notification) => ({
               ...notification,
               readAt: notification.readAt ?? now,
            })),
         };
      }),
   remove: (notificationId) =>
      set((state) => {
         const notifications = state.notifications.filter((item) => item.id !== notificationId);
         return {
            notifications,
            selectedId:
               state.selectedId === notificationId
                  ? notifications[0]?.id ?? null
                  : state.selectedId,
         };
      }),
   removeRead: () =>
      set((state) => {
         const notifications = state.notifications.filter((item) => !item.readAt);
         return {
            notifications,
            selectedId:
               state.selectedId && notifications.some((item) => item.id === state.selectedId)
                  ? state.selectedId
                  : notifications[0]?.id ?? null,
         };
      }),
   clearAll: () => set({ notifications: [], selectedId: null }),
   reset: () =>
      set({ notifications: [], workspaceSlug: null, loading: false, selectedId: null }),
}));
