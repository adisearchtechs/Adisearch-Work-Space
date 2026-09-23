import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');

test('Phase 45 issue templates are tenant-scoped and RLS protected', async () => {
   const migration = await read('supabase/migrations/20260919123000_add_issue_templates.sql');
   assert.match(migration, /organization_id uuid not null/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.is_org_admin\(organization_id\)/);
});

test('Phase 45 API protects mutations and scopes every template write', async () => {
   const collection = await read('app/api/issue-templates/route.ts');
   const item = await read('app/api/issue-templates/[templateId]/route.ts');
   for (const source of [collection, item]) {
      assert.match(source, /hasValidMutationOrigin/);
      assert.match(source, /authorizeWorkspaceMemberAccess/);
      assert.match(source, /organizationId/);
   }
   assert.match(collection, /Cache-Control.*private, no-store/);
   assert.match(collection, /orderedTemplateIds/);
   assert.match(collection, /Template order must contain every current workspace template exactly once/);
});

test('Phase 45 settings use persisted templates and contain no invented catalog', async () => {
   const settings = await read('components/common/settings/issue-templates-settings.tsx');
   assert.match(settings, /\/api\/issue-templates/);
   assert.match(settings, /workspace\.configured/);
   assert.doesNotMatch(settings, /Bug report intake|sophia\.reed|Release checklist/);
   assert.match(settings, /Move .* up/);
});

test('Phase 45 applies only active tenant templates during issue creation', async () => {
   const dialog = await read('components/layout/sidebar/create-new-issue/index.tsx');
   const issueApi = await read('app/api/issues/route.ts');
   const contract = await read('lib/issues/contracts.ts');
   assert.match(dialog, /template\.active/);
   assert.match(dialog, /template\.title/);
   assert.match(dialog, /template\.body/);
   assert.match(contract, /templateId: z\.string\(\)\.uuid/);
   assert.match(issueApi, /from\('issue_templates'\)/);
   assert.match(issueApi, /eq\('active', true\)/);
});
