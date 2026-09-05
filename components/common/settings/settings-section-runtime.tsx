'use client';

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
import WorkspaceMembersSettings from '@/components/common/settings/workspace-members-settings';
import { useWorkspace } from '@/components/providers/workspace-provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
   SettingsCard,
   SettingsRow,
   SettingsSection,
   SettingsShell,
} from '@/components/common/settings/shared';
import type { ComponentType } from 'react';

const DEMO_SECTIONS: Record<string, ComponentType> = {
   'agent-personalization': AgentPersonalization,
   ai: AiAgents,
   'code-and-reviews': AccountCodeReviews,
   'connected-accounts': AccountConnections,
   integrations: Integrations,
   'issue-labels': IssueLabelsSettings,
   'issue-templates': IssueTemplatesSettings,
   members: WorkspaceMembersSettings,
   notifications: AccountNotifications,
   preferences: Preferences,
   profile: Profile,
   'project-statuses': ProjectStatusesSettings,
   security: AccountSecurity,
};

const CONFIGURED_PLACEHOLDERS: Record<
   string,
   { title: string; description: string; status: string }
> = {
   'agent-personalization': {
      title: 'Agent personalization',
      description:
         'Agent personalization is not connected to a production AI runtime yet. No settings shown here would be persisted, so prototype controls are hidden.',
      status: 'Agent runtime not connected',
   },
   ai: {
      title: 'AI agents',
      description:
         'Production AI-agent configuration is not available yet. The prototype agent controls are hidden until there is a real provider, permission model, and persisted configuration.',
      status: 'Not available yet',
   },
   'code-and-reviews': {
      title: 'Code & reviews',
      description:
         'Persistent review requests are available in Reviews. GitHub synchronization, merge settings, signing keys, and automated review preferences are not connected yet, so fake toggles are not shown.',
      status: 'Git synchronization not connected',
   },
   'connected-accounts': {
      title: 'Connected accounts',
      description:
         'Adisearch Workspace does not currently store OAuth connections for Slack, Google Calendar, Notion, or GitHub. No account is presented as connected until provider state exists in the application.',
      status: 'No connected accounts',
   },
   integrations: {
      title: 'Integrations',
      description:
         'The integration catalog is not wired to real provider authorization or connection state yet. Prototype “Enabled” badges and dead Connect buttons are hidden in configured workspaces.',
      status: 'No production integrations connected',
   },
   'issue-templates': {
      title: 'Issue templates',
      description:
         'Persistent issue templates have not been implemented yet. Prototype template controls are hidden until templates have a tenant-scoped storage model.',
      status: 'Not available yet',
   },
   notifications: {
      title: 'Notification preferences',
      description:
         'The persistent Inbox is available, but per-user notification preference persistence has not been implemented yet. Prototype switches are hidden.',
      status: 'Preference controls not available yet',
   },
   preferences: {
      title: 'Preferences',
      description:
         'Only settings backed by real application state should be editable here. The current prototype preference switches and select menus are not persisted, so they are hidden for configured workspaces.',
      status: 'Persistent preferences not available yet',
   },
   'project-statuses': {
      title: 'Project statuses',
      description:
         'Project status configuration is still prototype-only and currently derives from mock project data. It is hidden until project workflow statuses are stored and editable per workspace.',
      status: 'Workflow configuration not available yet',
   },
   security: {
      title: 'Security',
      description:
         'Security controls must reflect real authentication and session policy. Prototype switches are hidden until each control is backed by Supabase Auth or another production security service.',
      status: 'Use the active authentication policy',
   },
};

function ConfiguredProfile() {
   const { user, organization } = useWorkspace();
   const displayName = user.displayName || 'Workspace member';
   const fallback = displayName.slice(0, 2).toUpperCase();
   const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

   return (
      <SettingsShell title="My Profile" description="Authenticated workspace identity">
         <SettingsSection>
            <SettingsCard>
               <SettingsRow
                  title="Profile picture"
                  description={`Your identity in ${organization.name}`}
                  trailing={
                     <Avatar className="size-10 border">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={displayName} />
                        <AvatarFallback>{fallback}</AvatarFallback>
                     </Avatar>
                  }
               />
               <SettingsRow
                  title="Display name"
                  description="Shown on projects, reviews, updates, and workspace activity"
                  trailing={
                     <Input
                        readOnly
                        value={displayName}
                        aria-label="Display name"
                        className="h-8 w-44 bg-muted/40"
                     />
                  }
               />
               <SettingsRow
                  title="Email"
                  trailing={<span className="text-sm text-foreground">{user.email}</span>}
               />
               <SettingsRow
                  title="Workspace role"
                  trailing={
                     <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium">
                        {roleLabel}
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>
         <SettingsSection title="Account changes">
            <SettingsCard>
               <SettingsRow
                  title="Profile editing and workspace departure"
                  description="These actions are not implemented in the application yet, so no inactive Save or Leave buttons are shown."
                  trailing={<span className="text-xs">Unavailable</span>}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}

function ConfiguredUnavailable({ section }: { section: string }) {
   const placeholder = PLACEHOLDER_SECTIONS[section];
   const copy = CONFIGURED_PLACEHOLDERS[section] ?? {
      title: placeholder?.title ?? 'Settings',
      description:
         placeholder?.description ??
         'This section is not backed by persisted production settings yet.',
      status: 'Not available yet',
   };

   return (
      <SettingsShell title={copy.title} description={copy.description}>
         <SettingsSection>
            <SettingsCard>
               <SettingsRow
                  title="Production status"
                  description="No changes can be made from this section until its backend and authorization flow are implemented."
                  trailing={
                     <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium">
                        {copy.status}
                     </span>
                  }
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}

export default function SettingsSectionRuntime({ section }: { section: string }) {
   const workspace = useWorkspace();

   if (!workspace.configured) {
      const DemoSection = DEMO_SECTIONS[section];
      if (DemoSection) return <DemoSection />;
      const placeholder = PLACEHOLDER_SECTIONS[section];
      return placeholder ? <SettingsPlaceholder config={placeholder} /> : null;
   }

   if (section === 'issue-labels') return <IssueLabelsSettings />;
   if (section === 'members') return <WorkspaceMembersSettings />;
   if (section === 'profile') return <ConfiguredProfile />;

   return <ConfiguredUnavailable section={section} />;
}
