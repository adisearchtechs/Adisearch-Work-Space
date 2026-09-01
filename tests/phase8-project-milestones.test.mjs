import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project milestone contracts validate names, dates and non-empty patches', async () => {
   const contracts = await readSource('lib/project-milestones/contracts.ts');

   assert.match(contracts, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
   assert.match(contracts, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
   assert.match(contracts, /completed: z\.boolean\(\)\.optional\(\)/);
   assert.match(contracts, /At least one milestone field is required/);
});

test('milestone APIs enforce authentication, tenant scope and same-origin writes', async () => {
   const collection = await readSource('app/api/projects/[projectId]/milestones/route.ts');
   const item = await readSource(
      'app/api/projects/[projectId]/milestones/[milestoneId]/route.ts'
   );
   const server = await readSource('lib/project-milestones/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /createProjectMilestoneSchema\.safeParse\(input\)/);
   assert.match(collection, /\.from\('project_milestones'\)/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
   assert.match(item, /updateProjectMilestoneSchema\.safeParse\(input\)/);
   assert.match(item, /export async function DELETE/);
   assert.match(item, /\.eq\('project_id', projectId\)/);
});

test('configured project milestone UI is server-backed and supports create, complete and delete', async () => {
   const page = await readSource('components/common/projects/details/project-milestones.tsx');
   const hook = await readSource('components/common/projects/details/use-project-milestones.ts');
   const sidePanel = await readSource('components/common/projects/details/project-side-panel.tsx');
   const header = await readSource('components/layout/headers/project/header.tsx');

   assert.match(hook, /\/milestones\?organization=/);
   assert.match(page, /method: 'POST'/);
   assert.match(page, /method: 'PATCH'/);
   assert.match(page, /method: 'DELETE'/);
   assert.match(page, /workspace\.user\.role !== 'guest'/);
   assert.match(page, /Add milestone/);
   assert.match(page, /Mark \$\{milestone\.name\} complete/);
   assert.match(sidePanel, /milestones: milestones\.map/);
   assert.match(sidePanel, /if \(!workspace\.configured\) return detail/);
   assert.match(header, /\{ label: 'Milestones', segment: 'milestones' \}/);
});

test('project milestone migration is tenant scoped, indexed and RLS protected', async () => {
   const migration = await readSource(
      'supabase/migrations/20260901212039_add_project_milestones.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.project_milestones/);
   assert.match(migration, /references public\.projects \(id, organization_id\) on delete cascade/);
   assert.match(migration, /char_length\(name\) between 1 and 160/);
   assert.match(migration, /project_milestones_project_organization_idx/);
   assert.match(migration, /alter table public\.project_milestones enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(
      migration,
      /grant select, insert, update, delete on table public\.project_milestones to authenticated/
   );
   assert.match(databaseTypes, /project_milestones: Table</);
   assert.match(databaseTypes, /target_date: string \| null/);
   assert.match(databaseTypes, /completed: boolean/);
});
