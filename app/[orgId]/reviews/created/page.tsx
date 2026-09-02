import ReviewsRuntime from '@/components/common/reviews/reviews-runtime';
import MainLayout from '@/components/layout/main-layout';

export default function CreatedReviewsPage() {
   return (
      <MainLayout>
         <ReviewsRuntime listTab="created" />
      </MainLayout>
   );
}
