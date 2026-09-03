'use client';

import { INTEGRATION_LOGOS } from './integration-logos';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';
import { useIntegrationConnections } from './use-integration-connections';

const GithubLogo = INTEGRATION_LOGOS['github'];

const Unavailable = ({ label = 'Unavailable' }: { label?: string }) => (
   <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
      {label}
   </span>
);

export default function AccountCodeReviews() {
   const { primaryByProvider, state, error, configured } = useIntegrationConnections();
   const github = primaryByProvider.get('github');
   const githubConnected = github?.status === 'connected';

   const connectionDescription = !configured
      ? 'This demo workspace has no authoritative GitHub connection state.'
      : state === 'loading'
        ? 'Checking persisted GitHub connection state…'
        : state === 'error'
          ? error ?? 'GitHub connection state could not be loaded.'
          : githubConnected
            ? github.accountLabel
               ? `Persisted GitHub connection metadata is present for ${github.accountLabel}.`
               : 'Persisted GitHub connection metadata is present.'
            : 'GitHub is not connected to this workspace.';

   return (
      <SettingsShell
         title="Code & reviews"
         description="GitHub-backed review controls become available only after the provider authorization and review-action flows are implemented and verified."
      >
         <SettingsSection title="GitHub connection" description={connectionDescription}>
            <SettingsCard>
               <SettingsRow
                  icon={<GithubLogo className="size-4" />}
                  title="GitHub"
                  description="Connection state comes from the R5 integration registry; this page never assumes a connection from static UI data."
                  trailing={<Unavailable label={githubConnected ? 'Connected metadata' : 'Not connected'} />}
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection
            title="Review automation"
            description="These capabilities remain intentionally disabled until R5 adds provider authorization and verified GitHub actions."
         >
            <SettingsCard>
               <SettingsRow
                  title="Pull request reviews"
                  description="Review synchronization and submission are not implemented yet."
                  trailing={<Unavailable />}
               />
               <SettingsRow
                  title="Draft conversion and merge strategy"
                  description="No repository setting is changed by Adisearch Workspace in R5A."
                  trailing={<Unavailable />}
               />
               <SettingsRow
                  title="Review notifications"
                  description="GitHub review-request and check notifications are not connected yet."
                  trailing={<Unavailable />}
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection
            title="Repository actions"
            description="No signed-commit, branch-copy, merge, or external coding-tool action is exposed until a real provider flow and permission audit exist."
         >
            <SettingsCard>
               <SettingsRow
                  title="Signed commits"
                  description="Signing-key management is not implemented."
                  trailing={<Unavailable />}
               />
               <SettingsRow
                  title="External coding tools"
                  description="Coding-tool launch and issue status automation are not implemented."
                  trailing={<Unavailable />}
               />
            </SettingsCard>
         </SettingsSection>
      </SettingsShell>
   );
}
