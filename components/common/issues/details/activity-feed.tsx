'use client';

import { formatDistanceToNow } from 'date-fns';
import {
   Ban,
   CalendarDays,
   CircleDot,
   FolderKanban,
   GitPullRequestArrow,
   Link2,
   PenLine,
   Plus,
   RefreshCcw,
   SmilePlus,
   Tag,
   Unlock,
   UserRound,
} from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type {
   IssueActivityEventDto,
   IssueActivityEventType,
} from '@/lib/issue-activity/contracts';
import type { IssueCommentDto } from '@/lib/issue-comments/contracts';
import { ActivityItem } from '@/mock-data/issue-details';
import { users } from '@/mock-data/users';
import { ContentBlocks } from './content-blocks';

const EVENT_ICONS: Record<string, ReactNode> = {
   created: <PenLine className="size-3.5" />,
   status: <CircleDot className="size-3.5" />,
   label: <Tag className="size-3.5" />,
   priority: <CircleDot className="size-3.5" />,
   cycle: <RefreshCcw className="size-3.5" />,
   blocked: <Ban className="size-3.5" />,
   unblocked: <Unlock className="size-3.5" />,
   related: <Link2 className="size-3.5" />,
   pr: <GitPullRequestArrow className="size-3.5" />,
};

const PERSISTENT_EVENT_ICONS: Record<IssueActivityEventType, ReactNode> = {
   created: <PenLine className="size-3.5" />,
   title_changed: <PenLine className="size-3.5" />,
   description_changed: <PenLine className="size-3.5" />,
   status_changed: <CircleDot className="size-3.5" />,
   priority_changed: <CircleDot className="size-3.5" />,
   assignee_changed: <UserRound className="size-3.5" />,
   project_changed: <FolderKanban className="size-3.5" />,
   cycle_changed: <RefreshCcw className="size-3.5" />,
   due_date_changed: <CalendarDays className="size-3.5" />,
   relation_added: <Link2 className="size-3.5" />,
   relation_removed: <UnlinkIcon />,
};

function UnlinkIcon() {
   return <Link2 className="size-3.5 opacity-60" />;
}

function asRecord(value: unknown): Record<string, unknown> | null {
   return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
}

function valueLabel(value: unknown, fallback: string) {
   if (typeof value === 'string' && value.trim()) return value;
   if (typeof value === 'number') return String(value);
   const record = asRecord(value);
   return record && typeof record.label === 'string' && record.label.trim()
      ? record.label
      : fallback;
}

function priorityLabel(value: unknown) {
   const raw = valueLabel(value, 'No priority');
   if (raw === 'no-priority') return 'No priority';
   return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function relationText(event: IssueActivityEventDto) {
   const details = event.details;
   const relationType = typeof details.relationType === 'string' ? details.relationType : '';
   const direction = typeof details.direction === 'string' ? details.direction : '';
   const counterparty = asRecord(details.counterparty);
   const counterpartyLabel =
      (counterparty && typeof counterparty.identifier === 'string' && counterparty.identifier) ||
      (counterparty && typeof counterparty.title === 'string' && counterparty.title) ||
      'another issue';
   const added = event.eventType === 'relation_added';

   if (relationType === 'parent') {
      return direction === 'source'
         ? `${added ? 'added' : 'removed'} ${counterpartyLabel} ${added ? 'as a sub-issue' : 'from sub-issues'}`
         : `${added ? 'set' : 'removed'} ${counterpartyLabel} ${added ? 'as the parent issue' : 'as the parent issue'}`;
   }
   if (relationType === 'blocks') {
      return direction === 'source'
         ? `${added ? 'marked' : 'unmarked'} ${counterpartyLabel} ${added ? 'as blocked by this issue' : 'as blocked by this issue'}`
         : `${added ? 'marked this issue as blocked by' : 'removed the blocking dependency on'} ${counterpartyLabel}`;
   }
   return `${added ? 'related this issue to' : 'removed the relation to'} ${counterpartyLabel}`;
}

function describePersistentEvent(event: IssueActivityEventDto) {
   const details = event.details;
   switch (event.eventType) {
      case 'created':
         return 'created the issue';
      case 'title_changed':
         return `changed the title to “${valueLabel(details.to, 'Untitled')}”`;
      case 'description_changed':
         return 'updated the description';
      case 'status_changed':
         return `changed status from ${valueLabel(details.from, 'Unknown')} to ${valueLabel(details.to, 'Unknown')}`;
      case 'priority_changed':
         return `changed priority from ${priorityLabel(details.from)} to ${priorityLabel(details.to)}`;
      case 'assignee_changed':
         return `changed assignee from ${valueLabel(details.from, 'Unassigned')} to ${valueLabel(details.to, 'Unassigned')}`;
      case 'project_changed':
         return `changed project from ${valueLabel(details.from, 'No project')} to ${valueLabel(details.to, 'No project')}`;
      case 'cycle_changed':
         return `changed cycle from ${valueLabel(details.from, 'No cycle')} to ${valueLabel(details.to, 'No cycle')}`;
      case 'due_date_changed':
         return `changed due date from ${valueLabel(details.from, 'No due date')} to ${valueLabel(details.to, 'No due date')}`;
      case 'relation_added':
      case 'relation_removed':
         return relationText(event);
   }
}

function EventRow({ item }: { item: Extract<ActivityItem, { kind: 'event' }> }) {
   return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-1.5">
         <span className="size-5 rounded-full bg-accent flex items-center justify-center shrink-0">
            {EVENT_ICONS[item.event] ?? <CircleDot className="size-3.5" />}
         </span>
         <span className="min-w-0 truncate">
            <span className="text-foreground/90 font-medium">{item.actor.name}</span> {item.text}
         </span>
         <span className="shrink-0 text-xs">· {item.timeAgo}</span>
      </div>
   );
}

function CommentCard({ item }: { item: Extract<ActivityItem, { kind: 'comment' }> }) {
   return (
      <div className="my-2 rounded-lg border border-border/60 bg-container p-3.5">
         <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="size-5">
               <AvatarImage src={item.actor.avatarUrl} alt={item.actor.name} />
               <AvatarFallback>{item.actor.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{item.actor.name}</span>
            <span className="text-xs text-muted-foreground">{item.timeAgo}</span>
         </div>
         <div className="text-sm [&_p]:my-1.5">
            <ContentBlocks blocks={item.body} />
         </div>
         <div className="flex items-center gap-1.5 mt-1">
            {item.reactions?.map((reaction) => (
               <span
                  key={reaction.emoji}
                  className="inline-flex items-center gap-1 text-xs bg-accent/60 border border-border/60 rounded-full px-2 py-0.5"
               >
                  {reaction.emoji} {reaction.count}
               </span>
            ))}
            <button className="text-muted-foreground hover:text-foreground">
               <SmilePlus className="size-3.5" />
            </button>
         </div>
      </div>
   );
}

function PersistentCommentCard({ comment }: { comment: IssueCommentDto }) {
   return (
      <div className="my-2 rounded-lg border border-border/60 bg-container p-3.5">
         <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="size-5">
               {comment.author.avatarUrl && (
                  <AvatarImage src={comment.author.avatarUrl} alt={comment.author.displayName} />
               )}
               <AvatarFallback>{comment.author.displayName[0] ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{comment.author.displayName}</span>
            <span className="text-xs text-muted-foreground">
               {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
         </div>
         <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.body}</p>
      </div>
   );
}

function PersistentEventRow({ event }: { event: IssueActivityEventDto }) {
   return (
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground py-1.5">
         <Avatar className="size-5 shrink-0">
            {event.actor.avatarUrl && (
               <AvatarImage src={event.actor.avatarUrl} alt={event.actor.displayName} />
            )}
            <AvatarFallback>{event.actor.displayName[0] ?? '?'}</AvatarFallback>
         </Avatar>
         <span className="size-5 rounded-full bg-accent flex items-center justify-center shrink-0">
            {PERSISTENT_EVENT_ICONS[event.eventType]}
         </span>
         <span className="min-w-0 truncate">
            <span className="text-foreground/90 font-medium">{event.actor.displayName}</span>{' '}
            {describePersistentEvent(event)}
         </span>
         <span className="shrink-0 text-xs">
            · {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
         </span>
      </div>
   );
}

type PersistentTimelineItem =
   | { kind: 'event'; id: string; createdAt: string; event: IssueActivityEventDto }
   | { kind: 'comment'; id: string; createdAt: string; comment: IssueCommentDto };

export function ActivityFeed({ activity, issueId }: { activity: ActivityItem[]; issueId: string }) {
   const workspace = useWorkspace();
   const [demoItems, setDemoItems] = useState<ActivityItem[]>(activity);
   const [comments, setComments] = useState<IssueCommentDto[]>([]);
   const [events, setEvents] = useState<IssueActivityEventDto[]>([]);
   const [draft, setDraft] = useState('');
   const [loading, setLoading] = useState(false);
   const [posting, setPosting] = useState(false);
   const [canWrite, setCanWrite] = useState(workspace.user.role !== 'guest');
   const currentUser = users[0];
   const commentsEndpoint = `/api/issue-comments?organization=${encodeURIComponent(workspace.organization.slug)}&issueId=${encodeURIComponent(issueId)}`;
   const activityEndpoint = `/api/issue-activity?organization=${encodeURIComponent(workspace.organization.slug)}&issueId=${encodeURIComponent(issueId)}`;

   useEffect(() => {
      if (!workspace.configured) setDemoItems(activity);
   }, [activity, workspace.configured]);

   const refresh = useCallback(async (signal?: AbortSignal) => {
      if (!workspace.configured) return;
      setLoading(true);
      try {
         const [commentsResponse, activityResponse] = await Promise.all([
            fetch(commentsEndpoint, {
               credentials: 'same-origin',
               signal,
               headers: { Accept: 'application/json' },
            }),
            fetch(activityEndpoint, {
               credentials: 'same-origin',
               signal,
               headers: { Accept: 'application/json' },
            }),
         ]);
         if (!commentsResponse.ok || !activityResponse.ok) {
            throw new Error(String(!commentsResponse.ok ? commentsResponse.status : activityResponse.status));
         }
         const [commentPayload, activityPayload] = (await Promise.all([
            commentsResponse.json(),
            activityResponse.json(),
         ])) as [
            { comments: IssueCommentDto[]; canWrite: boolean },
            { events: IssueActivityEventDto[] },
         ];
         setComments(commentPayload.comments);
         setEvents(activityPayload.events);
         setCanWrite(commentPayload.canWrite);
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError') return;
         toast.error('Unable to load issue activity.');
      } finally {
         setLoading(false);
      }
   }, [activityEndpoint, commentsEndpoint, workspace.configured]);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      void refresh(controller.signal);
      return () => controller.abort();
   }, [refresh, workspace.configured]);

   const persistentItems = useMemo<PersistentTimelineItem[]>(
      () =>
         [
            ...events.map((event) => ({
               kind: 'event' as const,
               id: event.id,
               createdAt: event.createdAt,
               event,
            })),
            ...comments.map((comment) => ({
               kind: 'comment' as const,
               id: comment.id,
               createdAt: comment.createdAt,
               comment,
            })),
         ].sort(
            (left, right) =>
               new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
         ),
      [comments, events]
   );

   const submitComment = async () => {
      const text = draft.trim();
      if (!text || posting) return;

      if (!workspace.configured) {
         setDemoItems((previous) => [
            ...previous,
            {
               kind: 'comment',
               id: `local-${previous.length}`,
               actor: currentUser,
               timeAgo: 'just now',
               body: [{ type: 'paragraph', text }],
            },
         ]);
         setDraft('');
         return;
      }

      if (!canWrite) return;
      setPosting(true);
      try {
         const response = await fetch(
            `/api/issue-comments?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
               body: JSON.stringify({ issueId, body: text }),
            }
         );
         const payload = (await response.json().catch(() => ({}))) as {
            comment?: IssueCommentDto;
            error?: string;
         };
         if (!response.ok || !payload.comment) {
            throw new Error(payload.error || 'Unable to save comment.');
         }
         setComments((previous) => [...previous, payload.comment!]);
         setDraft('');
      } catch (error) {
         toast.error(error instanceof Error ? error.message : 'Unable to save comment.');
      } finally {
         setPosting(false);
      }
   };

   return (
      <div className="mt-10">
         <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold">Activity</h2>
            {!workspace.configured && (
               <button className="text-xs text-muted-foreground hover:text-foreground">
                  Subscribe
               </button>
            )}
         </div>

         <div className="flex flex-col">
            {loading && <p className="py-3 text-sm text-muted-foreground">Loading activity…</p>}
            {!loading && persistentItems.length === 0 && workspace.configured && (
               <p className="py-3 text-sm text-muted-foreground">No activity yet.</p>
            )}
            {workspace.configured
               ? persistentItems.map((item) =>
                    item.kind === 'event' ? (
                       <PersistentEventRow key={`event-${item.id}`} event={item.event} />
                    ) : (
                       <PersistentCommentCard key={`comment-${item.id}`} comment={item.comment} />
                    )
                 )
               : demoItems.map((item) =>
                    item.kind === 'event' ? (
                       <EventRow key={item.id} item={item} />
                    ) : (
                       <CommentCard key={item.id} item={item} />
                    )
                 )}
         </div>

         {(canWrite || !workspace.configured) && (
            <div className="mt-3 rounded-lg border border-border/60 bg-container p-3 flex flex-col gap-2">
               <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 10000))}
                  onKeyDown={(event) => {
                     if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        void submitComment();
                     }
                  }}
                  placeholder="Leave a comment..."
                  rows={2}
                  className="w-full resize-none bg-transparent outline-none text-sm placeholder:text-muted-foreground"
               />
               <div className="flex items-center justify-between">
                  <Plus className="size-4 text-muted-foreground" />
                  <Button
                     size="xs"
                     onClick={() => void submitComment()}
                     disabled={!draft.trim() || posting}
                  >
                     {posting ? 'Posting…' : 'Comment'}
                  </Button>
               </div>
            </div>
         )}
      </div>
   );
}
