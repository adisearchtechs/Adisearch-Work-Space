import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Phase 30 migration creates immutable tenant-safe issue audit activity', async () => {
   const migration = await readSource(
      'supabase/migrations/20260902230608_add_issue_audit_activity.sql'
   );

   assert.match(migration, /create table public\.issue_audit_events/);
   assert.match(migration, /issue_audit_events_issue_organization_fkey/);
   assert.match(migration, /issue_audit_events_actor_organization_fkey/);
   assert.match(migration, /on delete set null \(actor_id\)/);
   assert.match(migration, /alter table public\.issue_audit_events enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /grant select on table public\.issue_audit_events to authenticated/);
   assert.doesNotMatch(migration, /grant .*insert.*issue_audit_events/i);
   assert.doesNotMatch(migration, /grant .*update.*issue_audit_events/i);
   assert.doesNotMatch(migration, /grant .*delete.*issue_audit_events/i);
   assert.match(migration, /security definer\nset search_path = ''/);
   assert.match(migration, /revoke all on function private\.capture_issue_audit_event\(\)/);
   assert.match(migration, /revoke all on function private\.capture_issue_relation_audit_event\(\)/);
   assert.match(migration, /audit_actor := auth\.uid\(\)/);
   assert.match(migration, /'status_changed'/);
   assert.match(migration, /'priority_changed'/);
   assert.match(migration, /'assignee_changed'/);
   assert.match(migration, /'project_changed'/);
   assert.match(migration, /'cycle_changed'/);
   assert.match(migration, /'due_date_changed'/);
   assert.match(migration, /'description_changed'/);
   assert.match(migration, /'fromLength'/);
   assert.match(migration, /'relation_added'/);
   assert.match(migration, /'relation_removed'/);
   assert.match(migration, /from public\.issues issue/);
   assert.match(migration, /issue_relations_capture_added_audit_event/);
   assert.match(migration, /issue_relations_capture_removed_audit_event/);
});

test('issue activity API authenticates membership and returns bounded tenant activity', async () => {
   const route = await readSource('app/api/issue-activity/route.ts');
   const server = await readSource('lib/issue-activity/server.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /issueExistsInActivityScope/);
   assert.match(server, /\.from\('issues'\)/);
   assert.match(route, /\.from\('issue_audit_events'\)/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /\.eq\('issue_id', issueId\)/);
   assert.match(route, /\.limit\(500\)/);
   assert.match(route, /\.from\('profiles'\)/);
   assert.match(route, /actor_display_name/);
   assert.match(route, /Cache-Control': 'private, no-store'/);
});

test('configured Activity merges persisted events and comments while demo mode stays local', async () => {
   const activity = await readSource('components/common/issues/details/activity-feed.tsx');

   assert.match(activity, /\/api\/issue-activity\?organization=/);
   assert.match(activity, /\/api\/issue-comments\?organization=/);
   assert.match(activity, /Promise\.all\(\[/);
   assert.match(activity, /setEvents\(activityPayload\.events\)/);
   assert.match(activity, /setComments\(commentPayload\.comments\)/);
   assert.match(activity, /\.sort\(/);
   assert.match(activity, /new Date\(left\.createdAt\)\.getTime\(\)/);
   assert.match(activity, /<PersistentEventRow/);
   assert.match(activity, /<PersistentCommentCard/);
   assert.match(activity, /workspace\.configured/);
   assert.match(activity, /demoItems\.map/);
   assert.match(activity, /No activity yet/);
});

test('Phase 30 extends the database chain and preserves release ordering', async () => {
   const database = await readSource('lib/supabase/database-with-issue-audit-activity.ts');
   const scope = await readSource('PHASE30_SCOPE.md');

   assert.match(database, /DatabaseWithIssueRelations/);
   assert.match(database, /issue_audit_events: IssueAuditEventsTable/);
   assert.match(scope, /Phase 27, Phase 28 and Phase 29/);
   assert.match(scope, /milestone links/i);
   assert.match(scope, /Do not merge/i);
   assert.match(scope, /20260902230608_add_issue_audit_activity/);
});
