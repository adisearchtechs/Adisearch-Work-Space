import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('notification migrations enforce recipient ownership, event generation, and indexed tenancy', async () => {
   const migration = await readSource('supabase/migrations/20260902065001_add_persistent_notifications.sql');
   const hardening = await readSource('supabase/migrations/20260902065223_restrict_notification_update_columns.sql');
   const organizationIndex = await readSource('supabase/migrations/20260902070548_cover_notifications_organization_foreign_key.sql');
   const types = await readSource('lib/supabase/database.types.ts');

   assert.match(migration, /create table public\.notifications/);
   assert.match(migration, /organization_id uuid not null references public\.organizations\(id\)/);
   assert.match(migration, /foreign key \(recipient_id, organization_id\)/);
   assert.match(migration, /foreign key \(issue_id, organization_id\)/);
   assert.match(migration, /alter table public\.notifications enable row level security/);
   assert.match(migration, /recipient_id = \(select auth\.uid\(\)\)/);
   assert.match(migration, /revoke all on public\.notifications from anon, authenticated/);
   assert.doesNotMatch(migration, /grant insert on public\.notifications to authenticated/);
   assert.match(migration, /private\.enqueue_issue_notifications/);
   assert.match(migration, /after update of assignee_id, status_id on public\.issues/);
   assert.match(migration, /new\.assignee_id is distinct from actor/);
   assert.match(hardening, /revoke update on public\.notifications from authenticated/);
   assert.match(hardening, /grant update \(read_at\) on public\.notifications to authenticated/);
   assert.match(organizationIndex, /notifications_organization_idx/);
   assert.match(organizationIndex, /public\.notifications \(organization_id\)/);
   assert.match(types, /notifications: Table/);
   assert.match(types, /kind: 'assignment' \| 'status'/);
   assert.match(types, /\{ read_at\?: string \| null \}/);
});

test('notification APIs are tenant and recipient scoped with same-origin mutations and no client creation route', async () => {
   const server = await readSource('lib/notifications/server.ts');
   const collection = await readSource('app/api/notifications/route.ts');
   const item = await readSource('app/api/notifications/[notificationId]/route.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /\.eq\('user_id', userId\)/);
   assert.match(collection, /Cache-Control': 'private, no-store'/);
   assert.match(collection, /\.eq\('recipient_id', context\.userId\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /\.is\('read_at', null\)/);
   assert.match(collection, /scope !== 'all' && scope !== 'read'/);
   assert.doesNotMatch(collection, /export async function POST/);
   assert.match(item, /notificationReadSchema\.safeParse/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /\.eq\('recipient_id', context\.userId\)/);
   assert.match(item, /read_at: parsed\.data\.read \? new Date\(\)\.toISOString\(\) : null/);
});

test('configured inbox uses persistent notification state while demo Inbox stays isolated', async () => {
   const runtime = await readSource('components/common/inbox/inbox-runtime.tsx');
   const persistentInbox = await readSource('components/common/inbox/persistent-inbox.tsx');
   const provider = await readSource('components/providers/saas-notifications-provider.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');
   const page = await readSource('app/[orgId]/inbox/page.tsx');
   const sidebar = await readSource('components/layout/sidebar/nav-inbox.tsx');

   assert.match(runtime, /workspace\.configured \? <PersistentInbox \/> : <Inbox \/>/);
   assert.doesNotMatch(persistentInbox, /mock-data\/inbox/);
   assert.match(persistentInbox, /\/api\/notifications\?organization=/);
   assert.match(persistentInbox, /Mark all read/);
   assert.match(persistentInbox, /Delete read notifications/);
   assert.match(persistentInbox, /Delete all notifications/);
   assert.match(persistentInbox, /Open issue/);
   assert.match(provider, /\/api\/notifications\?organization=/);
   assert.match(provider, /replaceNotifications/);
   assert.match(layout, /<SaasNotificationsProvider>/);
   assert.match(page, /<InboxRuntime \/>/);
   assert.match(sidebar, /usePersistentNotificationsStore/);
   assert.match(sidebar, /workspace\.configured/);
});

test('configured issue assignment is hydrated and persisted through the existing issue adapter', async () => {
   const contracts = await readSource('lib/issues/contracts.ts');
   const collection = await readSource('app/api/issues/route.ts');
   const item = await readSource('app/api/issues/[issueId]/route.ts');
   const provider = await readSource('components/providers/saas-issues-provider.tsx');
   const mapper = await readSource('lib/issues/mapper.ts');
   const assignee = await readSource('components/common/issues/assignee-user.tsx');
   const properties = await readSource('components/common/issues/details/issue-properties-panel.tsx');

   assert.match(contracts, /assigneeId: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
   assert.match(contracts, /assignee: \{/);
   assert.match(collection, /assignee_id/);
   assert.match(collection, /display_name, avatar_url/);
   assert.match(item, /parsed\.data\.assigneeId/);
   assert.match(item, /\.from\('organization_members'\)/);
   assert.match(item, /assignee_id: parsed\.data\.assigneeId/);
   assert.match(provider, /assigneeId: changes\.assignee\?\.id \?\? null/);
   assert.match(mapper, /dto\.assignee/);
   assert.doesNotMatch(mapper, /assignee: null,/);
   assert.match(assignee, /\/api\/members\?organization=/);
   assert.match(assignee, /updateIssueAssignee\(issueId, nextAssignee\)/);
   assert.match(assignee, /!workspace\.configured/);
   assert.match(properties, /<AssigneeUser user=\{issue\.assignee\} issueId=\{issue\.id\} \/>/);
});

test('Phase 23 scope records the hardened indexed notification boundary and queued release', async () => {
   const scope = await readSource('PHASE23_SCOPE.md');

   assert.match(scope, /database-side/i);
   assert.match(scope, /UPDATE\(read_at\)/);
   assert.match(scope, /20260902070548_cover_notifications_organization_foreign_key/);
   assert.match(scope, /notifications_organization_idx/);
   assert.match(scope, /no Phase 23 unindexed-foreign-key warning/i);
   assert.match(scope, /do not merge/i);
   assert.match(scope, /realtime subscriptions \/ push delivery/i);
   assert.match(scope, /email notification delivery/i);
   assert.match(scope, /Reviews persistence/i);
});
