import AccountConnections from '@/components/common/settings/account-connections';
import Integrations from '@/components/common/settings/integrations';
import IssueLabelsSettings from '@/components/common/settings/issue-labels-settings';
import { PLACEHOLDER_SECTIONS } from '@/components/common/settings/placeholder-sections';
import PersistentPreferences from '@/components/common/settings/persistent-preferences';
import Profile from '@/components/common/settings/profile';
import SettingsNotice from '@/components/common/settings/settings-notice';
import SettingsPlaceholder from '@/components/common/settings/settings-placeholder';
import WorkspaceGeneralSettings from '@/components/common/settings/workspace-general-settings';
import WorkspaceMembersSettings from '@/components/common/settings/workspace-members-settings';
import MainLayout from '@/components/layout/main-layout';
import Header from '@/components/layout/headers/settings/header';
import { notFound } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

const NotificationsNotice = () => (
   <SettingsNotice
      title="Notifications"
      description="Notification delivery preferences are not configurable yet. Inbox notifications continue to use the current production behavior."
      milestone="R6 Settings persistence"
   />
);
const SecurityNotice = () => (
   <SettingsNotice
      title="Security & access"
      description="Detailed session, passkey, personal API-key, and signing-key management is not implemented in Adisearch Workspace. Authentication remains managed by Supabase Auth."
      milestone="R7 Security and Supabase hardening"
   />
);
const AgentPersonalizationNotice = () => (
   <SettingsNotice
      title="Agent personalization"
      description="Personal guidance, skills, and MCP connector preferences are not persisted yet."
      milestone="R4 Real AI Agent and R6 Settings persistence"
   />
);
const AiNotice = () => (
   <SettingsNotice
      title="AI & Agents"
      description="Production AI capability controls are not available yet. Coding Sessions, Loops, Code Intelligence, and Slack Agent integrations are not enabled by this workspace."
      milestone="R4 Real AI Agent"
   />
);
const CodeReviewsNotice = () => (
   <SettingsNotice
      title="Code & reviews"
      description="Git provider settings and review automation are not configurable until a real provider connection exists."
      milestone="R5 Connected apps architecture"
   />
);
const IssueTemplatesNotice = () => (
   <SettingsNotice
      title="Issue templates"
      description="Workspace issue templates are not implemented. No sample template is treated as production data."
      milestone="R6 feature-specific settings"
   />
);
const ProjectStatusesNotice = () => (
   <SettingsNotice
      title="Project statuses"
      description="Project-status administration is not implemented. Existing project status values remain unchanged."
      milestone="R6 feature-specific settings"
   />
);

const DEDICATED_SECTIONS: Record<string, ComponentType> = {
   'agent-personalization': AgentPersonalizationNotice,
   'ai': AiNotice,
   'code-and-reviews': CodeReviewsNotice,
   'connected-accounts': AccountConnections,
   'integrations': Integrations,
   'issue-labels': IssueLabelsSettings,
   'issue-templates': IssueTemplatesNotice,
   'members': WorkspaceMembersSettings,
   'notifications': NotificationsNotice,
   'preferences': PersistentPreferences,
   'profile': Profile,
   'project-statuses': ProjectStatusesNotice,
   'security': SecurityNotice,
   'workspace': WorkspaceGeneralSettings,
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
