'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Inbox as InboxIcon, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { issueHref } from '@/lib/issues/routes';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { usePersistentNotificationsStore } from '@/store/persistent-notifications-store';

const TABS = ['all', 'unread'] as const;
type Tab = (typeof TABS)[number];

async function readError(response: Response, fallback: string) {
   try {
      const body = (await response.json()) as { error?: string };
      return body.error || fallback;
   } catch {
      return fallback;
   }
}

export default function PersistentInbox() {
   const workspace = useWorkspace();
   const { orgId } = useParams<{ orgId: string }>();
   const notifications = usePersistentNotificationsStore((state) => state.notifications);
   const loading = usePersistentNotificationsStore((state) => state.loading);
   const workspaceSlug = usePersistentNotificationsStore((state) => state.workspaceSlug);
   const selectedId = usePersistentNotificationsStore((state) => state.selectedId);
   const select = usePersistentNotificationsStore((state) => state.select);
   const setRead = usePersistentNotificationsStore((state) => state.setRead);
   const markAllReadLocal = usePersistentNotificationsStore((state) => state.markAllRead);
   const remove = usePersistentNotificationsStore((state) => state.remove);
   const removeReadLocal = usePersistentNotificationsStore((state) => state.removeRead);
   const clearAllLocal = usePersistentNotificationsStore((state) => state.clearAll);
   const [tab, setTab] = useState<Tab>('all');
   const [busy, setBusy] = useState(false);

   const ready = workspaceSlug === workspace.organization.slug && !loading;
   const visible = useMemo(
      () => (tab === 'unread' ? notifications.filter((notification) => !notification.readAt) : notifications),
      [notifications, tab]
   );
   const selected = notifications.find((notification) => notification.id === selectedId) ?? visible[0];
   const unreadCount = notifications.filter((notification) => !notification.readAt).length;

   const updateRead = async (notificationId: string, read: boolean) => {
      try {
         const response = await fetch(
            `/api/notifications/${encodeURIComponent(notificationId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'PATCH',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ read }),
            }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to update notification.'));
         setRead(notificationId, read);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to update notification.');
      }
   };

   const openNotification = (notificationId: string, isUnread: boolean) => {
      select(notificationId);
      if (isUnread) void updateRead(notificationId, true);
   };

   const markAllRead = async () => {
      if (busy || unreadCount === 0) return;
      setBusy(true);
      try {
         const response = await fetch(
            `/api/notifications?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'PATCH', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to mark notifications read.'));
         markAllReadLocal();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to mark notifications read.');
      } finally {
         setBusy(false);
      }
   };

   const deleteOne = async (notificationId: string) => {
      try {
         const response = await fetch(
            `/api/notifications/${encodeURIComponent(notificationId)}?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to delete notification.'));
         remove(notificationId);
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to delete notification.');
      }
   };

   const deleteScope = async (scope: 'read' | 'all') => {
      if (busy) return;
      setBusy(true);
      try {
         const response = await fetch(
            `/api/notifications?organization=${encodeURIComponent(workspace.organization.slug)}&scope=${scope}`,
            { method: 'DELETE', credentials: 'same-origin' }
         );
         if (!response.ok) throw new Error(await readError(response, 'Unable to clear notifications.'));
         if (scope === 'read') removeReadLocal();
         else clearAllLocal();
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to clear notifications.');
      } finally {
         setBusy(false);
      }
   };

   if (!ready) {
      return <div className="flex h-full items-center justify-center text-sm text-muted-foreground" role="status">Loading inbox…</div>;
   }

   return (
      <div className="flex h-full min-h-0 w-full overflow-hidden">
         <section className="flex w-full min-w-0 flex-col border-r md:w-[420px] md:shrink-0">
            <div className="flex h-12 items-center justify-between border-b px-4">
               <div className="flex items-center gap-1">
                  {TABS.map((candidate) => (
                     <button
                        key={candidate}
                        className={cn(
                           'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
                           tab === candidate ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
                        )}
                        onClick={() => setTab(candidate)}
                     >
                        {candidate}{candidate === 'unread' && unreadCount > 0 ? ` ${unreadCount}` : ''}
                     </button>
                  ))}
               </div>
               <div className="flex items-center gap-1">
                  <Button size="xs" variant="ghost" onClick={() => void markAllRead()} disabled={busy || unreadCount === 0}>
                     <CheckCheck className="size-4" />
                     <span className="sr-only">Mark all read</span>
                  </Button>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button size="xs" variant="ghost"><MoreHorizontal className="size-4" /><span className="sr-only">Inbox actions</span></Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void deleteScope('read')}>Delete read notifications</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => void deleteScope('all')}>Delete all notifications</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
               {visible.length === 0 ? (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                     <InboxIcon className="size-8" />
                     <span>{tab === 'unread' ? 'No unread notifications' : 'Your inbox is clear'}</span>
                  </div>
               ) : (
                  visible.map((notification) => (
                     <button
                        key={notification.id}
                        className={cn(
                           'flex w-full gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/40',
                           selected?.id === notification.id && 'bg-accent/50'
                        )}
                        onClick={() => openNotification(notification.id, !notification.readAt)}
                     >
                        <Avatar className="mt-0.5 size-8 shrink-0">
                           <AvatarImage src={notification.actor?.avatarUrl ?? undefined} alt={notification.actor?.displayName ?? 'Workspace'} />
                           <AvatarFallback>{(notification.actor?.displayName ?? 'A').slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                           <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{notification.actor?.displayName ?? 'Workspace'}</span>
                              {!notification.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                                 {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                           </span>
                           <span className="mt-0.5 block truncate text-xs text-muted-foreground">{notification.content}</span>
                           {notification.issue && <span className="mt-1 block truncate text-xs">{notification.issue.identifier} · {notification.issue.title}</span>}
                        </span>
                     </button>
                  ))
               )}
            </div>
         </section>

         <section className="hidden min-w-0 flex-1 overflow-y-auto md:block">
            {selected ? (
               <div className="mx-auto flex max-w-3xl flex-col gap-6 px-8 py-10">
                  <div className="flex items-start justify-between gap-4">
                     <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                           <AvatarImage src={selected.actor?.avatarUrl ?? undefined} alt={selected.actor?.displayName ?? 'Workspace'} />
                           <AvatarFallback>{(selected.actor?.displayName ?? 'A').slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                           <div className="font-medium">{selected.actor?.displayName ?? 'Workspace'}</div>
                           <div className="text-sm text-muted-foreground">{selected.content}</div>
                        </div>
                     </div>
                     <Button size="icon" variant="ghost" onClick={() => void deleteOne(selected.id)} aria-label="Delete notification">
                        <Trash2 className="size-4" />
                     </Button>
                  </div>

                  {selected.issue && (
                     <div className="rounded-lg border bg-card p-5">
                        <div className="text-xs font-medium text-muted-foreground">{selected.issue.identifier}</div>
                        <div className="mt-1 text-lg font-medium">{selected.issue.title}</div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                           <span>{selected.issue.statusName}</span><span>·</span><span>{selected.issue.priorityId}</span>
                        </div>
                        <Button asChild className="mt-5" size="sm">
                           <Link href={issueHref(orgId, selected.issue.identifier)}>Open issue</Link>
                        </Button>
                     </div>
                  )}

                  <div className="flex items-center gap-2">
                     <Button size="sm" variant="outline" onClick={() => void updateRead(selected.id, !selected.readAt)}>
                        {selected.readAt ? 'Mark unread' : 'Mark read'}
                     </Button>
                     <span className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.createdAt))}
                     </span>
                  </div>
               </div>
            ) : (
               <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a notification</div>
            )}
         </section>
      </div>
   );
}