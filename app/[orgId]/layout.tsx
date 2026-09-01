import { notFound } from 'next/navigation';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { SaasIssuesProvider } from '@/components/providers/saas-issues-provider';
import { SaasProjectsProvider } from '@/components/providers/saas-projects-provider';
import { getWorkspaceSession } from '@/lib/workspace';

export default async function OrganizationLayout({
   children,
   params,
}: {
   children: React.ReactNode;
   params: Promise<{ orgId: string }>;
}) {
   const { orgId } = await params;
   const workspace = await getWorkspaceSession(orgId);

   if (!workspace) {
      notFound();
   }

   return (
      <WorkspaceProvider value={workspace}>
         <SaasProjectsProvider>
            <SaasIssuesProvider>{children}</SaasIssuesProvider>
         </SaasProjectsProvider>
      </WorkspaceProvider>
   );
}
