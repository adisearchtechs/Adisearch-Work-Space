import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('workspace statuses API is authenticated, tenant-scoped, ordered, and private', async () => {
   const route = await readSource('app/api/statuses/route.ts');
   const contracts = await readSource('lib/workspace-statuses/contracts.ts');

   assert.match(route, /authorizeWorkspaceMemberAccess/);
   assert.match(route, /\.from\('statuses'\)/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /\.order\('position'\)/);
   assert.match(route, /Cache-Control': 'private, no-store'/);
   assert.match(contracts, /WorkspaceStatusCategory/);
   assert.match(contracts, /position: number/);
});

test('configured status loader uses persisted status rows and fails closed', async () => {
   const hook = await readSource('components/common/issues/use-workspace-statuses.tsx');

   assert.match(hook, /\/api\/statuses\?organization=/);
   assert.match(hook, /credentials: 'same-origin'/);
   assert.match(hook, /nextStatuses\.map\(toRuntimeStatus\)/);
   assert.match(hook, /setLoadError\(true\)/);
   assert.match(hook, /toast\.error\('Unable to load workspace statuses\.'\)/);
   assert.match(hook, /import type \{ Status \} from '@\/mock-data\/status'/);
});

test('configured milestone planning does not execute demo project or status fallbacks', async () => {
   const planning = await readSource(
      'components/common/projects/details/project-milestone-planning.tsx'
   );

   assert.match(planning, /workspace\.configured\s*\?\s*null\s*:\s*getProjectDetail\(projectId\)/);
   assert.match(
      planning,
      /displayedStatuses = workspace\.configured \? workspaceStatuses : displayOrderedStatus/
   );
   assert.match(planning, /statusesLoadError/);
   assert.match(planning, /Unable to load milestone workflow/);
   assert.match(planning, /statuses=\{displayedStatuses\}/);
   assert.doesNotMatch(planning, /const detail = getProjectDetail\(projectId\)/);
});

test('Phase 43 scope records the configured truthfulness and release boundaries', async () => {
   const scope = await readSource('PHASE43_SCOPE.md');

   assert.match(scope, /Persistent Status Catalog/i);
   assert.match(scope, /existing tenant-scoped `statuses` table/i);
   assert.match(scope, /never calls `getProjectDetail\(\)`/i);
   assert.match(scope, /never uses `displayOrderedStatus` as a fallback/i);
   assert.match(scope, /fail closed/i);
   assert.match(scope, /does not add or modify database schema/i);
   assert.match(scope, /Browser E2E and Authenticated E2E/i);
});
