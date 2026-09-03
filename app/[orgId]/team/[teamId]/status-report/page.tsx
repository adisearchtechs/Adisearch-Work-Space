import TeamStatusReport from '@/components/common/teams/team-status-report';
import Header from '@/components/layout/headers/team/header';
import MainLayout from '@/components/layout/main-layout';

export default function TeamStatusReportPage() {
   return (
      <MainLayout header={<Header />}>
         <TeamStatusReport />
      </MainLayout>
   );
}
