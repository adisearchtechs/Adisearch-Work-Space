import { InitiativeDetailsRoot } from '@/components/common/initiatives/initiative-details-root';
import { InitiativeHeaderRoot } from '@/components/layout/headers/initiative/header-root';
import MainLayout from '@/components/layout/main-layout';

export default async function InitiativeDetailsPage({
   params,
}: {
   params: Promise<{ initiativeId: string }>;
}) {
   const { initiativeId } = await params;
   return (
      <MainLayout header={<InitiativeHeaderRoot />} headersNumber={2}>
         <InitiativeDetailsRoot initiativeId={initiativeId} />
      </MainLayout>
   );
}
