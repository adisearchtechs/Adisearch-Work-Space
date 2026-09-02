'use client';

import { Issue, issueCreatorIndex } from '@/mock-data/issues';
import { users } from '@/mock-data/users';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

export const MY_ISSUES_TABS = ['assigned', 'created', 'subscribed', 'activity'] as const;
export type MyIssuesTab = (typeof MY_ISSUES_TABS)[number];

export const MY_ISSUES_TAB_ITEMS: { label: string; value: MyIssuesTab }[] = [
   { label: 'Assigned', value: 'assigned' },
   { label: 'Created', value: 'created' },
   { label: 'Subscribed', value: 'subscribed' },
   { label: 'Activity', value: 'activity' },
];

/** The "current" user of the unconfigured demo workspace. */
export const ME = users[0];

/** Shared tab state (URL-backed) between the header and the page body. */
export function useMyIssuesTab() {
   return useQueryState('tab', parseAsStringLiteral(MY_ISSUES_TABS).withDefault('assigned'));
}

const isDemoCreatedByMe = (issue: Issue): boolean => issueCreatorIndex(issue, users.length) === 0;
const isDemoSubscribed = (issue: Issue): boolean =>
   issue.assignee?.id === ME.id || isDemoCreatedByMe(issue) || issueCreatorIndex(issue, 7) === 3;

type ConfiguredMyIssuesScope = {
   configured: true;
   userId: string;
   subscriptionIds: ReadonlySet<string>;
};

type DemoMyIssuesScope = { configured: false };

/** Issues shown by each My issues tab. Demo-only heuristics never run for configured workspaces. */
export function scopeMyIssues(
   issues: Issue[],
   tab: MyIssuesTab,
   scope: ConfiguredMyIssuesScope | DemoMyIssuesScope
): Issue[] {
   if (!scope.configured) {
      switch (tab) {
         case 'assigned':
            return issues.filter((issue) => issue.assignee?.id === ME.id);
         case 'created':
            return issues.filter(isDemoCreatedByMe);
         case 'subscribed':
            return issues.filter(isDemoSubscribed);
         case 'activity':
         default:
            return issues
               .filter(isDemoSubscribed)
               .slice()
               .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
   }

   const isAssigned = (issue: Issue) => issue.assignee?.id === scope.userId;
   const isCreated = (issue: Issue) => issue.creatorId === scope.userId;
   const isSubscribed = (issue: Issue) => scope.subscriptionIds.has(issue.id);

   switch (tab) {
      case 'assigned':
         return issues.filter(isAssigned);
      case 'created':
         return issues.filter(isCreated);
      case 'subscribed':
         return issues.filter(isSubscribed);
      case 'activity':
      default:
         return issues
            .filter((issue) => isAssigned(issue) || isCreated(issue) || isSubscribed(issue))
            .slice()
            .sort((a, b) =>
               (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt)
            );
   }
}
