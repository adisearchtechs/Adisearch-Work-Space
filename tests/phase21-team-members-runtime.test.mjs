import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('configured team members resolve persistent team details without mock leakage', async () => {
   const members = await readSource('components/common/teams/team-members.tsx');

   assert.match(members, /resolveTeamReference\(teams, teamId\)/);
   assert.match(members, /\/api\/teams\/\$\{encodeURIComponent\(resolvedTeam\.id\)\}/);
   assert.match(members, /TeamDetailsDto/);
   assert.match(members, /details\.members/);
   assert.match(members, /details\.organizationMembers/);
   assert.match(members, /if \(!workspace\.configured\)/);
   assert.match(members, /Demo membership is read-only/);
});

test('team membership writes remain owner-admin controlled and tenant scoped', async () => {
   const collection = await readSource('app/api/teams/[teamId]/members/route.ts');
   const item = await readSource('app/api/teams/[teamId]/members/[userId]/route.ts');
   const server = await readSource('lib/teams/server.ts');

   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /authorizeTeamAccess\(request, true/);
   assert.match(item, /authorizeTeamAccess\(request, true/);
   assert.match(collection, /User is not a workspace member/);
   assert.match(collection, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(item, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(server, /membership\.role !== 'owner' && membership\.role !== 'admin'/);
});

test('runtime membership management adds removes and refreshes shared team state', async () => {
   const members = await readSource('components/common/teams/team-members.tsx');

   assert.match(members, /method: 'POST'/);
   assert.match(members, /JSON\.stringify\(\{ userId: member\.id \}\)/);
   assert.match(members, /method: 'DELETE'/);
   assert.match(members, /window\.confirm/);
   assert.match(members, /Promise\.all\(\[refreshDetails\(\), refreshRuntimeTeams\(\)\]\)/);
   assert.match(members, /replaceTeams\(workspace\.organization\.slug, result\.teams, result\.joinedTeamIds\)/);
   assert.match(members, /canAdmin &&/);
});

test('configured team navigation restores the persistent members surface', async () => {
   const tabs = await readSource('components/layout/headers/team/header-tabs.tsx');
   const nav = await readSource('components/layout/sidebar/nav-teams.tsx');

   assert.match(tabs, /\{ label: 'Members', segment: 'members' \}/);
   assert.match(nav, /team\/\$\{team\.key\}\/members/);
   assert.match(nav, /<Users size=\{14\} \/>/);
});

test('Phase 21 adds no database migration and preserves workspace-role authority', async () => {
   const scope = await readSource('PHASE21_SCOPE.md');
   const contracts = await readSource('lib/teams/contracts.ts');

   assert.match(scope, /No new Phase 21 database migration is required/);
   assert.match(scope, /Workspace role is authoritative/);
   assert.match(scope, /does not introduce team-specific admin roles/);
   assert.match(contracts, /role: OrganizationRole/);
});
