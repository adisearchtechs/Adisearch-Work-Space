'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, GitPullRequest, Loader2, Plus, UserPlus } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/components/providers/workspace-provider';
import type { ReviewDto } from '@/lib/reviews/contracts';
import type { WorkspaceMemberDto } from '@/lib/workspace-members/contracts';
import { useIssuesStore } from '@/store/issues-store';
import type { ReviewsListTab, ReviewsSection } from './reviews-runtime';
import { cn } from '@/lib/utils';

const STATUS_ORDER = ['open', 'approved', 'closed'] as const;
const STATUS_LABEL: Record<ReviewDto['status'], string> = {
   open: 'Open',
   approved: 'Approved',
   closed: 'Closed',
};

function displayDate(value: string) {
   return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
      new Date(value)
   );
}

async function errorMessage(response: Response, fallback: string) {
   try {
      const payload = (await response.json()) as { error?: string };
      return payload.error || fallback;
   } catch {
      return fallback;
   }
}

export default function PersistentReviews({
   listTab,
   selectedReviewId,
   section,
}: {
   listTab: ReviewsListTab;
   selectedReviewId?: string;
   section: ReviewsSection;
}) {
   const workspace = useWorkspace();
   const router = useRouter();
   const { issues } = useIssuesStore();
   const [reviews, setReviews] = useState<ReviewDto[]>([]);
   const [selectedReview, setSelectedReview] = useState<ReviewDto | null>(null);
   const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
   const [loading, setLoading] = useState(true);
   const [detailLoading, setDetailLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [creating, setCreating] = useState(false);
   const [showCreate, setShowCreate] = useState(false);
   const [comment, setComment] = useState('');
   const [reviewerId, setReviewerId] = useState('');
   const [mutating, setMutating] = useState(false);

   const organization = encodeURIComponent(workspace.organization.slug);
   const canWrite = workspace.user.role !== 'guest';

   const loadList = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const response = await fetch(
            `/api/reviews?organization=${organization}&scope=${encodeURIComponent(listTab)}`,
            { cache: 'no-store' }
         );
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load reviews.'));
         const payload = (await response.json()) as { reviews: ReviewDto[] };
         setReviews(payload.reviews);
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to load reviews.');
         setReviews([]);
      } finally {
         setLoading(false);
      }
   }, [listTab, organization]);

   const loadDetail = useCallback(async () => {
      if (!selectedReviewId) {
         setSelectedReview(null);
         return;
      }
      setDetailLoading(true);
      try {
         const response = await fetch(
            `/api/reviews/${encodeURIComponent(selectedReviewId)}?organization=${organization}`,
            { cache: 'no-store' }
         );
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to load review.'));
         const payload = (await response.json()) as { review: ReviewDto };
         setSelectedReview(payload.review);
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to load review.');
         setSelectedReview(null);
      } finally {
         setDetailLoading(false);
      }
   }, [organization, selectedReviewId]);

   useEffect(() => {
      void loadList();
   }, [loadList]);

   useEffect(() => {
      void loadDetail();
   }, [loadDetail]);

   useEffect(() => {
      if (!selectedReview?.canEdit) return;
      let active = true;
      void fetch(`/api/members?organization=${organization}`, { cache: 'no-store' })
         .then(async (response) => {
            if (!response.ok) throw new Error('Unable to load members.');
            return (await response.json()) as { members: WorkspaceMemberDto[] };
         })
         .then((payload) => {
            if (active) setMembers(payload.members);
         })
         .catch(() => {
            if (active) setMembers([]);
         });
      return () => {
         active = false;
      };
   }, [organization, selectedReview?.canEdit]);

   const groups = useMemo(
      () =>
         STATUS_ORDER.map((status) => ({
            status,
            items: reviews.filter((review) => review.status === status),
         })).filter((group) => group.items.length > 0),
      [reviews]
   );

   async function createReview(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!canWrite) return;
      setCreating(true);
      setError(null);
      const form = new FormData(event.currentTarget);
      const externalNumberRaw = String(form.get('externalNumber') ?? '').trim();
      const checksPassedRaw = String(form.get('checksPassed') ?? '0');
      const checksTotalRaw = String(form.get('checksTotal') ?? '0');
      const issueId = String(form.get('issueId') ?? '');
      try {
         const response = await fetch(`/api/reviews?organization=${organization}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               title: String(form.get('title') ?? ''),
               body: String(form.get('body') ?? ''),
               issueId: issueId || null,
               externalUrl: String(form.get('externalUrl') ?? ''),
               repository: String(form.get('repository') ?? ''),
               externalNumber: externalNumberRaw ? Number(externalNumberRaw) : null,
               targetRef: String(form.get('targetRef') ?? ''),
               sourceRef: String(form.get('sourceRef') ?? ''),
               testPlan: String(form.get('testPlan') ?? ''),
               checksPassed: Number(checksPassedRaw || 0),
               checksTotal: Number(checksTotalRaw || 0),
            }),
         });
         if (!response.ok) throw new Error(await errorMessage(response, 'Unable to create review.'));
         const payload = (await response.json()) as { review: ReviewDto };
         setShowCreate(false);
         await loadList();
         router.push(`/${workspace.organization.slug}/review/${payload.review.id}`);
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Unable to create review.');
      } finally {
         setCreating(false);
      }
   }

   async function runMutation(path: string, init: RequestInit) {
      setMutating(true);
      setError(null);
      try {
         const response = await fetch(path, init);
         if (!response.ok) throw new Error(await errorMessage(response, 'Review update failed.'));
         await Promise.all([loadDetail(), loadList()]);
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : 'Review update failed.');
      } finally {
         setMutating(false);
      }
   }

   async function submitComment(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      if (!selectedReview || !comment.trim() || !canWrite) return;
      const body = comment.trim();
      setComment('');
      await runMutation(
         `/api/reviews/${selectedReview.id}/comments?organization=${organization}`,
         {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ body }),
         }
      );
   }

   const availableReviewers = members.filter(
      (member) => !selectedReview?.reviewers.some((reviewer) => reviewer.user.id === member.id)
   );

   return (
      <div className="w-full h-full flex overflow-hidden">
         <div className="w-[420px] max-w-[45%] shrink-0 border-r h-full flex flex-col bg-container">
            <div className="flex items-center justify-between px-4 h-10 border-b shrink-0">
               <div className="flex items-center gap-2">
                  <SidebarTrigger />
                  <span className="text-sm font-medium">Reviews</span>
               </div>
               {canWrite && (
                  <Button size="xs" variant="ghost" onClick={() => setShowCreate((value) => !value)}>
                     <Plus className="size-3.5" /> New
                  </Button>
               )}
            </div>

            <div className="flex items-center gap-1.5 px-4 py-2 border-b shrink-0">
               <Link
                  href={`/${workspace.organization.slug}/reviews`}
                  className={cn(
                     'px-2.5 py-1 rounded-md border text-xs font-medium',
                     listTab === 'for-you' ? 'bg-accent border-transparent' : 'text-muted-foreground'
                  )}
               >
                  For you
               </Link>
               <Link
                  href={`/${workspace.organization.slug}/reviews/created`}
                  className={cn(
                     'px-2.5 py-1 rounded-md border text-xs font-medium',
                     listTab === 'created' ? 'bg-accent border-transparent' : 'text-muted-foreground'
                  )}
               >
                  Created
               </Link>
            </div>

            {showCreate && (
               <form onSubmit={createReview} className="border-b p-4 space-y-3 bg-sidebar/30 overflow-y-auto max-h-[65%]">
                  <input name="title" required maxLength={240} placeholder="Review title" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  <textarea name="body" maxLength={20000} placeholder="What needs review?" rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y" />
                  <select name="issueId" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                     <option value="">No linked issue</option>
                     {issues.map((issue) => (
                        <option key={issue.id} value={issue.id}>{issue.identifier} — {issue.title}</option>
                     ))}
                  </select>
                  <input name="externalUrl" type="url" placeholder="GitHub PR URL (optional)" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                     <input name="repository" placeholder="owner/repository" className="rounded-md border bg-background px-3 py-2 text-sm" />
                     <input name="externalNumber" type="number" min="1" placeholder="PR #" className="rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <input name="targetRef" placeholder="Target branch" className="rounded-md border bg-background px-3 py-2 text-sm" />
                     <input name="sourceRef" placeholder="Source branch" className="rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <textarea name="testPlan" maxLength={10000} placeholder="Test / release evidence" rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y" />
                  <div className="grid grid-cols-2 gap-2">
                     <input name="checksPassed" type="number" min="0" defaultValue="0" aria-label="Checks passed" className="rounded-md border bg-background px-3 py-2 text-sm" />
                     <input name="checksTotal" type="number" min="0" defaultValue="0" aria-label="Checks total" className="rounded-md border bg-background px-3 py-2 text-sm" />
                  </div>
                  <Button size="sm" type="submit" disabled={creating}>
                     {creating && <Loader2 className="size-4 animate-spin" />} Create review
                  </Button>
               </form>
            )}

            {error && <div className="px-4 py-2 text-xs text-destructive border-b">{error}</div>}

            <div className="flex-1 overflow-y-auto">
               {loading ? (
                  <div className="h-32 flex items-center justify-center text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
               ) : groups.length === 0 ? (
                  <div className="p-6 text-sm text-muted-foreground">{listTab === 'for-you' ? 'No reviews are assigned to you.' : 'You have not created any reviews yet.'}</div>
               ) : (
                  groups.map((group) => (
                     <div key={group.status}>
                        <div className="px-4 py-1.5 text-xs font-medium border-b bg-sidebar/40 flex justify-between">
                           <span>{STATUS_LABEL[group.status]}</span><span className="text-muted-foreground">{group.items.length}</span>
                        </div>
                        {group.items.map((review) => (
                           <Link
                              key={review.id}
                              href={`/${workspace.organization.slug}/review/${review.id}`}
                              className={cn('flex items-center gap-2 px-4 py-2 border-b text-sm hover:bg-sidebar/50', selectedReviewId === review.id && 'bg-accent/60')}
                           >
                              <GitPullRequest className="size-4 shrink-0 text-muted-foreground" />
                              <span className="flex-1 truncate">{review.title}</span>
                              <span className="text-xs text-muted-foreground">{displayDate(review.updatedAt)}</span>
                           </Link>
                        ))}
                     </div>
                  ))
               )}
            </div>
         </div>

         <div className="flex-1 min-w-0 h-full overflow-y-auto">
            {!selectedReviewId ? (
               <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <GitPullRequest className="size-10" />
                  <p className="text-sm">Select a review to inspect its real workspace record.</p>
               </div>
            ) : detailLoading ? (
               <div className="h-full flex items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : !selectedReview ? (
               <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Review not found.</div>
            ) : (
               <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <GitPullRequest className="size-4" />
                        <span>{STATUS_LABEL[selectedReview.status]}</span>
                        <span>·</span>
                        <span>Created by {selectedReview.createdBy.displayName}</span>
                        <span>·</span>
                        <span>Updated {displayDate(selectedReview.updatedAt)}</span>
                     </div>
                     <h1 className="text-2xl font-semibold">{selectedReview.title}</h1>
                     <div className="flex flex-wrap gap-2">
                        {(['overview', 'guide', 'diff'] as const).map((tab) => (
                           <Link
                              key={tab}
                              href={`/${workspace.organization.slug}/review/${selectedReview.id}${tab === 'overview' ? '' : tab === 'guide' ? '/review' : '/changes'}`}
                              className={cn('px-2.5 py-1 rounded-md border text-xs font-medium', section === tab ? 'bg-accent border-transparent' : 'text-muted-foreground')}
                           >
                              {tab === 'overview' ? 'Overview' : tab === 'guide' ? 'Guide' : 'Diff'}
                           </Link>
                        ))}
                     </div>
                  </div>

                  {section !== 'overview' ? (
                     <div className="rounded-lg border p-6 space-y-3">
                        <h2 className="font-semibold">Git-backed {section === 'guide' ? 'review guide' : 'diff'} is not connected yet</h2>
                        <p className="text-sm text-muted-foreground">Configured workspaces do not display deterministic mock code evidence. Phase 25 stores the real review request, reviewers, verdicts, comments and external PR reference only.</p>
                        {selectedReview.externalUrl && (
                           <a href={selectedReview.externalUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                              Open linked pull request <ExternalLink className="size-3.5" />
                           </a>
                        )}
                     </div>
                  ) : (
                     <>
                        <section className="space-y-3">
                           <h2 className="font-semibold">Summary</h2>
                           <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{selectedReview.body || 'No summary was provided.'}</p>
                        </section>

                        <section className="grid sm:grid-cols-2 gap-3">
                           <div className="rounded-lg border p-4 space-y-2 text-sm">
                              <h3 className="font-medium">External reference</h3>
                              {selectedReview.externalUrl ? (
                                 <a href={selectedReview.externalUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                                    {selectedReview.repository || 'Linked review'}{selectedReview.externalNumber ? ` #${selectedReview.externalNumber}` : ''}<ExternalLink className="size-3.5" />
                                 </a>
                              ) : <span className="text-muted-foreground">No external PR linked.</span>}
                              {(selectedReview.targetRef || selectedReview.sourceRef) && <p className="text-xs text-muted-foreground font-mono">{selectedReview.targetRef || 'target'} ← {selectedReview.sourceRef || 'source'}</p>}
                           </div>
                           <div className="rounded-lg border p-4 space-y-2 text-sm">
                              <h3 className="font-medium">Release checks</h3>
                              <div className="flex items-center gap-2"><CheckCircle2 className="size-4" /> {selectedReview.checksPassed} / {selectedReview.checksTotal} passed</div>
                              {selectedReview.issue && (
                                 <Link href={`/${workspace.organization.slug}/issue/${selectedReview.issue.identifier}`} className="text-primary hover:underline">{selectedReview.issue.identifier} — {selectedReview.issue.title}</Link>
                              )}
                           </div>
                        </section>

                        <section className="space-y-2">
                           <h2 className="font-semibold">Test / release evidence</h2>
                           <p className="rounded-lg border p-4 text-sm whitespace-pre-wrap text-muted-foreground">{selectedReview.testPlan || 'No test plan recorded.'}</p>
                        </section>

                        {selectedReview.canEdit && (
                           <section className="rounded-lg border p-4 space-y-3">
                              <h2 className="font-semibold">Creator controls</h2>
                              <div className="flex flex-wrap gap-2">
                                 {STATUS_ORDER.map((status) => (
                                    <Button
                                       key={status}
                                       size="xs"
                                       variant={selectedReview.status === status ? 'secondary' : 'outline'}
                                       disabled={mutating}
                                       onClick={() => void runMutation(`/api/reviews/${selectedReview.id}?organization=${organization}`, {
                                          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
                                       })}
                                    >{STATUS_LABEL[status]}</Button>
                                 ))}
                              </div>
                           </section>
                        )}

                        <section className="space-y-3">
                           <div className="flex items-center justify-between"><h2 className="font-semibold">Reviewers</h2><span className="text-xs text-muted-foreground">{selectedReview.reviewers.length}</span></div>
                           {selectedReview.reviewers.length === 0 && <p className="text-sm text-muted-foreground">No reviewers assigned yet.</p>}
                           {selectedReview.reviewers.map((reviewer) => (
                              <div key={reviewer.user.id} className="rounded-lg border p-3 flex flex-wrap items-center gap-2 text-sm">
                                 <span className="font-medium">{reviewer.user.displayName}</span>
                                 <span className="text-muted-foreground">{reviewer.verdict.replace('_', ' ')}</span>
                                 <span className="flex-1" />
                                 {reviewer.user.id === workspace.user.id && (
                                    <>
                                       <Button size="xs" variant="outline" disabled={mutating} onClick={() => void runMutation(`/api/reviews/${selectedReview.id}/reviewers/${workspace.user.id}?organization=${organization}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verdict: 'approved' }) })}>Approve</Button>
                                       <Button size="xs" variant="outline" disabled={mutating} onClick={() => void runMutation(`/api/reviews/${selectedReview.id}/reviewers/${workspace.user.id}?organization=${organization}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ verdict: 'changes_requested' }) })}>Request changes</Button>
                                    </>
                                 )}
                                 {selectedReview.canEdit && reviewer.user.id !== workspace.user.id && (
                                    <Button size="xs" variant="ghost" disabled={mutating} onClick={() => void runMutation(`/api/reviews/${selectedReview.id}/reviewers/${reviewer.user.id}?organization=${organization}`, { method: 'DELETE' })}>Remove</Button>
                                 )}
                              </div>
                           ))}
                           {selectedReview.canEdit && availableReviewers.length > 0 && (
                              <div className="flex gap-2">
                                 <select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} className="flex-1 rounded-md border bg-background px-3 py-2 text-sm">
                                    <option value="">Choose reviewer</option>
                                    {availableReviewers.map((member) => <option key={member.id} value={member.id}>{member.displayName} ({member.role})</option>)}
                                 </select>
                                 <Button size="sm" variant="outline" disabled={!reviewerId || mutating} onClick={() => {
                                    const nextReviewer = reviewerId;
                                    setReviewerId('');
                                    void runMutation(`/api/reviews/${selectedReview.id}/reviewers?organization=${organization}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: nextReviewer }) });
                                 }}><UserPlus className="size-4" /> Assign</Button>
                              </div>
                           )}
                        </section>

                        <section className="space-y-3">
                           <div className="flex items-center justify-between"><h2 className="font-semibold">Discussion</h2><span className="text-xs text-muted-foreground">{selectedReview.comments.length}</span></div>
                           {selectedReview.comments.map((entry) => (
                              <div key={entry.id} className="rounded-lg border p-3 text-sm space-y-1">
                                 <div className="flex gap-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">{entry.author?.displayName || 'Former member'}</span><span>{displayDate(entry.createdAt)}</span></div>
                                 <p className="whitespace-pre-wrap">{entry.body}</p>
                              </div>
                           ))}
                           {canWrite && (
                              <form onSubmit={submitComment} className="flex gap-2">
                                 <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={10000} placeholder="Add a review note…" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm" />
                                 <Button type="submit" size="sm" disabled={!comment.trim() || mutating}>Comment</Button>
                              </form>
                           )}
                        </section>
                     </>
                  )}
               </div>
            )}
         </div>
      </div>
   );
}
