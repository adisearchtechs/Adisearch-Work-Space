import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('issue contracts accept only nullable UUID project links', async () => {
   const contracts = await readSource('lib/issues/contracts.ts');

   const projectSchemas =
      contracts.match(/projectId: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/g) ?? [];
   assert.equal(projectSchemas.length, 2);
   assert.match(contracts, /projectId: string \| null/);
});

test('issue collection validates and returns tenant-scoped project links', async () => {
   const route = await readSource('app/api/issues/route.ts');

   assert.match(route, /project_id: parsed\.data\.projectId \?\? null/);
   assert.match(
      route,
      /\.from\('projects'\)[\s\S]*\.eq\('organization_id', organization\.id\)[\s\S]*\.eq\('id', parsed\.data\.projectId\)/
   );
   assert.match(route, /projectId: row\.project_id/);
   assert.match(route, /teamError \|\| statusError/);
});

test('issue updates validate project ownership and persist removal', async () => {
   const route = await readSource('app/api/issues/[issueId]/route.ts');

   assert.match(route, /const targetProjectId =/);
   assert.match(
      route,
      /\.from\('projects'\)[\s\S]*\.eq\('organization_id', existing\.organization_id\)[\s\S]*\.eq\('id', targetProjectId\)/
   );
   assert.match(route, /parsed\.data\.projectId !== undefined/);
   assert.match(route, /project_id: parsed\.data\.projectId/);
   assert.match(route, /if \(projectError\)[\s\S]*status: 500/);
});

test('configured issue hydration waits for the matching project workspace', async () => {
   const provider = await readSource('components/providers/saas-issues-provider.tsx');

   assert.match(provider, /projectsWorkspaceSlug !== workspace\.organization\.slug/);
   assert.match(provider, /projectsLoading/);
   assert.match(provider, /new Map\([\s\S]*useProjectsStore\.getState\(\)\.projects/);
   assert.match(provider, /issueDtoToIssue\(issue, projectById\)/);
   assert.match(provider, /projectId: changes\.project\?\.id \?\? null/);
});

test('every active project picker uses the tenant project store', async () => {
   const [selector, contextMenu, palette, details, filterColumns, filterTrigger] =
      await Promise.all([
         readSource('components/layout/sidebar/create-new-issue/project-selector.tsx'),
         readSource('components/common/issues/issue-context-menu.tsx'),
         readSource('components/layout/command-palette.tsx'),
         readSource('components/common/issues/details/issue-properties-panel.tsx'),
         readSource('components/common/issues/issue-filter-columns.tsx'),
         readSource('components/common/issues/issue-filter-trigger.tsx'),
      ]);

   for (const source of [selector, contextMenu, palette]) {
      assert.match(source, /useProjectsStore/);
      assert.doesNotMatch(source, /projects as allProjects|Project, projects/);
   }
   assert.match(details, /<ProjectSelector/);
   assert.match(details, /updateIssueProject\(issue\.id, project\)/);
   assert.match(filterColumns, /createIssueFilterColumns = \(projects: Project\[\]\)/);
   assert.match(filterTrigger, /createIssueFilterColumns\(projects\)/);
});

test('successful project deletion clears local issue links after the database cascade', async () => {
   const [provider, store] = await Promise.all([
      readSource('components/providers/saas-projects-provider.tsx'),
      readSource('store/issues-store.ts'),
   ]);

   assert.match(provider, /clearProjectReferences\(id\)/);
   assert.match(store, /clearProjectReferences: \(projectId: string\)/);
   assert.match(store, /issue\.project\?\.id === projectId/);
});

test('a rejected project update cannot overwrite a newer optimistic edit', async () => {
   const store = await readSource('store/issues-store.ts');

   assert.match(store, /restoreRejectedChanges/);
   assert.match(store, /Object\.is\(currentIssue\[key\], rejectedChanges\[key\]\)/);
   assert.match(store, /get\(\)\.persistenceAdapter !== adapter/);
});

test('project badges navigate to the linked project rather than the collection', async () => {
   const badge = await readSource('components/common/issues/project-badge.tsx');

   assert.match(badge, /project\/\$\{project\.id\}\/overview/);
});
