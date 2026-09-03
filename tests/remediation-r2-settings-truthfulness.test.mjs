import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R2 production settings route does not expose prototype settings controls', async () => {
   const route = await readSource('app/[orgId]/settings/[section]/page.tsx');

   assert.match(route, /SettingsNotice/);
   assert.match(route, /R4 Real AI Agent/);
   assert.match(route, /R5 Connected apps architecture/);
   assert.match(route, /R6 Settings persistence/);
   assert.match(route, /R7 Security and Supabase hardening/);
   assert.doesNotMatch(route, /account-code-reviews/);
   assert.doesNotMatch(route, /account-notifications/);
   assert.doesNotMatch(route, /account-security/);
   assert.doesNotMatch(route, /agent-personalization';/);
   assert.doesNotMatch(route, /ai-agents/);
   assert.doesNotMatch(route, /issue-templates-settings/);
   assert.doesNotMatch(route, /project-statuses-settings/);
});

test('R2 connected accounts never fabricate provider connection state', async () => {
   const connections = await readSource('components/common/settings/account-connections.tsx');

   assert.match(connections, /useIntegrationConnections/);
   assert.match(connections, /Not connected/);
   assert.match(connections, /server-authoritative/);
   assert.match(connections, /not configured/);
   assert.doesNotMatch(connections, /ConnectedTrailing/);
   assert.doesNotMatch(connections, /@adisearchtechs/);
   assert.doesNotMatch(connections, /octo-relay/);
   assert.doesNotMatch(connections, /<Button/);
});

test('R2 integration directory remains searchable without fake enabled or dead card controls', async () => {
   const integrations = await readSource('components/common/settings/integrations.tsx');

   assert.match(integrations, /Search integrations/);
   assert.match(integrations, /useIntegrationConnections/);
   assert.match(integrations, /Not connected/);
   assert.match(integrations, /OAuth setup and disconnect flows are not released in R5A/);
   assert.match(integrations, /onClick=\{\(\) => setExpanded\(true\)\}/);
   assert.doesNotMatch(integrations, /ENABLED_INTEGRATIONS/);
   assert.doesNotMatch(integrations, /status === 'enabled'/);
   assert.doesNotMatch(integrations, /function IntegrationCard[\s\S]*?return \(\s*<button/);
   assert.doesNotMatch(integrations, />\s*Connect\s*</);
});

test('R2 generic placeholder and profile surfaces do not expose dead write controls', async () => {
   const placeholder = await readSource('components/common/settings/settings-placeholder.tsx');
   const profile = await readSource('components/common/settings/profile.tsx');
   const notice = await readSource('components/common/settings/settings-notice.tsx');

   assert.doesNotMatch(placeholder, /components\/ui\/button/);
   assert.doesNotMatch(placeholder, /components\/ui\/input/);
   assert.match(placeholder, /Planned/);
   assert.doesNotMatch(profile, /components\/ui\/button/);
   assert.doesNotMatch(profile, /Leave workspace/);
   assert.match(profile, /Membership changes are managed by workspace administrators/);
   assert.match(notice, /No settings shown here are being simulated or saved locally/);
});
