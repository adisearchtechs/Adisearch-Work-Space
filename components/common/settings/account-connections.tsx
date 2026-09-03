'use client';

import { INTEGRATION_LOGOS } from './integration-logos';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

const SlackLogo = INTEGRATION_LOGOS['slack'];
const GoogleCalendarLogo = INTEGRATION_LOGOS['google-calendar'];
const NotionLogo = INTEGRATION_LOGOS['notion'];
const GithubLogo = INTEGRATION_LOGOS['github'];

const NotConfigured = () => (
   <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
      Not configured
   </span>
);

export default function AccountConnections() {
   return (
      <SettingsShell
         title="Connected accounts"
         description="Connection state is server-authoritative. No external account is configured until the integration platform is implemented in R5."
      >
         <SettingsSection
            title="Accounts"
            description="These providers are planned connection targets. Their presence here does not mean they are connected."
         >
            <SettingsCard>
               <SettingsRow
                  icon={<GithubLogo className="size-4" />}
                  title="GitHub"
                  description="Repository and pull-request access will be added through the R5 integration architecture."
                  trailing={<NotConfigured />}
               />
               <SettingsRow
                  icon={<SlackLogo className="size-4" />}
                  title="Slack"
                  description="Workspace messaging and notification connectivity is not configured."
                  trailing={<NotConfigured />}
               />
               <SettingsRow
                  icon={<GoogleCalendarLogo className="size-4" />}
                  title="Google Calendar"
                  description="Calendar availability sync is not configured."
                  trailing={<NotConfigured />}
               />
               <SettingsRow
                  icon={<NotionLogo className="size-4" />}
                  title="Notion"
                  description="Document preview and workspace linking is not configured."
                  trailing={<NotConfigured />}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
