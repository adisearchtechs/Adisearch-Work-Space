import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('team operating dashboard is a tenant-scoped read model', async () => {
   const route = await readSource('app/api/teams/[teamId]/dashboard/route.ts');

   assert.match(route, /authorizeTeamAccess\(/);
   assert.match(route, /Unable to load team dashboard/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /Cache-Control': 'private, no-store'/);
   assert.doesNotMatch(route, /\.insert\(/);
   assert.doesNotMatch(route, /\.update\(/);
   assert.doesNotMatch(route, /\.delete\(/);
});

test('dashboard derives cycle progress, attention signals, and owned project health from persisted data', async () => {
   const route = await readSource('app/api/teams/[teamId]/dashboard/route.ts');

   assert.match(route, /\.from\('cycles'\)/);
   assert.match(route, /\.from\('issues'\)/);
   assert.match(route, /\.from\('projects'\)/);
   assert.match(route, /\.from\('project_updates'\)/);
   assert.match(route, /status\.slug === 'blocked'/);
   assert.match(route, /issue\.priority === 'urgent'/);
   assert.match(route, /issue\.due_date < today/);
   assert.match(route, /successRate/);
   assert.match(route, /latestHealthByProject/);
   assert.match(route, /progress:/);
});

test('configured team overview renders the operating dashboard without replacing demo mode', async () => {
   const overview = await readSource('components/common/teams/team-overview.tsx');

   assert.match(overview, /\/dashboard\$\{query\}/);
   assert.match(overview, /TeamDashboardResponse/);
   assert.match(overview, /Team operating metrics/);
   assert.match(overview, />Current cycle</);
   assert.match(overview, />Attention</);
   assert.match(overview, />Owned projects</);
   assert.match(overview, /Pinned documents/);
   assert.match(overview, /if \(!workspace\.configured\)/);
   assert.match(overview, /Demo team overview/);
});

test('Phase 34 deliberately avoids fabricated capacity analytics and schema churn', async () => {
   const scope = await readSource('PHASE34_SCOPE.md');

   assert.match(scope, /No new database migration/i);
   assert.match(scope, /truthful/i);
   assert.match(scope, /capacity forecasts/i);
   assert.match(scope, /one real workspace member/i);
   assert.match(scope, /current cycle/i);
   assert.match(scope, /project health/i);
});
