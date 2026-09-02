'use client';

import Reviews from '@/components/common/reviews/reviews';
import PersistentReviews from '@/components/common/reviews/persistent-reviews';
import { useWorkspace } from '@/components/providers/workspace-provider';

export type ReviewsListTab = 'for-you' | 'created';
export type ReviewsSection = 'overview' | 'guide' | 'diff';

export default function ReviewsRuntime({
   listTab = 'for-you',
   selectedReviewId,
   section = 'overview',
}: {
   listTab?: ReviewsListTab;
   selectedReviewId?: string;
   section?: ReviewsSection;
}) {
   const workspace = useWorkspace();
   return workspace.configured ? (
      <PersistentReviews listTab={listTab} selectedReviewId={selectedReviewId} section={section} />
   ) : (
      <Reviews listTab={listTab} selectedReviewId={selectedReviewId} section={section} />
   );
}
