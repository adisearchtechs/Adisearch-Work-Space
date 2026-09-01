import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('workspace label contracts bound names and validate hex colors', async () => {
   const contracts = await readSource('lib/workspace-labels/contracts.ts');

   assert.match(contracts, /z\.string\(\)\.trim\(\)\.min\(1\)\.max\(60\)/);
   assert.match(contracts, /\^#\[0-9A-Fa-f\]\{6\}\$/);
   assert.match(contracts, /At least one label field is required/);
});

test('workspace label APIs enforce auth, tenancy, origin checks, guest protection and duplicate handling', async () => {
   const collection = await readSource('app/api/labels/route.ts');
   const item = await readSource('app/api/labels/[labelId]/route.ts');
   const server = await readSource('lib/workspace-labels/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /createWorkspaceLabelSchema\.safeParse\(input\)/);
   assert.match(item, /updateWorkspaceLabelSchema\.safeParse\(input\)/);
   assert.match(collection, /error\.code === '23505'/);
   assert.match(item, /error\.code === '23505'/);
   assert.match(collection, /'Cache-Control': 'private, no-store'/);
   assert.match(item, /export async function DELETE/);
});

test('workspace label settings uses persisted catalog without mixing configured mock data', async () => {
   const settings = await readSource('components/common/settings/issue-labels-settings.tsx');

   assert.match(settings, /\/api\/labels\?organization=/);
   assert.match(settings, /workspace\.configured \? labels : demoRows/);
   assert.match(settings, /workspace\.user\.role !== 'guest'/);
   assert.match(settings, /method: 'POST'/);
   assert.match(settings, /method: 'PATCH'/);
   assert.match(settings, /method: 'DELETE'/);
   assert.match(settings, /One shared label catalog for issues, projects, and initiatives/);
   assert.match(settings, /label\.usage\.issues/);
   assert.match(settings, /label\.usage\.projects/);
   assert.match(settings, /label\.usage\.initiatives/);
   assert.match(settings, /window\.confirm/);
});

test('Phase 15 reuses the existing secured labels table and adds no production migration', async () => {
   const scope = await readSource('PHASE15_SCOPE.md');
   const collection = await readSource('app/api/labels/route.ts');

   assert.match(scope, /No new database migration/i);
   assert.match(scope, /Phase 14/);
   assert.match(collection, /\.from\('labels'\)/);
   assert.match(collection, /\.from\('issue_labels'\)/);
   assert.match(collection, /\.from\('project_labels'\)/);
   assert.match(collection, /\.from\('initiative_labels'\)/);
});
