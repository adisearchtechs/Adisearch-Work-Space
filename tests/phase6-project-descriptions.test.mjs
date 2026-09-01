import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project descriptions are bounded in create and update contracts', async () => {
   const contracts = await readSource('lib/projects/contracts.ts');

   assert.match(contracts, /description: z\.string\(\)\.max\(20000\)\.optional\(\)/);
   assert.match(contracts, /export type ProjectDto = \{[\s\S]*description: string;/);
});

test('project APIs load, create, and tenant-scope description updates', async () => {
   const collectionRoute = await readSource('app/api/projects/route.ts');
   const projectRoute = await readSource('app/api/projects/[projectId]/route.ts');

   assert.match(
      collectionRoute,
      /\.select\('id, team_id, name, description, status, lead_id, target_date, created_at'\)/
   );
   assert.match(collectionRoute, /description: parsed\.data\.description \?\? ''/);
   assert.match(collectionRoute, /description: row\.description/);
   assert.match(projectRoute, /parsed\.data\.description !== undefined/);
   assert.match(projectRoute, /description: parsed\.data\.description/);
   assert.match(
      projectRoute,
      /\.update\(changes\)[\s\S]*\.eq\('id', projectId\)[\s\S]*\.eq\('organization_id', organization\.id\)/
   );
});

test('project store preserves optimistic description edits and field-specific rollback', async () => {
   const mapper = await readSource('lib/projects/mapper.ts');
   const store = await readSource('store/projects-store.ts');
   const provider = await readSource('components/providers/saas-projects-provider.tsx');

   assert.match(mapper, /description: dto\.description/);
   assert.match(mapper, /changes\.description !== undefined/);
   assert.match(store, /currentProject\.description === optimisticProject\.description/);
   assert.match(store, /restoredProject\.description = previousProject\.description/);
   assert.match(provider, /changes\.description !== undefined/);
});

test('project edit dialog authors descriptions within the database limit', async () => {
   const dialog = await readSource('components/common/projects/edit-project-dialog.tsx');

   assert.match(dialog, /htmlFor="edit-project-description"/);
   assert.match(dialog, /id="edit-project-description"/);
   assert.match(dialog, /maxLength=\{20000\}/);
   assert.match(dialog, /normalizedDescription !== currentDescription/);
   assert.match(dialog, /description: normalizedDescription/);
});

test('configured workspaces render persisted descriptions instead of deterministic mock copy', async () => {
   const overview = await readSource('components/common/projects/details/project-overview.tsx');

   assert.match(overview, /const persistedDescription = project\.description\?\.trim\(\) \?\? ''/);
   assert.match(overview, /!workspace\.configured && \(/);
   assert.match(overview, /workspace\.configured \? \(/);
   assert.match(overview, /No description yet\. Use Edit project/);
});

test('migration adds a bounded non-null project description field', async () => {
   const migration = await readSource(
      'supabase/migrations/20260901183658_add_project_descriptions.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /alter table public\.projects/);
   assert.match(migration, /add column description text not null default ''/);
   assert.match(migration, /char_length\(description\) <= 20000/);
   assert.match(databaseTypes, /projects: Table<[\s\S]*description: string;/);
   assert.match(databaseTypes, /name: string;[\s\S]*description\?: string;/);
});
