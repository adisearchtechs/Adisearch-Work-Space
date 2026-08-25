import AccountCodeReviews from '@/components/common/settings/account-code-reviews';
import AccountConnections from '@/components/common/settings/account-connections';
import AccountNotifications from '@/components/common/settings/account-notifications';
import AccountSecurity from '@/components/common/settings/account-security';
import AgentPersonalization from '@/components/common/settings/agent-personalization';
import AiAgents from '@/components/common/settings/ai-agents';
import Integrations from '@/components/common/settings/integrations';
import IssueLabelsSettings from '@/components/common/settings/issue-labels-settings';
import IssueTemplatesSettings from '@/components/common/settings/issue-templates-settings';
import { PLACEHOLDER_SECTIONS } from '@/components/common/settings/placeholder-sections';
import Preferences from '@/components/common/settings/preferences';
import Profile from '@/components/common/settings/profile';
import ProjectStatusesSettings from '@/components/common/settings/project-statuses-settings';
import SettingsPlaceholder from '@/components/common/settings/settings-placeholder';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import { notFound } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

const DEDICATED_SECTIONS: Record<string, ComponentType> = {
   'agent-personalization': AgentPersonalization,
   'ai': AiAgents,
   'code-and-reviews': AccountCodeReviews,
   'connected-accounts': AccountConnections,
   'integrations': Integrations,
   'issue-labels': IssueLabelsSettings,
   'issue-templates': IssueTemplatesSettings,
   'notifications': AccountNotifications,
   'preferences': Preferences,
   'profile': Profile,
   'project-statuses': ProjectStatusesSettings,
   'security': AccountSecurity,
};

export default async function SettingsSectionPage({
   params,
}: {
   params: Promise<{ section: string }>;
}) {
   const { section } = await params;
   const DedicatedSection = DEDICATED_SECTIONS[section];
   const placeholder = PLACEHOLDER_SECTIONS[section];
   let content: ReactNode;

   if (DedicatedSection) content = <DedicatedSection />;
   else if (placeholder) content = <SettingsPlaceholder config={placeholder} />;
   else notFound();

   return (
      <MainLayout header={<Header />} headersNumber={1}>
         {content}
      </MainLayout>
   );
}
