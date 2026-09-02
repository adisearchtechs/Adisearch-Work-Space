'use client';

import { Bell, BellOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { useIssueSubscriptionsStore } from '@/store/issue-subscriptions-store';

export function IssueSubscriptionButton({ issueId }: { issueId: string }) {
   const workspace = useWorkspace();
   const issueIds = useIssueSubscriptionsStore((state) => state.issueIds);
   const loaded = useIssueSubscriptionsStore((state) => state.loaded);
   const setSubscribed = useIssueSubscriptionsStore((state) => state.setSubscribed);
   const [saving, setSaving] = useState(false);

   if (!workspace.configured) return null;

   const subscribed = issueIds.includes(issueId);

   async function toggleSubscription() {
      if (!loaded || saving) return;
      const nextSubscribed = !subscribed;
      setSaving(true);
      setSubscribed(issueId, nextSubscribed);

      try {
         const response = await fetch(
            `/api/issues/${encodeURIComponent(issueId)}/subscription?organization=${encodeURIComponent(workspace.organization.slug)}`,
            { method: nextSubscribed ? 'POST' : 'DELETE' }
         );
         if (!response.ok) throw new Error('Unable to update issue subscription.');
      } catch {
         setSubscribed(issueId, subscribed);
         toast.error('The issue subscription could not be updated.');
      } finally {
         setSaving(false);
      }
   }

   return (
      <button
         type="button"
         onClick={toggleSubscription}
         disabled={!loaded || saving}
         aria-pressed={subscribed}
         aria-label={subscribed ? 'Unsubscribe from issue' : 'Subscribe to issue'}
         title={subscribed ? 'Unsubscribe from issue' : 'Subscribe to issue'}
         className="hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
         {subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      </button>
   );
}
