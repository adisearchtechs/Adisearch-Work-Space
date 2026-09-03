import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Supabase authentication refresh trusts verified claims, not an unverified session', async () => {
   const proxy = await readSource('lib/supabase/proxy.ts');
   const loginActions = await readSource('app/login/actions.ts');
   const loginPage = await readSource('app/login/page.tsx');
   const confirmRoute = await readSource('app/auth/confirm/route.ts');
   const serverRoutes = await Promise.all([
      readSource('app/api/issues/route.ts'),
      readSource('app/api/issues/[issueId]/route.ts'),
      readSource('lib/workspace.ts'),
   ]);

   assert.match(proxy, /auth\.getClaims\(\)/);
   assert.doesNotMatch(proxy, /auth\.getSession\(\)/);
   assert.match(proxy, /setAll\(cookiesToSet, headers\)/);
   assert.match(proxy, /finalize\(NextResponse\.redirect/);
   serverRoutes.forEach((source) => assert.match(source, /auth\.getClaims\(\)/));
   assert.match(loginActions, /const next = safeRedirectPath\(parsed\.data\.next\)/);
   assert.match(loginActions, /new URL\(next, `\$\{getSiteUrl\(\)\}\/`\)\.toString\(\)/);
   assert.match(loginActions, /options: \{ emailRedirectTo \}/);
   assert.match(loginActions, /status: 'check-email'/);
   assert.match(loginPage, /Confirmation email sent/);
   assert.match(loginPage, /confirmation-failed/);
   assert.match(confirmRoute, /verifyOtp\(\{ type, token_hash: tokenHash \}\)/);
   assert.match(confirmRoute, /candidate\.origin !== site\.origin/);
});

test('Vercel production auth links use the stable project domain', async () => {
   const brand = await readSource('lib/brand.ts');

   assert.match(brand, /VERCEL_ENV === 'production'/);
   assert.match(brand, /VERCEL_PROJECT_PRODUCTION_URL/);
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
   const envExample = await readSource('.env.example');
   const productionEnv = await readSource('.env.production');
   const deployedPublicConfiguration = `${browserClient}\n${productionEnv}`;

   assert.match(browserClient, /publishableKey/);
   assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
   assert.match(productionEnv, /^NEXT_PUBLIC_SUPABASE_URL=https:\/\//m);
   assert.match(productionEnv, /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_/m);
   assert.doesNotMatch(deployedPublicConfiguration, /service[_-]?role|sb_secret_/i);
});

test('tenant foreign keys are indexed and RLS caches authenticated user lookups', async () => {
   const schema = await readSource('supabase/schema.sql');
   const tenantForeignKeyIndexes = [
      'organizations_created_by_idx',
      'team_members_team_organization_idx',
      'projects_team_organization_idx',
      'projects_lead_organization_idx',
      'cycles_team_organization_idx',
      'issues_team_organization_idx',
      'issues_status_organization_idx',
      'issues_assignee_organization_idx',
      'issues_project_organization_idx',
      'issues_cycle_organization_idx',
      'issues_creator_organization_idx',
      'issue_labels_issue_organization_idx',
      'issue_labels_label_organization_idx',
   ];

   tenantForeignKeyIndexes.forEach((index) => {
      assert.match(schema, new RegExp(`create index ${index}`, 'i'));
   });
   assert.match(schema, /\(select auth\.uid\(\)\)/);
   assert.doesNotMatch(schema, /(?<!select )auth\.uid\(\)/);
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
