import { InitiativeDetailsRoot } from '@/components/common/initiatives/initiative-details-root';
import Header from '@/components/layout/headers/initiative/header';
import MainLayout from '@/components/layout/main-layout';

export default async function InitiativeDetailsPage({
   params,
}: {
   params: Promise<{ initiativeId: string }>;
}) {
   const { initiativeId } = await params;
   return (
      <MainLayout header={<Header />} headersNumber={2}>
         <InitiativeDetailsRoot initiativeId={initiativeId} />
      </MainLayout>
   );
}
