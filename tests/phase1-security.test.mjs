import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Supabase authentication refresh trusts verified claims, not an unverified session', async () => {
   const proxy = await readSource('lib/supabase/proxy.ts');
   const serverRoutes = await Promise.all([
      readSource('app/api/issues/route.ts'),
      readSource('app/api/issues/[issueId]/route.ts'),
      readSource('lib/workspace.ts'),
   ]);

   assert.match(proxy, /auth\.getClaims\(\)/);
   assert.doesNotMatch(proxy, /auth\.getSession\(\)/);
   serverRoutes.forEach((source) => assert.match(source, /auth\.getClaims\(\)/));
});

test('every tenant table explicitly enables row-level security', async () => {
   const schema = await readSource('supabase/schema.sql');
   const tenantTables = [
      'profiles',
      'organizations',
      'organization_members',
      'teams',
      'team_members',
      'statuses',
      'projects',
      'cycles',
      'labels',
      'issues',
      'issue_labels',
   ];

   tenantTables.forEach((table) => {
      assert.match(
         schema,
         new RegExp(`alter table public\\.${table} enable row level security`, 'i')
      );
   });
   assert.match(schema, /private\.is_org_member/);
   assert.match(schema, /set search_path = ''/);
   assert.match(schema, /for update to authenticated[\s\S]*using[\s\S]*with check/i);
});

test('issue identity is allocated transactionally in PostgreSQL', async () => {
   const schema = await readSource('supabase/schema.sql');
   const createIssue = await readSource('components/layout/sidebar/create-new-issue/index.tsx');

   assert.match(schema, /select next_issue_number[\s\S]*for update/i);
   assert.match(schema, /assign_issue_number_before_insert/);
   assert.match(createIssue, /fetch\('\/api\/issues'/);
});

test('unsafe issue mutations validate origin, content type, size, and input shape', async () => {
   const security = await readSource('lib/api/security.ts');
   const collectionRoute = await readSource('app/api/issues/route.ts');
   const itemRoute = await readSource('app/api/issues/[issueId]/route.ts');

   assert.match(security, /MAX_JSON_BODY_BYTES/);
   assert.match(security, /application\/json/);
   assert.match(collectionRoute, /hasValidMutationOrigin/);
   assert.match(collectionRoute, /createIssueSchema\.safeParse/);
   assert.match(itemRoute, /updateIssueSchema\.safeParse/);
});

test('browser bundles use a publishable Supabase key and never reference service-role secrets', async () => {
   const browserClient = await readSource('lib/supabase/client.ts');
   const env = await readSource('.env.example');

   assert.match(browserClient, /publishableKey/);
   assert.match(env, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
   assert.doesNotMatch(`${browserClient}\n${env}`, /service[_-]?role\s*=/i);
});

test('production response hardening includes CSP, HSTS, and cross-origin isolation headers', async () => {
   const config = await readSource('next.config.ts');

   for (const header of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
   ]) {
      assert.match(config, new RegExp(header));
   }
});
