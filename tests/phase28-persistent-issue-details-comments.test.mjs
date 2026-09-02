import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Phase 28 migration creates append-only tenant-safe issue comments', async () => {
   const migration = await readSource(
      'supabase/migrations/20260902202259_add_issue_comments.sql'
   );
   assert.match(migration, /create table public\.issue_comments/);
   assert.match(migration, /issue_comments_issue_organization_fkey/);
   assert.match(migration, /issue_comments_author_organization_fkey/);
   assert.match(migration, /on delete set null \(author_id\)/);
   assert.match(migration, /char_length\(btrim\(body\)\) between 1 and 10000/);
   assert.match(migration, /alter table public\.issue_comments enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /author_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /grant select, insert on table public\.issue_comments to authenticated/);
   assert.doesNotMatch(migration, /grant .*update.*issue_comments/i);
   assert.doesNotMatch(migration, /grant .*delete.*issue_comments/i);
});

test('issue comment API authenticates tenancy, protects writes and derives authors server-side', async () => {
   const route = await readSource('app/api/issue-comments/route.ts');
   const server = await readSource('lib/issue-comments/server.ts');
   const contracts = await readSource('lib/issue-comments/contracts.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.from\('issues'\)/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /parseIssueCommentBody/);
   assert.match(route, /author_id: context\.userId/);
   assert.match(route, /\.from\('issue_comments'\)/);
   assert.match(route, /\.from\('profiles'\)/);
   assert.match(contracts, /MAX_ISSUE_COMMENT_CHARS = 10000/);
});

test('configured issue details use persisted descriptions and comments without mock metadata leakage', async () => {
   const details = await readSource('components/common/issues/details/issue-details.tsx');
   const description = await readSource(
      'components/common/issues/details/persistent-issue-description.tsx'
   );
   const activity = await readSource('components/common/issues/details/activity-feed.tsx');
   const properties = await readSource('components/common/issues/details/issue-properties-panel.tsx');

   assert.match(details, /!workspace\.configured && issue \? getIssueDetail\(issue\) : null/);
   assert.match(details, /<PersistentIssueDescription issue=\{issue\} \/>/);
   assert.match(details, /<ActivityFeed activity=\{demoDetail\?\.activity \?\? \[\]\} issueId=\{issue\.id\} \/>/);
   assert.match(details, /<IssuePropertiesPanel issue=\{issue\} detail=\{demoDetail\} \/>/);
   assert.match(description, /issue\.description/);
   assert.match(description, /updateIssue\(issue\.id, \{ description: next \}\)/);
   assert.match(description, /workspace\.user\.role !== 'guest'/);
   assert.match(activity, /\/api\/issue-comments\?organization=/);
   assert.match(activity, /method: 'POST'/);
   assert.match(activity, /No comments yet/);
   assert.match(properties, /detail: IssueDetail \| null/);
   assert.match(properties, /detail\?\.blockedByIds/);
   assert.match(properties, /detail\?\.prLinks/);
});

test('Phase 28 extends the database chain and documents intentionally deferred issue activity', async () => {
   const database = await readSource('lib/supabase/database-with-issue-comments.ts');
   const scope = await readSource('PHASE28_SCOPE.md');

   assert.match(database, /DatabaseWithAgent/);
   assert.match(database, /issue_comments: IssueCommentsTable/);
   assert.match(scope, /audit-event generation/i);
   assert.match(scope, /persistent sub-issue relationships/i);
   assert.match(scope, /Do not merge/i);
   assert.match(scope, /20260902202259_add_issue_comments/);
});
