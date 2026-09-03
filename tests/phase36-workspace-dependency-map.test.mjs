import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('workspace dependency API authenticates membership and scopes every source to the organization', async () => {
   const route = await readSource('app/api/dependencies/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /\.from\('organization_members'\)/);
   assert.match(route, /\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /\.from\('teams'\)/);
   assert.match(route, /\.from\('statuses'\)/);
   assert.match(route, /\.from\('issues'\)/);
   assert.match(route, /\.from\('projects'\)/);
   assert.match(route, /\.from\('issue_relations'\)/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
});

test('dependency read model uses only explicit unresolved blocks relationships', async () => {
   const route = await readSource('app/api/dependencies/route.ts');

   assert.match(route, /\.eq\('relation_type', 'blocks'\)/);
   assert.match(route, /isClosed\(sourceStatus\.category\) \|\| isClosed\(targetStatus\.category\)/);
   assert.match(route, /source\.project_id !== target\.project_id/);
   assert.match(route, /target\.due_date && target\.due_date < today/);
   assert.match(route, /projectlessDependencies/);
   assert.doesNotMatch(route, /relation_type', 'parent'/);
   assert.doesNotMatch(route, /relation_type', 'related'/);
});

test('project dependency rollup preserves inbound outbound and unique project relationships', async () => {
   const route = await readSource('app/api/dependencies/route.ts');

   assert.match(route, /sourceAggregate\.outbound\.push\(dependency\)/);
   assert.match(route, /targetAggregate\.inbound\.push\(dependency\)/);
   assert.match(route, /blockedByProjectIds\.add\(sourceProjectId\)/);
   assert.match(route, /blocksProjectIds\.add\(targetProjectId\)/);
   assert.match(route, /overdueBlockedIssueIds\.add\(dependency\.blocked\.id\)/);
});

test('configured dependency page renders persistent project and issue relationships and is reachable from workspace navigation', async () => {
   const page = await readSource('app/[orgId]/dependencies/page.tsx');
   const map = await readSource('components/common/workspace/workspace-dependency-map.tsx');
   const nav = await readSource('components/layout/sidebar/nav-workspace.tsx');

   assert.match(page, /WorkspaceDependencyMap/);
   assert.match(map, /\/api\/dependencies\?organization=/);
   assert.match(map, /Project dependency map/);
   assert.match(map, /Unresolved blocking relationships/);
   assert.match(map, /dependency\.blocking/);
   assert.match(map, /dependency\.blocked/);
   assert.match(nav, /href=\{`\/\$\{orgId\}\/dependencies`\}/);
   assert.match(nav, /<span>Dependencies<\/span>/);
});

test('Phase 36 reuses released issue relation schema and rejects fabricated delivery analytics', async () => {
   const scope = await readSource('PHASE36_SCOPE.md');

   assert.match(scope, /No new database migration is required/i);
   assert.match(scope, /Only explicit persisted `blocks` edges are treated as dependencies/i);
   assert.match(scope, /Completed or canceled blocking issues resolve the dependency/i);
   assert.match(scope, /Issues without projects remain visible at issue level/i);
   assert.match(scope, /does not infer capacity, velocity, workload percentage, or predicted completion dates/i);
});
