import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R3A invitation schema stores only token hashes and keeps direct writes behind RPCs', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903102000_add_workspace_invitations.sql'
   );
   const rpcGrantFix = await readSource(
      'supabase/migrations/20260903103000_restrict_workspace_invitation_rpc_execution.sql'
   );

   assert.match(migration, /create table public\.organization_invitations/);
   assert.match(migration, /token_hash text not null unique/);
   assert.doesNotMatch(migration, /\btoken text\b/);
   assert.match(migration, /alter table public\.organization_invitations enable row level security/);
   assert.match(migration, /organization_invitations_select_admins/);
   assert.match(migration, /private\.is_org_admin\(organization_id\)/);
   assert.match(migration, /revoke all on table public\.organization_invitations from anon, authenticated/);
   assert.doesNotMatch(migration, /grant (?:insert|update|delete).*organization_invitations to authenticated/i);
   assert.match(migration, /create or replace function public\.create_organization_invitation/);
   assert.match(migration, /create or replace function public\.revoke_organization_invitation/);
   assert.match(migration, /create or replace function public\.accept_organization_invitation/);
   assert.match(migration, /security definer[\s\S]*?set search_path = ''/);
   assert.match(migration, /grant execute on function public\.accept_organization_invitation\(text\) to authenticated/);
   assert.match(rpcGrantFix, /revoke execute on function public\.create_organization_invitation[\s\S]*from anon/);
   assert.match(rpcGrantFix, /revoke execute on function public\.revoke_organization_invitation\(uuid, uuid\) from anon/);
   assert.match(rpcGrantFix, /revoke execute on function public\.accept_organization_invitation\(text\) from anon/);
});

test('R3A invitation creation enforces tenant, membership, role and team boundaries in the database', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903102000_add_workspace_invitations.sql'
   );

   assert.match(migration, /actor_role not in \('owner', 'admin'\)/);
   assert.match(migration, /actor_role = 'admin' and p_role = 'admin'/);
   assert.match(migration, /join auth\.users account on account\.id = member\.user_id/);
   assert.match(migration, /raise exception 'ALREADY_MEMBER'/);
   assert.match(migration, /raise exception 'INVITATION_ALREADY_PENDING'/);
   assert.match(migration, /left join public\.teams team/);
   assert.match(migration, /team\.organization_id = p_organization_id/);
   assert.match(migration, /raise exception 'INVALID_TEAM'/);
   assert.match(migration, /foreign key \(team_id, organization_id\)/);
});

test('R3A invitation acceptance is atomic, email-bound and never bypasses membership constraints in the API', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903102000_add_workspace_invitations.sql'
   );
   const acceptRoute = await readSource('app/api/invitations/accept/route.ts');

   assert.match(migration, /select lower\(account\.email\)/);
   assert.match(migration, /invitation_row\.email <> actor_email/);
   assert.match(migration, /invitation\.expires_at > now\(\)/);
   assert.match(migration, /invitation\.revoked_at is null/);
   assert.match(migration, /insert into public\.organization_members/);
   assert.match(migration, /insert into public\.team_members/);
   assert.match(migration, /set accepted_at = accepted_timestamp/);

   assert.match(acceptRoute, /hasValidMutationOrigin\(request\)/);
   assert.match(acceptRoute, /supabase\.auth\.getClaims\(\)/);
   assert.match(acceptRoute, /hashWorkspaceInvitationToken\(parsed\.data\.token\)/);
   assert.match(acceptRoute, /rpc\('accept_organization_invitation'/);
   assert.doesNotMatch(acceptRoute, /from\('organization_members'\).*insert/s);
});

test('R3 invitation API uses admin authorization, bounded validation and truthful delivery state', async () => {
   const route = await readSource('app/api/invitations/route.ts');
   const contracts = await readSource('lib/invitations/contracts.ts');
   const token = await readSource('lib/invitations/token.ts');
   const supabaseServer = await readSource('lib/supabase/server.ts');
   const preferencesType = await readSource('lib/supabase/database-with-preferences.ts');
   const integrationsType = await readSource('lib/supabase/database-with-integrations.ts');

   assert.match(route, /authorizeWorkspaceMemberAccess\([\s\S]*?true/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /readJsonBody\(request\)/);
   assert.match(route, /context\.role === 'admin' && parsed\.data\.role === 'admin'/);
   assert.match(route, /rpc\('create_organization_invitation'/);
   assert.match(route, /invitationDeliveryReadiness\(\)/);
   assert.match(route, /sendWorkspaceInvitationEmail/);
   assert.match(route, /status: 'sent'/);
   assert.doesNotMatch(route, /inviteToken/);
   assert.match(contracts, /teamIds: z\.array\(z\.string\(\)\.uuid\(\)\)\.max\(50\)/);
   assert.match(token, /randomBytes\(32\)\.toString\('base64url'\)/);
   assert.match(token, /createHash\('sha256'\)/);
   assert.match(supabaseServer, /DatabaseWithPreferences/);
   assert.match(preferencesType, /DatabaseWithIntegrations/);
   assert.match(integrationsType, /DatabaseWithInvitations/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});
