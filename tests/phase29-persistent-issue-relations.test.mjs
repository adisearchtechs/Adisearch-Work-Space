import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Phase 29 migration creates tenant-safe normalized issue relationships', async () => {
   const migration = await readSource(
      'supabase/migrations/20260902204100_add_issue_relations.sql'
   );
   assert.match(migration, /create table public\.issue_relations/);
   assert.match(migration, /issue_relations_source_organization_fkey/);
   assert.match(migration, /issue_relations_target_organization_fkey/);
   assert.match(migration, /issue_relations_creator_organization_fkey/);
   assert.match(migration, /relation_type in \('parent', 'blocks', 'related'\)/);
   assert.match(migration, /issue_relations_related_canonical/);
   assert.match(migration, /issue_relations_one_parent_per_child_idx/);
   assert.match(migration, /prevent_issue_parent_cycle/);
   assert.match(migration, /with recursive descendants/);
   assert.match(migration, /alter table public\.issue_relations enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(migration, /grant select, insert, delete on table public\.issue_relations to authenticated/);
   assert.doesNotMatch(migration, /grant .*update.*issue_relations/i);
});

test('issue relation APIs authenticate tenancy, normalize semantics and protect mutations', async () => {
   const collection = await readSource('app/api/issue-relations/route.ts');
   const item = await readSource('app/api/issue-relations/[relationId]/route.ts');
   const server = await readSource('lib/issue-relations/server.ts');
   const contracts = await readSource('lib/issue-relations/contracts.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /issueExistsInRelationScope/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /normalizeRelation/);
   assert.match(collection, /kind === 'sub-issue'/);
   assert.match(collection, /kind === 'blocked-by'/);
   assert.match(collection, /\.sort\(\)/);
   assert.match(collection, /created_by: context\.userId/);
   assert.match(collection, /error\?\.code === '23505'/);
   assert.match(collection, /error\?\.code === '23514'/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /\.delete\(\{ count: 'exact' \}\)/);
   assert.match(contracts, /'parent', 'sub-issue', 'blocked-by', 'blocks', 'related'/);
});

test('configured issue details expose real relationship CRUD while demo sub-issues remain isolated', async () => {
   const details = await readSource('components/common/issues/details/issue-details.tsx');
   const relations = await readSource(
      'components/common/issues/details/persistent-issue-relations.tsx'
   );

   assert.match(details, /workspace\.configured \? \(/);
   assert.match(details, /<PersistentIssueRelations issue=\{issue\} \/>/);
   assert.match(details, /demoDetail\?\.subIssueIds/);
   assert.match(relations, /\/api\/issue-relations\?organization=/);
   assert.match(relations, /method: 'POST'/);
   assert.match(relations, /method: 'DELETE'/);
   assert.match(relations, /workspace\.user\.role !== 'guest'/);
   assert.match(relations, /No issue relationships yet/);
   assert.match(relations, /Sub-issues/);
   assert.match(relations, /Blocked by/);
   assert.match(relations, /Related/);
});

test('Phase 29 extends the stacked database type chain and records deferred graph work', async () => {
   const database = await readSource('lib/supabase/database-with-issue-relations.ts');
   const serverClient = await readSource('lib/supabase/server.ts');
   const scope = await readSource('PHASE29_SCOPE.md');

   assert.match(database, /DatabaseWithIssueComments/);
   assert.match(database, /issue_relations: IssueRelationsTable/);
   assert.match(serverClient, /DatabaseWithIssueRelations/);
   assert.match(scope, /issue milestone links/i);
   assert.match(scope, /audit-event generation/i);
   assert.match(scope, /Do not merge/i);
   assert.match(scope, /20260902204100_add_issue_relations/);
});
