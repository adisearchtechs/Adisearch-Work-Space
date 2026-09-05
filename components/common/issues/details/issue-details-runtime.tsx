'use client';

import IssueDetails from '@/components/common/issues/details/issue-details';
import { IssueSubscriptionButton } from '@/components/common/issues/issue-subscription-button';
import { AssigneeUser } from '@/components/common/issues/assignee-user';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useIssuesStore } from '@/store/issues-store';
import { Calendar, CircleDot, FolderKanban, Tag, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

function dateLabel(value?: string) {
   if (!value) return 'Not set';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return value;
   return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
   }).format(date);
}

function PersistentIssueDetails() {
   const { orgId, issueId } = useParams<{ orgId: string; issueId: string }>();
   const issues = useIssuesStore((state) => state.issues);
   const loading = useIssuesStore((state) => state.loading);
   const issue = useMemo(
      () => issues.find((candidate) => candidate.identifier === issueId),
      [issueId, issues]
   );

   if (!issue) {
      return (
         <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-sm text-muted-foreground">
            <p>{loading ? 'Loading issue…' : `Issue ${issueId} not found.`}</p>
            {!loading && (
               <Link href={`/${orgId}/my-issues`} className="text-foreground underline underline-offset-4">
                  Back to My Issues
               </Link>
            )}
         </div>
      );
   }

   return (
      <div className="h-full w-full overflow-y-auto">
         <div className="mx-auto max-w-4xl px-6 py-10 lg:px-10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
               <span className="font-medium text-foreground">{issue.identifier}</span>
               <span>·</span>
               <span className="inline-flex items-center gap-1.5">
                  <issue.status.icon />
                  {issue.status.name}
               </span>
            </div>

            <h1 className="mt-3 text-3xl font-semibold leading-tight text-balance">{issue.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
               <IssueSubscriptionButton issueId={issue.id} />
            </div>

            <section className="mt-8 rounded-lg border bg-container p-5">
               <h2 className="text-sm font-medium">Description</h2>
               <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {issue.description?.trim() || 'No description has been recorded for this issue yet.'}
               </p>
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-2">
               <div className="rounded-lg border bg-container p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <CircleDot className="size-3.5" /> Status
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                     <issue.status.icon /> {issue.status.name}
                  </div>
               </div>

               <div className="rounded-lg border bg-container p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <UserRound className="size-3.5" /> Assignee
                  </div>
                  <div className="mt-2 text-sm">
                     {issue.assignee ? <AssigneeUser user={issue.assignee} /> : 'Unassigned'}
                  </div>
               </div>

               <div className="rounded-lg border bg-container p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <FolderKanban className="size-3.5" /> Project
                  </div>
                  <div className="mt-2 text-sm font-medium">
                     {issue.project ? issue.project.name : 'No project'}
                  </div>
               </div>

               <div className="rounded-lg border bg-container p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <Calendar className="size-3.5" /> Dates
                  </div>
                  <div className="mt-2 text-sm">
                     Created {dateLabel(issue.createdAt)} · Due {dateLabel(issue.dueDate)}
                  </div>
               </div>
            </section>

            <section className="mt-6 rounded-lg border bg-container p-4">
               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="size-3.5" /> Labels
               </div>
               <div className="mt-3 flex flex-wrap gap-2">
                  {issue.labels.length === 0 ? (
                     <span className="text-sm text-muted-foreground">No labels</span>
                  ) : (
                     issue.labels.map((label) => (
                        <span
                           key={label.id}
                           className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
                        >
                           <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                           {label.name}
                        </span>
                     ))
                  )}
               </div>
            </section>

            <section className="mt-6 rounded-lg border border-dashed p-5">
               <h2 className="text-sm font-medium">Collaboration features</h2>
               <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Reactions, file attachments, persistent sub-issues, and a full issue event timeline
                  are not implemented yet. Their prototype controls are intentionally hidden in configured
                  workspaces until those features have real storage and authorization.
               </p>
            </section>
         </div>
      </div>
   );
}

export default function IssueDetailsRuntime() {
   const workspace = useWorkspace();
   return workspace.configured ? <PersistentIssueDetails /> : <IssueDetails />;
}
