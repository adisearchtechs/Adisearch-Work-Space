import { notFound } from 'next/navigation';
import { WorkspaceProvider } from '@/components/providers/workspace-provider';
import { SaasTeamsProvider } from '@/components/providers/saas-teams-provider';
import { SaasSavedViewsProvider } from '@/components/providers/saas-saved-views-provider';
import { SaasNotificationsProvider } from '@/components/providers/saas-notifications-provider';
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
         <SaasTeamsProvider>
            <SaasProjectsProvider>
               <SaasIssuesProvider>
                  <SaasSavedViewsProvider>
                     <SaasNotificationsProvider>{children}</SaasNotificationsProvider>
                  </SaasSavedViewsProvider>
               </SaasIssuesProvider>
            </SaasProjectsProvider>
         </SaasTeamsProvider>
      </WorkspaceProvider>
   );
}
