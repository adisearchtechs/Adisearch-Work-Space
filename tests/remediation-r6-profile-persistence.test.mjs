import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R6A profile contract bounds display name and validates an IANA time zone', async () => {
   const contract = await readSource('lib/profile/contracts.ts');

   assert.match(contract, /displayName: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(120\)/);
   assert.match(contract, /timezone: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(100\)/);
   assert.match(contract, /Intl\.DateTimeFormat\('en-US', \{ timeZone: value \}\)/);
   assert.match(contract, /\.strict\(\)/);
});

test('R6A profile API authenticates self, protects writes, and returns only self profile settings', async () => {
   const route = await readSource('app/api/profile/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /readJsonBody\(request\)/);
   assert.match(route, /profilePatchSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('profiles'\)/);
   assert.match(route, /\.eq\('id', userId\)/);
   assert.match(route, /display_name: parsed\.data\.displayName/);
   assert.match(route, /timezone: parsed\.data\.timezone/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
   assert.doesNotMatch(route, /service[_-]?role/i);
   assert.doesNotMatch(route, /\.insert\(/);
});

test('R6A workspace session hydrates the persisted time zone with the authenticated identity', async () => {
   const workspace = await readSource('lib/workspace.ts');

   assert.match(workspace, /timezone: string/);
   assert.match(workspace, /timezone: 'UTC'/);
   assert.match(workspace, /\.select\('display_name, avatar_url, timezone'\)/);
   assert.match(workspace, /timezone: profile\?\.timezone \?\? 'UTC'/);
});

test('R6A profile UI persists real settings and refreshes server-authoritative workspace identity', async () => {
   const profile = await readSource('components/common/settings/profile.tsx');

   assert.match(profile, /fetch\('\/api\/profile'/);
   assert.match(profile, /method: 'PATCH'/);
   assert.match(profile, /'Content-Type': 'application\/json'/);
   assert.match(profile, /displayName: trimmedDisplayName/);
   assert.match(profile, /timezone: trimmedTimezone/);
   assert.match(profile, /router\.refresh\(\)/);
   assert.match(profile, /disabled=\{!configured \|\| saving\}/);
   assert.match(profile, /Save profile/);
   assert.match(profile, /Profile editing is unavailable in the demo workspace/);
   assert.doesNotMatch(profile, /localStorage/);
   assert.doesNotMatch(profile, /defaultChecked/);
});

test('R6A reuses existing self-only profile RLS and requires no schema migration', async () => {
   const initial = await readSource(
      'supabase/migrations/20260826123300_initial_adisearch_workspace_schema.sql'
   );
   const optimized = await readSource(
      'supabase/migrations/20260826123513_optimize_rls_and_foreign_key_indexes.sql'
   );

   assert.match(initial, /create policy profiles_update_self on public\.profiles/);
   assert.match(initial, /for update to authenticated/);
   assert.match(initial, /using \(id = auth\.uid\(\)\)/);
   assert.match(initial, /with check \(id = auth\.uid\(\)\)/);
   assert.match(optimized, /alter policy profiles_update_self on public\.profiles/);
   assert.match(optimized, /using \(id = \(select auth\.uid\(\)\)\)/);
   assert.match(optimized, /with check \(id = \(select auth\.uid\(\)\)\)/);
});
