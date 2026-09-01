import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('initiative resource contracts bound labels and allow only HTTP(S) URLs', async () => {
   const contracts = await readSource('lib/initiative-resources/contracts.ts');
   assert.match(contracts, /label: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(120\)/);
   assert.match(contracts, /\.max\(2048\)/);
   assert.match(contracts, /protocol === 'https:' \|\| protocol === 'http:'/);
   assert.match(contracts, /At least one resource field is required/);
});

test('initiative resource APIs are tenant scoped, origin checked and guest protected', async () => {
   const collection = await readSource('app/api/initiatives/[initiativeId]/resources/route.ts');
   const item = await readSource('app/api/initiatives/[initiativeId]/resources/[resourceId]/route.ts');
   const server = await readSource('lib/initiative-resources/server.ts');
   const initiativeServer = await readSource('lib/initiatives/server.ts');

   assert.match(server, /authorizeInitiativeAccess\(request, requireWrite, failureMessage, initiativeId\)/);
   assert.match(initiativeServer, /membership\.role === 'guest'/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /\.from\('initiative_resources'\)/);
   assert.match(collection, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(collection, /\.eq\('initiative_id', initiativeId\)/);
   assert.match(item, /export async function PATCH/);
   assert.match(item, /export async function DELETE/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
});

test('initiative overview exposes persistent resource CRUD with correctly shaped item URLs', async () => {
   const resources = await readSource('components/common/initiatives/initiative-resources.tsx');
   const details = await readSource('components/common/initiatives/persistent-initiative-details.tsx');

   assert.match(details, /InitiativeResources initiativeId=\{initiative\.id\}/);
   assert.match(resources, /workspace\.user\.role !== 'guest'/);
   assert.match(resources, /\/resources\/\$\{encodeURIComponent\(resourceId\)\}\?organization=/);
   assert.match(resources, /method: editingId \? 'PATCH' : 'POST'/);
   assert.match(resources, /method: 'DELETE'/);
   assert.match(resources, /target="_blank"/);
   assert.match(resources, /rel="noreferrer noopener"/);
});

test('initiative resource migration has explicit grants, RLS and composite foreign-key coverage', async () => {
   const migration = await readSource(
      'supabase/migrations/20260901223218_add_initiative_resources.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.initiative_resources/);
   assert.match(
      migration,
      /references public\.initiatives \(id, organization_id\) on delete cascade/
   );
   assert.match(migration, /initiative_resources_initiative_organization_idx/);
   assert.match(migration, /alter table public\.initiative_resources enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(
      migration,
      /grant select, insert, update, delete on table public\.initiative_resources to authenticated/
   );
   assert.match(databaseTypes, /initiative_resources: Table</);
});
