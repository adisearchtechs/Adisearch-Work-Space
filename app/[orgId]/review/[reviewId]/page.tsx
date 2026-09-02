import ReviewsRuntime from '@/components/common/reviews/reviews-runtime';
import MainLayout from '@/components/layout/main-layout';

export default async function ReviewOverviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
   const { reviewId } = await params;
   return (
      <MainLayout>
         <ReviewsRuntime selectedReviewId={reviewId} section="overview" />
      </MainLayout>
   );
}
