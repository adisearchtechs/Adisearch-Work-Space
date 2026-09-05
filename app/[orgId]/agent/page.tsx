import AgentRuntime from '@/components/common/agent/agent-runtime';
import Header from '@/components/layout/headers/agent/header';
import MainLayout from '@/components/layout/main-layout';

export default function AgentPage() {
   return (
      <MainLayout header={<Header />} headersNumber={1}>
         <AgentRuntime />
      </MainLayout>
   );
}
