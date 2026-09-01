import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('initiative update contract bounds bodies and enforces health semantics', async () => {
   const contracts = await readSource('lib/initiative-updates/contracts.ts');

   assert.match(contracts, /initiativeUpdateKindSchema = z\.enum\(\['update', 'comment'\]\)/);
   assert.match(contracts, /initiativeUpdateHealthSchema = z\.enum\(\['on-track', 'at-risk', 'off-track'\]\)/);
   assert.match(contracts, /body: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(10000\)/);
   assert.match(contracts, /value\.kind === 'update' && !value\.health/);
   assert.match(contracts, /value\.kind === 'comment' && value\.health != null/);
});

test('initiative update API is authenticated, origin checked and tenant scoped', async () => {
   const route = await readSource('app/api/initiatives/[initiativeId]/updates/route.ts');
   const server = await readSource('lib/initiatives/server.ts');

   assert.match(route, /authorizeInitiativeAccess\(/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /createInitiativeUpdateSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('initiative_updates'\)/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /\.eq\('initiative_id', initiativeId\)/);
   assert.match(route, /\.limit\(200\)/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
   assert.match(server, /membership\.role === 'guest'/);
});

test('configured initiative activity loads and posts persistent updates with guest write protection', async () => {
   const activity = await readSource('components/common/initiatives/initiative-activity.tsx');
   const detail = await readSource('components/common/initiatives/persistent-initiative-details.tsx');

   assert.match(detail, /InitiativeActivity initiative=\{initiative\}/);
   assert.match(activity, /workspace\.user\.role !== 'guest'/);
   assert.match(activity, /\/api\/initiatives\/\$\{encodeURIComponent\(initiative\.id\)\}\/updates/);
   assert.match(activity, /method: 'POST'/);
   assert.match(activity, /Post \$\{mode\}/);
   assert.match(activity, /Loading initiative updates/);
   assert.match(activity, /No updates yet/);
   assert.match(activity, /maxLength=\{10000\}/);
});

test('initiative updates migration is append-only, RLS protected and covers the composite foreign key', async () => {
   const migration = await readSource(
      'supabase/migrations/20260901221047_add_initiative_updates.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.initiative_updates/);
   assert.match(migration, /references public\.initiatives \(id, organization_id\) on delete cascade/);
   assert.match(migration, /initiative_updates_initiative_organization_idx/);
   assert.match(migration, /\(initiative_id, organization_id\)/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /author_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /grant select, insert on table public\.initiative_updates to authenticated/);
   assert.doesNotMatch(migration, /grant select, insert, update/);
   assert.match(databaseTypes, /initiative_updates: Table</);
});
