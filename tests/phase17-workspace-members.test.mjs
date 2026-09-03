import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('workspace member contracts exclude ownership transfer from role updates', async () => {
   const contracts = await readSource('lib/workspace-members/contracts.ts');
   assert.match(contracts, /z\.enum\(\['admin', 'member', 'guest'\]\)/);
   assert.match(contracts, /WorkspaceMemberRole = 'owner' \| 'admin' \| 'member' \| 'guest'/);
});

test('workspace member APIs authenticate, tenant-scope, origin-check and protect privileged roles', async () => {
   const collection = await readSource('app/api/members/route.ts');
   const item = await readSource('app/api/members/[userId]/route.ts');
   const server = await readSource('lib/workspace-members/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role !== 'owner' && membership\.role !== 'admin'/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /target\.role === 'owner'/);
   assert.match(item, /target\.user_id === actorId/);
   assert.match(item, /actorRole === 'admin' && target\.role === 'admin'/);
   assert.match(item, /actorRole === 'admin' && requestedRole === 'admin'/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
});

test('member removal preflights historical issue creators and otherwise deletes tenant membership', async () => {
   const item = await readSource('app/api/members/[userId]/route.ts');
   assert.match(item, /select\('id', \{ count: 'exact', head: true \}\)/);
   assert.match(item, /\.eq\('creator_id', userId\)/);
   assert.match(item, /status: 409/);
   assert.match(item, /Reassignment support is required before removal/);
   assert.match(item, /\.from\('organization_members'\)/);
   assert.match(item, /\.delete\(\)/);
});

test('members settings is dedicated, permission-aware and invitation-safe', async () => {
   const settings = await readSource('components/common/settings/workspace-members-settings.tsx');
   const dispatcher = await readSource('app/[orgId]/settings/[section]/page.tsx');
   const nav = await readSource('components/layout/sidebar/nav-settings.tsx');

   assert.match(settings, /\/api\/members\?organization=/);
   assert.match(settings, /method: 'PATCH'/);
   assert.match(settings, /method: 'DELETE'/);
   assert.match(settings, /actorRole === 'owner'/);
   assert.match(settings, /\/api\/invitations\?organization=/);
   assert.match(settings, /!invitationDelivery\.available/);
   assert.match(settings, /Send invitation/);
   assert.match(settings, /\/resend\?organization=/);
   assert.match(dispatcher, /'members': WorkspaceMembersSettings/);
   assert.match(nav, /name: 'Members', url: '\/settings\/members'/);
});

test('Phase 17 reuses existing RLS tables and records invitation/removal boundaries', async () => {
   const scope = await readSource('PHASE17_SCOPE.md');
   assert.match(scope, /No new Phase 17 migration is required/);
   assert.match(scope, /historical issue creator → `RESTRICT`/);
   assert.match(scope, /Email invitation delivery is deferred/);
   assert.match(scope, /Phases 14–16/);
});
