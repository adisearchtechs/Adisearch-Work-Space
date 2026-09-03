'use client';

import { Button } from '@/components/ui/button';
import type { IntegrationConnectionDto } from '@/lib/integrations/contracts';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
   const searchParams = useSearchParams();
   const { primaryByProvider, providers, state, error, configured, workspace } =
      useIntegrationConnections();
   const [connectingGithub, setConnectingGithub] = useState(false);
   const [connectError, setConnectError] = useState<string | null>(null);
   const github = primaryByProvider.get('github');
   const githubConnected = github?.status === 'connected';
   const canAdministerConnections = workspace.user.role === 'owner' || workspace.user.role === 'admin';
   const callbackResult =
      searchParams.get('integration') === 'github' ? searchParams.get('result') : null;

   const statusDescription = !configured
      ? 'This demo workspace has no persisted connection state.'
      : state === 'loading'
        ? 'Checking persisted connection state…'
        : state === 'error'
          ? error ?? 'Connection state could not be loaded.'
          : 'Connection state is loaded from the workspace database. GitHub uses a verified GitHub App installation flow; other providers remain unavailable until their provider flows are implemented.';

   const githubDescription = github?.accountLabel
      ? `GitHub App installation: ${github.accountLabel}`
      : !providers.github.available
        ? providers.github.reason ?? 'GitHub App setup is not configured.'
        : !canAdministerConnections
          ? 'A workspace owner or admin must connect GitHub.'
          : 'Install the Adisearch GitHub App and verify your access before this workspace is marked connected.';

   async function connectGithub() {
      if (!configured || !canAdministerConnections || githubConnected || !providers.github.available) return;
      setConnectingGithub(true);
      setConnectError(null);
      try {
         const response = await fetch(
            `/api/integrations/github/start?organization=${encodeURIComponent(workspace.organization.slug)}`,
            {
               method: 'POST',
               credentials: 'same-origin',
               headers: { Accept: 'application/json' },
               cache: 'no-store',
            }
         );
         const payload = (await response.json().catch(() => ({}))) as {
            authorizeUrl?: string;
            error?: string;
         };
         if (!response.ok || !payload.authorizeUrl) {
            throw new Error(payload.error ?? 'Unable to start the GitHub connection.');
         }

         const authorizeUrl = new URL(payload.authorizeUrl);
         if (
            authorizeUrl.origin !== 'https://github.com' ||
            !authorizeUrl.pathname.startsWith('/apps/')
         ) {
            throw new Error('The GitHub authorization URL was rejected.');
         }
         window.location.assign(authorizeUrl.toString());
      } catch (connectFailure) {
         setConnectingGithub(false);
         setConnectError(
            connectFailure instanceof Error
               ? connectFailure.message
               : 'Unable to start the GitHub connection.'
         );
      }
   }

   const githubTrailing = githubConnected ? (
      <StatusBadge connection={github} />
   ) : canAdministerConnections && providers.github.available ? (
      <div className="flex items-center gap-2">
         <StatusBadge connection={github} />
         <Button
            type="button"
            size="sm"
            disabled={connectingGithub || state === 'loading'}
            onClick={() => void connectGithub()}
         >
            {connectingGithub ? 'Opening GitHub…' : github?.status === 'degraded' ? 'Reconnect GitHub' : 'Connect GitHub'}
         </Button>
      </div>
   ) : (
      <StatusBadge connection={github} />
   );

   return (
      <SettingsShell
         title="Connected accounts"
         description="External account state is server-authoritative and never inferred from the presence of a provider in the UI."
      >
         {(callbackResult === 'connected' || callbackResult === 'error' || callbackResult === 'cancelled') && (
            <div className="rounded-lg border bg-container px-4 py-3 text-sm text-muted-foreground" role="status">
               {callbackResult === 'connected'
                  ? 'GitHub was connected after the installation and signed-in user were verified.'
                  : callbackResult === 'cancelled'
                    ? 'GitHub authorization was cancelled. No connection was created.'
                    : 'GitHub could not be verified, so no connection was created.'}
            </div>
         )}
         {connectError && (
            <div className="rounded-lg border bg-container px-4 py-3 text-sm text-destructive" role="alert">
               {connectError}
            </div>
         )}

         <SettingsSection title="Status" description={statusDescription}>
            <SettingsCard>
               <SettingsRow
                  icon={<GithubLogo className="size-4" />}
                  title="GitHub"
                  description={githubDescription}
                  trailing={githubTrailing}
               />
               <SettingsRow
                  icon={<SlackLogo className="size-4" />}
                  title="Slack"
                  description="Workspace messaging authorization is not implemented yet."
                  trailing={<StatusBadge connection={primaryByProvider.get('slack')} />}
               />
               <SettingsRow
                  icon={<GoogleCalendarLogo className="size-4" />}
                  title="Google Calendar"
                  description="Calendar authorization is not implemented yet."
                  trailing={<StatusBadge connection={primaryByProvider.get('google-calendar')} />}
               />
               <SettingsRow
                  icon={<NotionLogo className="size-4" />}
                  title="Notion"
                  description="Document workspace authorization is not implemented yet."
                  trailing={<StatusBadge connection={primaryByProvider.get('notion')} />}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
