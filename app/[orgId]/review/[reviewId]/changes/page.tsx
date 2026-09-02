import ReviewsRuntime from '@/components/common/reviews/reviews-runtime';
import MainLayout from '@/components/layout/main-layout';

export default async function ReviewDiffPage({ params }: { params: Promise<{ reviewId: string }> }) {
   const { reviewId } = await params;
   return (
      <MainLayout>
         <ReviewsRuntime selectedReviewId={reviewId} section="diff" />
      </MainLayout>
   );
}
