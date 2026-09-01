import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project resource contracts bound labels and require http(s) URLs', async () => {
   const contracts = await readSource('lib/project-resources/contracts.ts');
   assert.match(contracts, /label: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(120\)/);
   assert.match(contracts, /max\(2048\)/);
   assert.match(contracts, /protocol === 'https:' \|\| protocol === 'http:'/);
   assert.match(contracts, /At least one resource field is required/);
});

test('project resource APIs are authenticated, origin checked and tenant scoped', async () => {
   const collection = await readSource('app/api/projects/[projectId]/resources/route.ts');
   const item = await readSource('app/api/projects/[projectId]/resources/[resourceId]/route.ts');
   const server = await readSource('lib/project-resources/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /createProjectResourceSchema\.safeParse\(input\)/);
   assert.match(collection, /\.from\('project_resources'\)/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
   assert.match(item, /updateProjectResourceSchema\.safeParse\(input\)/);
   assert.match(item, /export async function DELETE/);
   assert.match(item, /\.eq\('project_id', projectId\)/);
});

test('configured project overview uses persistent resource controls', async () => {
   const overview = await readSource('components/common/projects/details/project-overview.tsx');
   const resources = await readSource('components/common/projects/details/project-resources.tsx');

   assert.match(overview, /ProjectResources projectId=\{project\.id\} demoResources=\{detail\.resources\}/);
   assert.match(resources, /method: editingId \? 'PATCH' : 'POST'/);
   assert.match(resources, /method: 'DELETE'/);
   assert.match(resources, /workspace\.user\.role !== 'guest'/);
   assert.match(resources, /target=\{workspace\.configured \? '_blank' : undefined\}/);
   assert.match(resources, /rel=\{workspace\.configured \? 'noreferrer noopener' : undefined\}/);
});

test('project resources migration is constrained, indexed and RLS protected', async () => {
   const migration = await readSource('supabase/migrations/20260901213419_add_project_resources.sql');
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.project_resources/);
   assert.match(migration, /char_length\(label\) between 1 and 120/);
   assert.match(migration, /char_length\(url\) between 1 and 2048/);
   assert.match(migration, /references public\.projects \(id, organization_id\) on delete cascade/);
   assert.match(migration, /project_resources_project_organization_idx/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(databaseTypes, /project_resources: Table</);
});
