import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R5B persists only hashed one-time GitHub authorization state behind self-authorizing RPCs', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903152856_add_github_integration_authorization_flow.sql'
   );
   const denyMigration = await readSource(
      'supabase/migrations/20260903152929_deny_direct_integration_authorization_state_access.sql'
   );

   assert.match(migration, /create table public\.integration_authorization_states/);
   assert.match(migration, /state_hash text not null unique/);
   assert.match(migration, /state_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
   assert.doesNotMatch(migration, /\bstate\s+text\b/i);
   assert.doesNotMatch(migration, /access_token\s+text/i);
   assert.doesNotMatch(migration, /refresh_token\s+text/i);
   assert.doesNotMatch(migration, /private_key\s+text/i);
   assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
   assert.match(migration, /actor_role not in \('owner', 'admin'\)/);
   assert.match(migration, /candidate_external_id <> p_installation_id/);
   assert.match(migration, /grant execute on function public\.complete_github_integration_authorization/);
   assert.match(migration, /revoke all on table public\.integration_authorization_states from public, anon, authenticated/);
   assert.match(denyMigration, /integration_authorization_states_no_direct_access/);
   assert.match(denyMigration, /using \(false\)/);
   assert.match(denyMigration, /with check \(false\)/);
});

test('R5B GitHub provider module is server-only, state+PKCE protected, and uses current GitHub App verification APIs', async () => {
   const provider = await readSource('lib/integrations/github/server.ts');
   const env = await readSource('.env.example');

   assert.match(provider, /import 'server-only'/);
   assert.match(provider, /randomBytes\(32\)\.toString\('base64url'\)/);
   assert.match(provider, /createHash\('sha256'\).*digest\('hex'\)/s);
   assert.match(provider, /code_challenge/);
   assert.match(provider, /code_challenge_method', 'S256'/);
   assert.match(provider, /timingSafeEqual/);
   assert.match(provider, /\/user\/installations\/\$\{encodeURIComponent\(installationId\)\}\/repositories/);
   assert.match(provider, /\/app\/installations\/\$\{encodeURIComponent\(installationId\)\}/);
   assert.match(provider, /X-GitHub-Api-Version/);
   assert.match(provider, /2026-03-10/);
   assert.match(provider, /alg: 'RS256'/);
   assert.match(provider, /client_secret: clientSecret/);
   assert.match(provider, /code_verifier: pkceVerifier/);
   assert.match(env, /^GITHUB_APP_CLIENT_SECRET=$/m);
   assert.match(env, /^GITHUB_APP_PRIVATE_KEY=$/m);
   assert.doesNotMatch(env, /NEXT_PUBLIC_GITHUB_APP_CLIENT_SECRET/);
   assert.doesNotMatch(env, /NEXT_PUBLIC_GITHUB_APP_PRIVATE_KEY/);
});

test('R5B start and setup routes require workspace administration and never trust installation_id alone', async () => {
   const start = await readSource('app/api/integrations/github/start/route.ts');
   const setup = await readSource('app/api/integrations/github/setup/route.ts');

   assert.match(start, /export async function POST/);
   assert.match(start, /hasValidMutationOrigin\(request\)/);
   assert.match(start, /authorizeWorkspaceMemberAccess\([\s\S]*?true/);
   assert.match(start, /githubAppReadiness\(\)/);
   assert.match(start, /rpc\('create_integration_authorization_state'/);
   assert.match(start, /GITHUB_STATE_COOKIE/);
   assert.match(start, /GITHUB_PKCE_COOKIE/);
   assert.match(start, /githubInstallUrl\(state\)/);

   assert.match(setup, /INSTALLATION_ID_PATTERN/);
   assert.match(setup, /opaqueTokensMatch\(state, cookieState\)/);
   assert.match(setup, /record_integration_authorization_candidate/);
   assert.match(setup, /githubUserAuthorizationUrl\(state!, pkceVerifier\)/);
   assert.doesNotMatch(setup, /complete_github_integration_authorization/);
});

test('R5B callback verifies the signed-in user and configured App before committing connection metadata', async () => {
   const callback = await readSource('app/api/integrations/github/callback/route.ts');

   assert.match(callback, /supabase\.auth\.getClaims\(\)/);
   assert.match(callback, /rpc\([\s\S]*?'get_integration_authorization_state'/);
   assert.match(callback, /const ephemeralUserAccessToken = await exchangeGithubUserCode/);
   assert.match(callback, /await verifyGithubUserCanAccessInstallation\(installationId, ephemeralUserAccessToken\)/);
   assert.match(callback, /await verifyGithubInstallationBelongsToApp\(installationId\)/);
   assert.match(callback, /complete_github_integration_authorization/);
   assert.match(callback, /githubWorkspaceSettingsUrl/);
   assert.doesNotMatch(callback, /\.from\('integration_connections'\)[\s\S]*?\.insert\(/);
   assert.doesNotMatch(callback, /p_access_token/);

   const userVerification = callback.lastIndexOf('await verifyGithubUserCanAccessInstallation');
   const appVerification = callback.lastIndexOf('await verifyGithubInstallationBelongsToApp');
   const completion = callback.lastIndexOf("'complete_github_integration_authorization'");
   assert.ok(userVerification > 0 && appVerification > userVerification && completion > appVerification);
});

test('R5B exposes one real permission-aware GitHub connect action and leaves unreleased providers inert', async () => {
   const connections = await readSource('components/common/settings/account-connections.tsx');
   const api = await readSource('app/api/integrations/route.ts');
   const contracts = await readSource('lib/integrations/contracts.ts');

   assert.match(api, /providers: \{ github: githubAppReadiness\(\) \}/);
   assert.match(contracts, /IntegrationProviderReadiness/);
   assert.match(connections, /workspace\.user\.role === 'owner'/);
   assert.match(connections, /workspace\.user\.role === 'admin'/);
   assert.match(connections, /providers\.github\.available/);
   assert.match(connections, /method: 'POST'/);
   assert.match(connections, /\/api\/integrations\/github\/start/);
   assert.match(connections, /Connect GitHub/);
   assert.match(connections, /authorizeUrl\.origin !== 'https:\/\/github\.com'/);
   assert.match(connections, /Workspace messaging authorization is not implemented yet/);
   assert.match(connections, /Calendar authorization is not implemented yet/);
   assert.match(connections, /Document workspace authorization is not implemented yet/);
   assert.doesNotMatch(connections, /Connect Slack/);
   assert.doesNotMatch(connections, /Connect Notion/);
   assert.doesNotMatch(connections, /Disconnect GitHub/);
});
