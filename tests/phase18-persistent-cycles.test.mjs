import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('cycle contracts bound names, dates, patches and issue assignment ids', async () => {
   const contracts = await readSource('lib/cycles/contracts.ts');
   assert.match(contracts, /z\.string\(\)\.trim\(\)\.min\(1\)\.max\(120\)/);
   assert.match(contracts, /z\.string\(\)\.date\(\)/);
   assert.match(contracts, /Cycle end date must be on or after the start date/);
   assert.match(contracts, /At least one cycle field is required/);
   assert.match(contracts, /issueId: z\.string\(\)\.uuid\(\)/);
   assert.match(contracts, /cycleId: z\.string\(\)\.uuid\(\)\.nullable\(\)/);
});

test('cycle APIs are authenticated, tenant scoped, origin checked and overlap protected', async () => {
   const collection = await readSource('app/api/teams/[teamId]/cycles/route.ts');
   const item = await readSource('app/api/teams/[teamId]/cycles/[cycleId]/route.ts');
   const assignment = await readSource('app/api/teams/[teamId]/cycles/issues/route.ts');
   const server = await readSource('lib/cycles/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(server, /\.eq\('key', teamReference\.toUpperCase\(\)\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(assignment, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /Cycle dates overlap an existing team cycle/);
   assert.match(item, /Cycle dates overlap an existing team cycle/);
   assert.match(assignment, /\.update\(\{ cycle_id: parsed\.data\.cycleId \}\)/);
});

test('configured cycle UI uses persistent CRUD and does not fabricate burn-up history', async () => {
   const cycles = await readSource('components/common/cycles/cycles.tsx');
   const header = await readSource('components/layout/headers/cycles/header-nav.tsx');

   assert.match(cycles, /\/api\/teams\/\$\{encodeURIComponent\(teamId\)\}\/cycles\?organization=/);
   assert.match(cycles, /method: 'POST'/);
   assert.match(cycles, /'PATCH'/);
   assert.match(cycles, /'DELETE'/);
   assert.match(cycles, /\/cycles\/issues\?organization=/);
   assert.match(cycles, /Historical burn-up snapshots are intentionally not fabricated/);
   assert.match(cycles, /if \(!workspace\.configured\) return <DemoCycles \/>/);
   assert.match(header, /useTeamsStore/);
   assert.match(header, /persistentTeam\?\.name \?\? 'Team'/);
});

test('Phase 18 reuses the existing secured cycles table without a migration', async () => {
   const scope = await readSource('PHASE18_SCOPE.md');
   const collection = await readSource('app/api/teams/[teamId]/cycles/route.ts');

   assert.match(scope, /No new Phase 18 production migration is required/);
   assert.match(scope, /ON DELETE SET NULL/);
   assert.match(scope, /Cycle windows may not overlap within one team/);
   assert.match(scope, /private\.can_write_org/);
   assert.match(collection, /\.from\('cycles'\)/);
   assert.match(collection, /\.from\('issues'\)/);
});
