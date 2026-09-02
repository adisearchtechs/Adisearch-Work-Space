'use client';

import { formatDistanceToNow } from 'date-fns';
import {
   Ban,
   CircleDot,
   GitPullRequestArrow,
   Link2,
   PenLine,
   Plus,
   RefreshCcw,
   SmilePlus,
   Tag,
   Unlock,
} from 'lucide-react';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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

export function ActivityFeed({ activity, issueId }: { activity: ActivityItem[]; issueId: string }) {
   const workspace = useWorkspace();
   const [demoItems, setDemoItems] = useState<ActivityItem[]>(activity);
   const [comments, setComments] = useState<IssueCommentDto[]>([]);
   const [draft, setDraft] = useState('');
   const [loading, setLoading] = useState(false);
   const [posting, setPosting] = useState(false);
   const [canWrite, setCanWrite] = useState(workspace.user.role !== 'guest');
   const currentUser = users[0];
   const endpoint = `/api/issue-comments?organization=${encodeURIComponent(workspace.organization.slug)}&issueId=${encodeURIComponent(issueId)}`;

   useEffect(() => {
      if (!workspace.configured) setDemoItems(activity);
   }, [activity, workspace.configured]);

   const refresh = useCallback(async (signal?: AbortSignal) => {
      if (!workspace.configured) return;
      setLoading(true);
      try {
         const response = await fetch(endpoint, {
            credentials: 'same-origin',
            signal,
            headers: { Accept: 'application/json' },
         });
         if (!response.ok) throw new Error(String(response.status));
         const payload = (await response.json()) as {
            comments: IssueCommentDto[];
            canWrite: boolean;
         };
         setComments(payload.comments);
         setCanWrite(payload.canWrite);
      } catch (error) {
         if (error instanceof DOMException && error.name === 'AbortError') return;
         toast.error('Unable to load issue comments.');
      } finally {
         setLoading(false);
      }
   }, [endpoint, workspace.configured]);

   useEffect(() => {
      if (!workspace.configured) return;
      const controller = new AbortController();
      void refresh(controller.signal);
      return () => controller.abort();
   }, [refresh, workspace.configured]);

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

   const renderedItems = workspace.configured ? comments : demoItems;

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
            {loading && <p className="py-3 text-sm text-muted-foreground">Loading comments…</p>}
            {!loading && renderedItems.length === 0 && workspace.configured && (
               <p className="py-3 text-sm text-muted-foreground">No comments yet.</p>
            )}
            {workspace.configured
               ? comments.map((comment) => (
                    <PersistentCommentCard key={comment.id} comment={comment} />
                 ))
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
