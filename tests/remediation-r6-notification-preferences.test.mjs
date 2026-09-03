import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R6D notification preferences are bounded booleans with existing Inbox behavior preserved by default', async () => {
   const contract = await readSource('lib/notifications/preferences-contracts.ts');
   const migration = await readSource(
      'supabase/migrations/20260903165105_add_inbox_notification_preferences.sql'
   );

   assert.match(contract, /issueAssignment: z\.boolean\(\)/);
   assert.match(contract, /issueStatus: z\.boolean\(\)/);
   assert.match(contract, /\.strict\(\)/);
   assert.match(contract, /issueAssignment: true/);
   assert.match(contract, /issueStatus: true/);

   assert.match(migration, /notify_issue_assignment boolean not null default true/);
   assert.match(migration, /notify_issue_status boolean not null default true/);
});

test('R6D database notification generation enforces recipient preferences without exposing the trigger function', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903165105_add_inbox_notification_preferences.sql'
   );

   assert.match(migration, /create or replace function private\.enqueue_issue_notifications\(\)/);
   assert.match(migration, /security definer[\s\S]*set search_path = ''/);
   assert.match(migration, /preferences\.notify_issue_assignment/);
   assert.match(migration, /preferences\.notify_issue_status/);
   assert.match(migration, /coalesce\([\s\S]*true/);
   assert.match(migration, /if assignment_enabled then[\s\S]*insert into public\.notifications/);
   assert.match(migration, /if status_enabled then[\s\S]*insert into public\.notifications/);
   assert.match(migration, /from public\.statuses status/);
   assert.match(migration, /revoke all on function private\.enqueue_issue_notifications\(\) from public/);
});

test('R6D notification preference API trusts only authenticated claims and protects writes by origin', async () => {
   const route = await readSource('app/api/notification-preferences/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /readJsonBody\(request\)/);
   assert.match(route, /notificationPreferencesSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('user_preferences'\)/);
   assert.match(route, /\.eq\('user_id', userId\)/);
   assert.match(route, /user_id: userId/);
   assert.match(route, /notify_issue_assignment: parsed\.data\.issueAssignment/);
   assert.match(route, /notify_issue_status: parsed\.data\.issueStatus/);
   assert.doesNotMatch(route, /input\.userId/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});

test('R6D settings exposes only real in-app Inbox controls and explicitly excludes unsupported channels', async () => {
   const component = await readSource('components/common/settings/notification-preferences.tsx');
   const route = await readSource('app/[orgId]/settings/[section]/page.tsx');

   assert.match(component, /\/api\/notification-preferences/);
   assert.match(component, /method: 'PUT'/);
   assert.match(component, /Issue assignments/);
   assert.match(component, /Assigned issue status changes/);
   assert.match(component, /persistent Adisearch Inbox only/);
   assert.match(component, /Email, push, digest, and external-channel delivery are not enabled/);
   assert.match(component, /<Switch/);
   assert.match(component, /disabled=\{disabled\}/);
   assert.match(route, /'notifications': NotificationPreferences/);
   assert.doesNotMatch(route, /NotificationsNotice/);
});

test('R6D extends the existing self-scoped preference row instead of creating another identity store', async () => {
   const database = await readSource('lib/supabase/database-with-preferences.ts');
   const migration = await readSource(
      'supabase/migrations/20260903165105_add_inbox_notification_preferences.sql'
   );

   assert.match(database, /notify_issue_assignment: boolean/);
   assert.match(database, /notify_issue_status: boolean/);
   assert.match(migration, /alter table public\.user_preferences/);
   assert.doesNotMatch(migration, /create table public\.notification_preferences/);
});
