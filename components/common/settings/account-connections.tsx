'use client';

import type { IntegrationConnectionDto } from '@/lib/integrations/contracts';
import { INTEGRATION_LOGOS } from './integration-logos';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useIntegrationConnections } from './use-integration-connections';

const SlackLogo = INTEGRATION_LOGOS['slack'];
const GoogleCalendarLogo = INTEGRATION_LOGOS['google-calendar'];
const NotionLogo = INTEGRATION_LOGOS['notion'];
const GithubLogo = INTEGRATION_LOGOS['github'];

function StatusBadge({ connection }: { connection?: IntegrationConnectionDto }) {
   const label = !connection
      ? 'Not connected'
      : connection.status === 'connected'
        ? 'Connected'
        : connection.status === 'degraded'
          ? 'Needs attention'
          : connection.status === 'pending'
            ? 'Pending'
            : 'Disconnected';

   return (
      <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
         {label}
      </span>
   );
}

export default function AccountConnections() {
   const { primaryByProvider, state, error, configured } = useIntegrationConnections();
   const statusDescription = !configured
      ? 'This demo workspace has no persisted connection state.'
      : state === 'loading'
        ? 'Checking persisted connection state…'
        : state === 'error'
          ? error ?? 'Connection state could not be loaded.'
          : 'Connection state is loaded from the workspace database. R5A does not expose provider authorization controls yet.';

   return (
      <SettingsShell
         title="Connected accounts"
         description="External account state is server-authoritative and never inferred from the presence of a provider in the UI."
      >
         <SettingsSection title="Status" description={statusDescription}>
            <SettingsCard>
               <SettingsRow
                  icon={<GithubLogo className="size-4" />}
                  title="GitHub"
                  description={
                     primaryByProvider.get('github')?.accountLabel
                        ? `Connected account metadata: ${primaryByProvider.get('github')?.accountLabel}`
                        : 'Repository and pull-request authorization is not configured.'
                  }
                  trailing={<StatusBadge connection={primaryByProvider.get('github')} />}
               />
               <SettingsRow
                  icon={<SlackLogo className="size-4" />}
                  title="Slack"
                  description={
                     primaryByProvider.get('slack')?.accountLabel
                        ? `Connected workspace metadata: ${primaryByProvider.get('slack')?.accountLabel}`
                        : 'Workspace messaging authorization is not configured.'
                  }
                  trailing={<StatusBadge connection={primaryByProvider.get('slack')} />}
               />
               <SettingsRow
                  icon={<GoogleCalendarLogo className="size-4" />}
                  title="Google Calendar"
                  description={
                     primaryByProvider.get('google-calendar')?.accountLabel
                        ? `Connected account metadata: ${primaryByProvider.get('google-calendar')?.accountLabel}`
                        : 'Calendar authorization is not configured.'
                  }
                  trailing={<StatusBadge connection={primaryByProvider.get('google-calendar')} />}
               />
               <SettingsRow
                  icon={<NotionLogo className="size-4" />}
                  title="Notion"
                  description={
                     primaryByProvider.get('notion')?.accountLabel
                        ? `Connected workspace metadata: ${primaryByProvider.get('notion')?.accountLabel}`
                        : 'Document workspace authorization is not configured.'
                  }
                  trailing={<StatusBadge connection={primaryByProvider.get('notion')} />}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
