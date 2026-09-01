import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project label assignment contract requires a UUID label id', async () => {
   const contracts = await readSource('lib/project-labels/contracts.ts');
   assert.match(contracts, /labelId: z\.string\(\)\.uuid\(\)/);
});

test('project label APIs are authenticated, origin checked and tenant scoped', async () => {
   const collection = await readSource('app/api/projects/[projectId]/labels/route.ts');
   const item = await readSource('app/api/projects/[projectId]/labels/[labelId]/route.ts');
   const server = await readSource('lib/project-labels/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /assignProjectLabelSchema\.safeParse\(input\)/);
   assert.match(collection, /\.from\('project_labels'\)/);
   assert.match(collection, /\.from\('labels'\)/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
   assert.match(item, /export async function DELETE/);
   assert.match(item, /\.eq\('project_id', projectId\)/);
   assert.match(item, /\.eq\('label_id', labelId\)/);
});

test('configured project overview replaces mock chips with persistent label controls', async () => {
   const overview = await readSource('components/common/projects/details/project-overview.tsx');
   const labels = await readSource('components/common/projects/details/project-labels.tsx');

   assert.match(overview, /ProjectLabels projectId=\{project\.id\} demoLabels=\{project\.labels\}/);
   assert.match(labels, /workspace\.user\.role !== 'guest'/);
   assert.match(labels, /method: 'POST'/);
   assert.match(labels, /method: 'DELETE'/);
   assert.match(labels, /Choose project label/);
   assert.match(labels, /Remove \$\{label\.name\}/);
   assert.match(labels, /if \(!workspace\.configured\) return/);
});

test('project labels migration preserves tenant identity and RLS boundaries', async () => {
   const migration = await readSource('supabase/migrations/20260901214252_add_project_labels.sql');
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.project_labels/);
   assert.match(migration, /primary key \(project_id, label_id\)/);
   assert.match(migration, /references public\.projects \(id, organization_id\) on delete cascade/);
   assert.match(migration, /references public\.labels \(id, organization_id\) on delete cascade/);
   assert.match(migration, /project_labels_label_organization_idx/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(databaseTypes, /project_labels: Table</);
});
