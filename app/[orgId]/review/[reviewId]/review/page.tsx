import ReviewsRuntime from '@/components/common/reviews/reviews-runtime';
import MainLayout from '@/components/layout/main-layout';

export default async function ReviewGuidePage({ params }: { params: Promise<{ reviewId: string }> }) {
   const { reviewId } = await params;
   return (
      <MainLayout>
         <ReviewsRuntime selectedReviewId={reviewId} section="guide" />
      </MainLayout>
   );
}
