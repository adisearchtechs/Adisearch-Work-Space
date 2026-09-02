import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('issue subscriptions are tenant-safe personal state with explicit grants and indexed foreign keys', async () => {
   const migration = await readSource('supabase/migrations/20260902075650_add_issue_subscriptions.sql');
   const databaseExtension = await readSource('lib/supabase/database-with-issue-subscriptions.ts');

   assert.match(migration, /create table public\.issue_subscriptions/);
   assert.match(migration, /foreign key \(issue_id, organization_id\)/);
   assert.match(migration, /foreign key \(user_id, organization_id\)/);
   assert.match(migration, /issue_subscriptions_user_org_created_idx/);
   assert.match(migration, /issue_subscriptions_issue_org_idx/);
   assert.match(migration, /alter table public\.issue_subscriptions enable row level security/);
   assert.match(migration, /user_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /revoke all on table public\.issue_subscriptions from anon, authenticated/);
   assert.match(migration, /grant select, insert, delete on table public\.issue_subscriptions to authenticated/);
   assert.doesNotMatch(migration, /grant update/);
   assert.match(databaseExtension, /issue_subscriptions: IssueSubscriptionsTable/);
   assert.match(databaseExtension, /issue_subscriptions_issue_organization_fkey/);
   assert.match(databaseExtension, /issue_subscriptions_user_organization_fkey/);
});

test('subscription APIs authenticate membership, scope rows to the current user, and protect mutations by origin', async () => {
   const server = await readSource('lib/issue-subscriptions/server.ts');
   const collection = await readSource('app/api/issue-subscriptions/route.ts');
   const item = await readSource('app/api/issues/[issueId]/subscription/route.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /\.eq\('user_id', userId\)/);
   assert.match(collection, /\.from\('issue_subscriptions'\)/);
   assert.match(collection, /\.eq\('user_id', context\.userId\)/);
   assert.match(collection, /Cache-Control': 'private, no-store'/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /\.from\('issues'\)/);
   assert.match(item, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(item, /user_id: context\.userId/);
   assert.match(item, /error\.code !== '23505'/);
   assert.match(item, /export async function DELETE/);
});

test('configured My Issues uses authenticated ownership and persisted subscriptions while demo heuristics remain isolated', async () => {
   const scope = await readSource('components/common/my-issues/use-my-issues.ts');
   const body = await readSource('components/common/my-issues/my-issues.tsx');
   const provider = await readSource('components/providers/saas-issue-subscriptions-provider.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');

   assert.match(scope, /issue\.assignee\?\.id === scope\.userId/);
   assert.match(scope, /issue\.creatorId === scope\.userId/);
   assert.match(scope, /scope\.subscriptionIds\.has\(issue\.id\)/);
   assert.match(scope, /b\.updatedAt \?\? b\.createdAt/);
   assert.match(scope, /if \(!scope\.configured\)/);
   assert.match(scope, /issueCreatorIndex/);
   assert.match(body, /workspace\.user\.id/);
   assert.match(body, /subscriptionsLoaded/);
   assert.match(body, /tab === 'subscribed' \|\| tab === 'activity'/);
   assert.match(provider, /\/api\/issue-subscriptions\?organization=/);
   assert.match(provider, /replaceIssueIds/);
   assert.match(layout, /<SaasIssueSubscriptionsProvider>/);
});

test('configured issue DTOs hydrate real creator and updated timestamps and expose subscription controls', async () => {
   const contracts = await readSource('lib/issues/contracts.ts');
   const route = await readSource('app/api/issues/route.ts');
   const mapper = await readSource('lib/issues/mapper.ts');
   const augmentation = await readSource('types/issue-runtime.d.ts');
   const button = await readSource('components/common/issues/issue-subscription-button.tsx');
   const details = await readSource('components/common/issues/details/issue-details.tsx');

   assert.match(contracts, /creatorId: string/);
   assert.match(contracts, /updatedAt: string/);
   assert.match(route, /creator_id, created_at, updated_at/);
   assert.match(route, /creatorId: row\.creator_id/);
   assert.match(route, /updatedAt: row\.updated_at/);
   assert.match(mapper, /creatorId: dto\.creatorId/);
   assert.match(mapper, /updatedAt: dto\.updatedAt/);
   assert.match(augmentation, /creatorId\?: string/);
   assert.match(augmentation, /updatedAt\?: string/);
   assert.match(button, /aria-pressed=\{subscribed\}/);
   assert.match(button, /method: nextSubscribed \? 'POST' : 'DELETE'/);
   assert.match(details, /<IssueSubscriptionButton issueId=\{issue\.id\} \/>/);
});

test('Phase 24 scope records the bounded activity contract and queued release gate', async () => {
   const scope = await readSource('PHASE24_SCOPE.md');

   assert.match(scope, /issues assigned to, created by, or subscribed by the current user/i);
   assert.match(scope, /updated_at/i);
   assert.match(scope, /guests?/i);
   assert.match(scope, /fail closed/i);
   assert.match(scope, /20260902075650_add_issue_subscriptions/);
   assert.match(scope, /do not merge/i);
   assert.match(scope, /full issue audit\/event history/i);
   assert.match(scope, /Reviews persistence/i);
});
