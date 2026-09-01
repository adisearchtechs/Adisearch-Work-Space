import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('team contracts bound identifiers, names, colors, and membership IDs', async () => {
   const contracts = await readSource('lib/teams/contracts.ts');
   assert.match(contracts, /z\.string\(\)\.trim\(\)\.min\(2\)\.max\(80\)/);
   assert.match(contracts, /\^\[A-Z\]\[A-Z0-9\]\{1,9\}\$/);
   assert.match(contracts, /\^#\[0-9A-Fa-f\]\{6\}\$/);
   assert.match(contracts, /userId: z\.string\(\)\.uuid\(\)/);
   assert.match(contracts, /At least one team field is required/);
});

test('team APIs enforce tenant membership and owner-admin mutations', async () => {
   const collection = await readSource('app/api/teams/route.ts');
   const item = await readSource('app/api/teams/[teamId]/route.ts');
   const members = await readSource('app/api/teams/[teamId]/members/route.ts');
   const member = await readSource('app/api/teams/[teamId]/members/[userId]/route.ts');
   const server = await readSource('lib/teams/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role !== 'owner' && membership\.role !== 'admin'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(members, /hasValidMutationOrigin\(request\)/);
   assert.match(member, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /error\?\.code === '23505'/);
   assert.match(item, /error\.code === '23505'/);
   assert.match(collection, /\.from\('team_members'\)\.insert/);
   assert.match(members, /User is not a workspace member/);
});

test('configured team settings use persistent data and admin-only membership controls', async () => {
   const list = await readSource('components/common/settings/new-team.tsx');
   const settings = await readSource('components/common/settings/team-settings.tsx');

   assert.match(list, /\/api\/teams\?organization=/);
   assert.match(list, /workspace\.configured\s*\? teams/);
   assert.match(list, /method: 'POST'/);
   assert.match(list, /Only workspace owners and admins can create teams or change membership/);
   assert.match(settings, /method: 'PATCH'/);
   assert.match(settings, /\/members\?organization=/);
   assert.match(settings, /method: 'DELETE'/);
   assert.match(settings, /Workspace owners and admins control team membership/);
   assert.match(settings, /Hard team deletion is intentionally deferred/);
});

test('Phase 16 reuses existing secured team tables without a production migration', async () => {
   const scope = await readSource('PHASE16_SCOPE.md');
   const collection = await readSource('app/api/teams/route.ts');

   assert.match(scope, /No new Phase 16 database migration is required/);
   assert.match(scope, /issues: `ON DELETE RESTRICT`/);
   assert.match(scope, /projects: `ON DELETE CASCADE`/);
   assert.match(scope, /Phase 17/);
   assert.match(collection, /\.from\('teams'\)/);
   assert.match(collection, /\.from\('team_members'\)/);
});
