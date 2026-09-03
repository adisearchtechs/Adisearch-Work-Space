import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R5A integration registry stores metadata only and exposes read-only tenant state', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903124006_add_integration_connection_registry.sql'
   );

   assert.match(migration, /create table public\.integration_connections/);
   assert.match(migration, /connection_scope in \('organization', 'user'\)/);
   assert.match(migration, /status in \('pending', 'connected', 'degraded', 'revoked'\)/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /owner_user_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /alter table public\.integration_connections enable row level security/);
   assert.match(migration, /revoke all on table public\.integration_connections from public, anon, authenticated/);
   assert.match(migration, /grant select on table public\.integration_connections to authenticated/);
   assert.doesNotMatch(migration, /grant (?:insert|update|delete).*integration_connections.*authenticated/i);
   assert.doesNotMatch(migration, /access_token|refresh_token|client_secret|api_key/i);
});

test('R5A API authenticates the workspace and filters integration reads by tenant', async () => {
   const route = await readSource('app/api/integrations/route.ts');
   const server = await readSource('lib/workspace-members/server.ts');
   const database = await readSource('lib/supabase/database-with-integrations.ts');
   const preferencesType = await readSource('lib/supabase/database-with-preferences.ts');
   const supabaseServer = await readSource('lib/supabase/server.ts');

   assert.match(route, /authorizeWorkspaceMemberAccess/);
   assert.match(route, /\.from\('integration_connections'\)/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /Cache-Control': 'private, no-store'/);
   assert.doesNotMatch(route, /service[_-]?role/i);
   assert.match(server, /organization_members/);
   assert.match(database, /DatabaseWithInvitations/);
   assert.match(database, /integration_connections: IntegrationConnectionsTable/);
   assert.match(preferencesType, /DatabaseWithIntegrations/);
   assert.match(supabaseServer, /DatabaseWithPreferences/);
});

test('R5A/R5B settings surfaces render persisted state while the directory remains inert', async () => {
   const hook = await readSource('components/common/settings/use-integration-connections.ts');
   const integrations = await readSource('components/common/settings/integrations.tsx');
   const connections = await readSource('components/common/settings/account-connections.tsx');

   assert.match(hook, /\/api\/integrations\?organization=/);
   assert.match(hook, /primaryByProvider/);
   assert.match(integrations, /useIntegrationConnections/);
   assert.match(integrations, /Not connected/);
   assert.match(integrations, /Connected/);
   assert.match(integrations, /GitHub authorization is managed from Connected accounts/);
   assert.match(integrations, /other provider authorization and disconnect flows are not released yet/);
   assert.match(connections, /server-authoritative/);
   assert.match(connections, /useIntegrationConnections/);
   assert.match(connections, /\/api\/integrations\/github\/start/);
   assert.match(connections, /'Connect GitHub'/);
   assert.doesNotMatch(integrations, />\s*Connect\s*</);
   assert.doesNotMatch(integrations, /<Button/);
   assert.doesNotMatch(connections, /Connect Slack/);
   assert.doesNotMatch(connections, /Connect Notion/);
   assert.doesNotMatch(connections, /Disconnect GitHub/);
});

test('R5A removes fake GitHub code-review controls until provider actions exist', async () => {
   const reviews = await readSource('components/common/settings/account-code-reviews.tsx');

   assert.match(reviews, /useIntegrationConnections/);
   assert.match(reviews, /not implemented/);
   assert.match(reviews, /No repository setting is changed/);
   assert.doesNotMatch(reviews, /defaultChecked/);
   assert.doesNotMatch(reviews, /onClick=\{\(\) => \{\}\}/);
   assert.doesNotMatch(reviews, /<Switch/);
   assert.doesNotMatch(reviews, /<SelectMenu/);
   assert.doesNotMatch(reviews, />\s*Add key\s*</);
});
