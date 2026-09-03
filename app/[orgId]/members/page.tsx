import MembersRuntime from '@/components/common/members/members-runtime';
import Header from '@/components/layout/headers/members/header';
import MainLayout from '@/components/layout/main-layout';

export default function MembersPage() {
   return (
      <MainLayout header={<Header />}>
         <MembersRuntime />
      </MainLayout>
   );
}
