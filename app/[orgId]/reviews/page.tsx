import ReviewsRuntime from '@/components/common/reviews/reviews-runtime';
import MainLayout from '@/components/layout/main-layout';

export default function ReviewsPage() {
   return (
      <MainLayout>
         <ReviewsRuntime listTab="for-you" />
      </MainLayout>
   );
}
