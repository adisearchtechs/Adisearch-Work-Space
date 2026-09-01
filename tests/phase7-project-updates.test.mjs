import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project update contracts distinguish updates from comments and bound body size', async () => {
   const contracts = await readSource('lib/project-updates/contracts.ts');

   assert.match(contracts, /z\.enum\(\['update', 'comment'\]\)/);
   assert.match(contracts, /z\.enum\(\['on-track', 'at-risk', 'off-track'\]\)/);
   assert.match(contracts, /body: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(10000\)/);
   assert.match(contracts, /value\.kind === 'update' && !value\.health/);
   assert.match(contracts, /value\.kind === 'comment' && value\.health != null/);
});

test('project updates API is authenticated, tenant scoped, and origin protected on writes', async () => {
   const route = await readSource('app/api/projects/[projectId]/updates/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /membership\.role === 'guest'/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /createProjectUpdateSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('project_updates'\)/);
   assert.match(route, /author_id: userId/);
   assert.match(route, /\.eq\('project_id', projectId\)/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
});

test('configured project activity loads and posts server-backed updates without mock history', async () => {
   const activity = await readSource('components/common/projects/details/project-activity.tsx');

   assert.match(activity, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/updates/);
   assert.match(activity, /replaceProjectUpdates\(projectId, updates\)/);
   assert.match(activity, /prependProjectUpdate\(project\.id, update\)/);
   assert.match(activity, /if \(workspace\.configured\) return runtimeUpdates/);
   assert.match(activity, /health: mode === 'update' \? health : null/);
   assert.match(activity, /maxLength=\{10000\}/);
   assert.match(activity, /Loading project updates…/);
});

test('unconfigured development retains a local project update fallback', async () => {
   const store = await readSource('store/project-updates-store.ts');

   assert.match(store, /updatesByProject: Record<string, ProjectUpdateDto\[\]>/);
   assert.match(store, /postLocalUpdate:/);
   assert.match(store, /kind === 'update' \? health : null/);
   assert.match(store, /createdAt: new Date\(\)\.toISOString\(\)/);
});

test('project updates migration is append-only, tenant scoped, and RLS protected', async () => {
   const migration = await readSource(
      'supabase/migrations/20260902210000_add_project_updates.sql'
   );
   const databaseTypes = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.project_updates/);
   assert.match(migration, /references public\.projects \(id, organization_id\) on delete cascade/);
   assert.match(migration, /char_length\(body\) between 1 and 10000/);
   assert.match(migration, /alter table public\.project_updates enable row level security/);
   assert.match(migration, /using \(private\.is_org_member\(organization_id\)\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /author_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /grant select, insert on table public\.project_updates to authenticated/);
   assert.doesNotMatch(migration, /grant select, insert, update/);
   assert.match(databaseTypes, /project_updates: Table</);
   assert.match(databaseTypes, /kind: 'update' \| 'comment'/);
   assert.match(databaseTypes, /health: 'on-track' \| 'at-risk' \| 'off-track' \| null/);
});
