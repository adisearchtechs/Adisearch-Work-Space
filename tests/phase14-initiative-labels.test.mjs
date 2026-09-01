import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('initiative label contract only accepts UUID label ids', async () => {
   const contracts = await readSource('lib/initiative-labels/contracts.ts');
   assert.match(contracts, /labelId: z\.string\(\)\.uuid\(\)/);
   assert.match(contracts, /\.strict\(\)/);
});

test('initiative label APIs are tenant scoped, origin checked and guest protected', async () => {
   const collection = await readSource('app/api/initiatives/[initiativeId]/labels/route.ts');
   const item = await readSource('app/api/initiatives/[initiativeId]/labels/[labelId]/route.ts');
   const server = await readSource('lib/initiative-labels/server.ts');
   const initiativeServer = await readSource('lib/initiatives/server.ts');

   assert.match(server, /authorizeInitiativeAccess\(request, requireWrite, failureMessage, initiativeId\)/);
   assert.match(initiativeServer, /membership\.role === 'guest'/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /\.from\('labels'\)/);
   assert.match(collection, /\.from\('initiative_labels'\)/);
   assert.match(collection, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(collection, /\.eq\('initiative_id', initiativeId\)/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
   assert.match(item, /export async function DELETE/);
});

test('initiative overview exposes persistent label assignment and removal', async () => {
   const labels = await readSource('components/common/initiatives/initiative-labels.tsx');
   const details = await readSource('components/common/initiatives/persistent-initiative-details.tsx');

   assert.match(details, /InitiativeLabels initiativeId=\{initiative\.id\}/);
   assert.match(labels, /workspace\.user\.role !== 'guest'/);
   assert.match(labels, /method: 'POST'/);
   assert.match(labels, /method: 'DELETE'/);
   assert.match(labels, /Choose initiative label/);
   assert.match(labels, /No labels assigned/);
});

test('initiative labels migration has explicit grants, RLS and both composite foreign-key indexes', async () => {
   const migration = await readSource('supabase/migrations/20260901224148_add_initiative_labels.sql');
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.initiative_labels/);
   assert.match(migration, /references public\.initiatives \(id, organization_id\) on delete cascade/);
   assert.match(migration, /references public\.labels \(id, organization_id\) on delete cascade/);
   assert.match(migration, /initiative_labels_initiative_organization_idx/);
   assert.match(migration, /initiative_labels_label_organization_idx/);
   assert.match(migration, /alter table public\.initiative_labels enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /grant select, insert, delete on table public\.initiative_labels to authenticated/);
   assert.match(databaseTypes, /initiative_labels: Table</);
});
