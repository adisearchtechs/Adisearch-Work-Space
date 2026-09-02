'use client';

import { create } from 'zustand';

type IssueSubscriptionsState = {
   issueIds: string[];
   loaded: boolean;
   replaceIssueIds: (issueIds: string[]) => void;
   setSubscribed: (issueId: string, subscribed: boolean) => void;
   reset: () => void;
};

export const useIssueSubscriptionsStore = create<IssueSubscriptionsState>((set) => ({
   issueIds: [],
   loaded: false,
   replaceIssueIds: (issueIds) => set({ issueIds: [...new Set(issueIds)], loaded: true }),
   setSubscribed: (issueId, subscribed) =>
      set((state) => ({
         issueIds: subscribed
            ? state.issueIds.includes(issueId)
               ? state.issueIds
               : [issueId, ...state.issueIds]
            : state.issueIds.filter((candidate) => candidate !== issueId),
      })),
   reset: () => set({ issueIds: [], loaded: false }),
}));
