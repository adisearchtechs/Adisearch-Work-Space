import ViewDetailsRuntime from '@/components/common/views/view-details-runtime';
import Header from '@/components/layout/headers/view/header-runtime';
import MainLayout from '@/components/layout/main-layout';

export default async function ViewDetailsPage({
   params,
}: {
   params: Promise<{ viewId: string }>;
}) {
   const { viewId } = await params;
   return (
      <MainLayout header={<Header />} headersNumber={2}>
         <ViewDetailsRuntime viewId={viewId} />
      </MainLayout>
   );
}
