import IssueDetailsRuntime from '@/components/common/issues/details/issue-details-runtime';
import Header from '@/components/layout/headers/issue/header';
import MainLayout from '@/components/layout/main-layout';

export default function IssueDetailPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <IssueDetailsRuntime />
      </MainLayout>
   );
}
