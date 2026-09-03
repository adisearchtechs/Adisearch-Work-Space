import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R3B invitation email delivery is server-only and requires explicit verified-sender configuration', async () => {
   const email = await readSource('lib/invitations/email.ts');
   const env = await readSource('.env.example');

   assert.match(email, /import 'server-only'/);
   assert.match(email, /process\.env\.RESEND_API_KEY/);
   assert.match(email, /process\.env\.INVITATION_FROM_EMAIL/);
   assert.match(email, /https:\/\/api\.resend\.com\/emails/);
   assert.match(email, /invitationDeliveryReadiness/);
   assert.match(email, /workspaceInvitationUrl/);
   assert.doesNotMatch(email, /NEXT_PUBLIC_RESEND/i);
   assert.match(env, /RESEND_API_KEY=/);
   assert.match(env, /INVITATION_FROM_EMAIL=/);
   assert.match(env, /Never expose these as NEXT_PUBLIC variables/);
});

test('R3B invitation creation sends only from the server and fails closed on delivery errors', async () => {
   const route = await readSource('app/api/invitations/route.ts');

   assert.match(route, /const delivery = invitationDeliveryReadiness\(\)/);
   assert.match(route, /if \(!delivery\.available\)[\s\S]*status: 503/);
   assert.match(route, /rpc\('create_organization_invitation'/);
   assert.match(route, /sendWorkspaceInvitationEmail/);
   assert.match(route, /rpc\('revoke_organization_invitation'/);
   assert.match(route, /No active invitation was left behind/);
   assert.doesNotMatch(route, /inviteToken/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});

test('R3B resend rotates unrecoverable tokens behind an authenticated least-privilege RPC', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903111000_add_invitation_resend.sql'
   );
   const route = await readSource('app/api/invitations/[invitationId]/resend/route.ts');

   assert.match(migration, /create or replace function public\.reissue_organization_invitation/);
   assert.match(migration, /security definer[\s\S]*set search_path = ''/);
   assert.match(migration, /actor_role not in \('owner', 'admin'\)/);
   assert.match(migration, /invitation_row\.accepted_at is not null/);
   assert.match(migration, /invitation_row\.revoked_at is not null/);
   assert.match(migration, /actor_role = 'admin' and invitation_row\.role = 'admin'/);
   assert.match(migration, /set token_hash = p_token_hash,[\s\S]*expires_at = p_expires_at/);
   assert.match(migration, /revoke execute on function public\.reissue_organization_invitation[\s\S]*from anon/);
   assert.match(migration, /grant execute on function public\.reissue_organization_invitation[\s\S]*to authenticated/);

   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /rpc\('reissue_organization_invitation'/);
   assert.match(route, /hashWorkspaceInvitationToken\(token\)/);
   assert.match(route, /sendWorkspaceInvitationEmail/);
   assert.match(route, /rpc\('revoke_organization_invitation'/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});

test('R3B invitation acceptance survives sign-in and signup confirmation without an open redirect', async () => {
   const invitePage = await readSource('app/invite/page.tsx');
   const acceptance = await readSource('app/invite/invitation-acceptance.tsx');
   const loginActions = await readSource('app/login/actions.ts');
   const confirm = await readSource('app/auth/confirm/route.ts');

   assert.match(invitePage, /acceptWorkspaceInvitationSchema\.safeParse/);
   assert.match(invitePage, /new URLSearchParams\(\{ next: nextPath \}\)/);
   assert.match(invitePage, /mode: 'signup', next: nextPath/);
   assert.match(acceptance, /fetch\('\/api\/invitations\/accept'/);
   assert.match(acceptance, /router\.replace\(`\/\$\{encodeURIComponent\(result\.organization\.slug\)\}`\)/);

   assert.match(loginActions, /const next = safeRedirectPath\(parsed\.data\.next\)/);
   assert.match(loginActions, /new URL\(next, `\$\{getSiteUrl\(\)\}\/`\)\.toString\(\)/);
   assert.match(loginActions, /options: \{ emailRedirectTo \}/);

   assert.match(confirm, /candidate\.origin !== site\.origin/);
   assert.match(confirm, /safeRedirectPath\(`\$\{candidate\.pathname\}\$\{candidate\.search\}\$\{candidate\.hash\}`\)/);
   assert.match(confirm, /safeConfirmationRedirect\(request\.nextUrl\.searchParams\.get\('next'\)\)/);
});

test('R3B Members settings exposes real invitation administration and truthful delivery readiness', async () => {
   const settings = await readSource('components/common/settings/workspace-members-settings.tsx');

   assert.match(settings, /\/api\/invitations\?organization=/);
   assert.match(settings, /\/api\/teams\?organization=/);
   assert.match(settings, /email: inviteEmail,[\s\S]*role: inviteRole,[\s\S]*teamIds: selectedTeamIds/);
   assert.match(settings, /\/resend\?organization=/);
   assert.match(settings, /method: 'DELETE'/);
   assert.match(settings, /!invitationDelivery\.available/);
   assert.match(settings, /Send invitation/);
   assert.match(settings, /Resend/);
   assert.match(settings, /Revoke invitation for/);
});
