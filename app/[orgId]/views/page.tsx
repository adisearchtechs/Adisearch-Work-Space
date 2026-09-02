import ViewsRuntime from '@/components/common/views/views-runtime';
import Header from '@/components/layout/headers/views/header';
import MainLayout from '@/components/layout/main-layout';

export default function ViewsPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <ViewsRuntime />
      </MainLayout>
   );
}
