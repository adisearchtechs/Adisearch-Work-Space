import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('review persistence is tenant-safe with explicit RLS, grants and covering indexes', async () => {
   const migration = await readSource('supabase/migrations/20260902082302_add_persistent_reviews.sql');
   const database = await readSource('lib/supabase/database-with-reviews.ts');

   assert.match(migration, /create table public\.reviews/);
   assert.match(migration, /create table public\.review_reviewers/);
   assert.match(migration, /create table public\.review_comments/);
   assert.match(migration, /foreign key \(created_by, organization_id\)/);
   assert.match(migration, /foreign key \(issue_id, organization_id\)/);
   assert.match(migration, /foreign key \(review_id, organization_id\)/);
   assert.match(migration, /foreign key \(user_id, organization_id\)/);
   assert.match(migration, /reviews_issue_org_idx/);
   assert.match(migration, /review_reviewers_review_org_idx/);
   assert.match(migration, /review_comments_review_org_created_idx/);
   assert.match(migration, /enable row level security/);
   assert.match(migration, /revoke all on table public\.reviews from anon/);
   assert.match(migration, /grant update \(verdict, responded_at\)/);
   assert.match(migration, /grant update \(body\) on table public\.review_comments/);
   assert.match(database, /reviews: ReviewsTable/);
   assert.match(database, /review_reviewers: ReviewReviewersTable/);
   assert.match(database, /review_comments: ReviewCommentsTable/);
});

test('review contracts bound status, verdicts, payload sizes and external URLs', async () => {
   const contracts = await readSource('lib/reviews/contracts.ts');

   assert.match(contracts, /\['open', 'approved', 'closed'\]/);
   assert.match(contracts, /\['pending', 'approved', 'changes_requested'\]/);
   assert.match(contracts, /max\(20000\)/);
   assert.match(contracts, /max\(10000\)/);
   assert.match(contracts, /url\.protocol === 'http:'/);
   assert.match(contracts, /url\.protocol === 'https:'/);
   assert.match(contracts, /checksPassed <= value\.checksTotal/);
});

test('review APIs use authenticated organization scope and same-origin mutation protection', async () => {
   const server = await readSource('lib/reviews/server.ts');
   const collection = await readSource('app/api/reviews/route.ts');
   const detail = await readSource('app/api/reviews/[reviewId]/route.ts');
   const reviewers = await readSource('app/api/reviews/[reviewId]/reviewers/route.ts');
   const verdict = await readSource('app/api/reviews/[reviewId]/reviewers/[userId]/route.ts');
   const comments = await readSource('app/api/reviews/[reviewId]/comments/route.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(collection, /scope !== 'for-you' && scope !== 'created'/);
   assert.match(collection, /\.from\('review_reviewers'\)/);
   assert.match(collection, /\.eq\('created_by', context\.userId\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(detail, /existing\.created_by !== context\.userId/);
   assert.match(reviewers, /Only the review creator can assign reviewers/);
   assert.match(verdict, /userId !== context\.userId/);
   assert.match(comments, /author_id: context\.userId/);
});

test('configured Reviews uses persisted runtime and never presents mock Git evidence', async () => {
   const runtime = await readSource('components/common/reviews/reviews-runtime.tsx');
   const persistent = await readSource('components/common/reviews/persistent-reviews.tsx');
   const demo = await readSource('components/common/reviews/reviews.tsx');
   const mainPage = await readSource('app/[orgId]/reviews/page.tsx');
   const detailPage = await readSource('app/[orgId]/review/[reviewId]/page.tsx');

   assert.match(runtime, /workspace\.configured \?/);
   assert.match(runtime, /<PersistentReviews/);
   assert.match(runtime, /<Reviews/);
   assert.match(persistent, /\/api\/reviews\?organization=/);
   assert.match(persistent, /\/api\/members\?organization=/);
   assert.match(persistent, /Git-backed/);
   assert.match(persistent, /deterministic mock code evidence/);
   assert.doesNotMatch(persistent, /mock-data\/reviews/);
   assert.match(demo, /mock-data\/reviews/);
   assert.match(mainPage, /ReviewsRuntime/);
   assert.match(detailPage, /ReviewsRuntime/);
});

test('Phase 25 documents truthful review scope and queued release discipline', async () => {
   const scope = await readSource('PHASE25_SCOPE.md');

   assert.match(scope, /For you/i);
   assert.match(scope, /Created/i);
   assert.match(scope, /reviewer-owned verdicts/i);
   assert.match(scope, /deterministic mock commits, file diffs/i);
   assert.match(scope, /20260902082302_add_persistent_reviews/);
   assert.match(scope, /GitHub OAuth\/app installation management/i);
   assert.match(scope, /do not merge/i);
   assert.match(scope, /do not.*deliberately deploy/i);
});
