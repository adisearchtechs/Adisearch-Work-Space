import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project collection API authenticates, validates, and scopes every tenant query', async () => {
   const route = await readSource('app/api/projects/route.ts');

   assert.match(route, /auth\.getClaims\(\)/);
   assert.match(route, /createProjectSchema\.safeParse/);
   assert.match(route, /hasValidMutationOrigin/);
   assert.match(route, /\.from\('projects'\)[\s\S]*\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /\.from\('teams'\)[\s\S]*\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /lead_id: userId/);
   assert.match(route, /Cache-Control': 'private, no-store'/);
});

test('project deletion fails closed when RLS matches no row', async () => {
   const route = await readSource('app/api/projects/[projectId]/route.ts');

   assert.match(route, /UUID_PATTERN\.test\(projectId\)/);
   assert.match(route, /auth\.getClaims\(\)/);
   assert.match(route, /\.delete\(\{ count: 'exact' \}\)/);
   assert.match(route, /\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /membership\.role === 'guest'/);
   assert.match(route, /if \(!count\).*status: 404/);
});

test('project deletion requires confirmation and restores only the rejected project', async () => {
   const line = await readSource('components/common/projects/project-line.tsx');
   const store = await readSource('store/projects-store.ts');

   assert.match(line, /<AlertDialog open={deleteDialogOpen}/);
   assert.match(line, /This action cannot be undone/);
   assert.match(line, /await deleteProject\(project\.id\)/);
   assert.match(store, /deleteProject: async/);
   assert.match(store, /await adapter\.delete\(id\)/);
   assert.match(store, /get\(\)\.persistenceAdapter === adapter/);
   assert.match(store, /\[\.\.\.state\.projects, deletedProject\]/);
});

test('configured project hydration cannot expose another workspace or demo dataset', async () => {
   const provider = await readSource('components/providers/saas-projects-provider.tsx');
   const projects = await readSource('components/common/projects/projects.tsx');
   const createDialog = await readSource('components/common/projects/create-project-dialog.tsx');

   assert.match(provider, /replaceWorkspace\(\[\], \[\], workspace\.organization\.slug\)/);
   assert.match(provider, /controller\.abort\(\)/);
   assert.match(provider, /replaceWorkspace\(\[\], \[\], null\)/);
   assert.match(projects, /workspaceSlug === workspace\.organization\.slug/);
   assert.match(createDialog, /!workspaceReady \|\| !canWrite \|\| teams\.length === 0/);
   assert.match(createDialog, /workspaceSlug !== requestedWorkspaceSlug/);
});

test('project creation uses real team metadata and the authenticated project API', async () => {
   const dialog = await readSource('components/common/projects/create-project-dialog.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');

   assert.match(dialog, /teams\.map\(\(team\)/);
   assert.match(dialog, /fetch\('\/api\/projects'/);
   assert.match(dialog, /organizationSlug: workspace\.organization\.slug/);
   assert.match(dialog, /workspace\.user\.role !== 'guest'/);
   assert.match(dialog, /addProject\(projectDtoToProject\(project\)\)/);
   assert.match(layout, /<SaasProjectsProvider>/);
});
