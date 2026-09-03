import { redirect } from 'next/navigation';
import { WorkspacePortfolioDashboard } from '@/components/common/workspace/workspace-portfolio-dashboard';
import Header from '@/components/layout/headers/workspace-overview/header';
import MainLayout from '@/components/layout/main-layout';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export default async function OrgIdPage({ params }: { params: Promise<{ orgId: string }> }) {
   const { orgId } = await params;

   if (!isSupabaseConfigured()) {
      redirect(`/${orgId}/team/CORE/all`);
   }

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <WorkspacePortfolioDashboard />
      </MainLayout>
   );
}
