import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('initiative contracts bound writable fields and require UUID project ids', async () => {
   const contracts = await readSource('lib/initiatives/contracts.ts');
   assert.match(contracts, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
   assert.match(contracts, /description: z\.string\(\)\.max\(20000\)/);
   assert.match(contracts, /assignInitiativeProjectSchema = z\.object\(\{ projectId: z\.string\(\)\.uuid\(\) \}\)\.strict\(\)/);
});

test('initiative APIs are authenticated, mutation-origin checked and tenant scoped', async () => {
   const collection = await readSource('app/api/initiatives/route.ts');
   const item = await readSource('app/api/initiatives/[initiativeId]/route.ts');
   const assignments = await readSource('app/api/initiatives/[initiativeId]/projects/route.ts');
   const assignment = await readSource(
      'app/api/initiatives/[initiativeId]/projects/[projectId]/route.ts'
   );
   const server = await readSource('lib/initiatives/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(assignments, /hasValidMutationOrigin\(request\)/);
   assert.match(assignment, /hasValidMutationOrigin\(request\)/);
   assert.match(assignments, /assignInitiativeProjectSchema\.safeParse\(input\)/);
   assert.match(assignments, /\.from\('initiative_projects'\)/);
   assert.match(assignments, /\.from\('projects'\)/);
   assert.match(assignment, /export async function DELETE/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
});

test('configured initiative and project surfaces use persistent APIs while demo mode remains available', async () => {
   const listRoot = await readSource('components/common/initiatives/initiatives-root.tsx');
   const detailRoot = await readSource('components/common/initiatives/initiative-details-root.tsx');
   const projectOverview = await readSource('components/common/projects/details/project-overview.tsx');
   const projectInitiatives = await readSource(
      'components/common/projects/details/project-initiatives.tsx'
   );

   assert.match(listRoot, /workspace\.configured/);
   assert.match(detailRoot, /workspace\.configured/);
   assert.match(projectOverview, /ProjectInitiatives/);
   assert.match(projectInitiatives, /workspace\.user\.role !== 'guest'/);
   assert.match(projectInitiatives, /\/api\/initiatives\?organization=/);
   assert.match(projectInitiatives, /method: 'POST'/);
   assert.match(projectInitiatives, /method: 'DELETE'/);
   assert.match(projectInitiatives, /Choose initiative/);
});

test('initiative migrations preserve tenant identity, RLS and composite foreign-key coverage', async () => {
   const migration = await readSource('supabase/migrations/20260901215309_add_initiatives.sql');
   const coverInitiativeFk = await readSource(
      'supabase/migrations/20260901215853_cover_initiative_projects_initiative_foreign_key.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.initiatives/);
   assert.match(migration, /create table public\.initiative_projects/);
   assert.match(migration, /unique \(id, organization_id\)/);
   assert.match(migration, /references public\.initiatives \(id, organization_id\) on delete cascade/);
   assert.match(migration, /references public\.projects \(id, organization_id\) on delete cascade/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(coverInitiativeFk, /initiative_projects_initiative_organization_idx/);
   assert.match(coverInitiativeFk, /\(initiative_id, organization_id\)/);
   assert.match(databaseTypes, /initiatives: Table</);
   assert.match(databaseTypes, /initiative_projects: Table</);
});
