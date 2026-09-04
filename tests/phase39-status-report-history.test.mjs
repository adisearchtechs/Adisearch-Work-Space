import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('status snapshot persistence is tenant scoped immutable and indexed for foreign keys', async () => {
   const migration = await readSource(
      'supabase/migrations/20260904064500_add_status_report_snapshots.sql'
   );
   const foreignKeyIndex = await readSource(
      'supabase/migrations/20260904070000_cover_status_report_snapshots_team_foreign_key.sql'
   );

   assert.match(migration, /create table public\.status_report_snapshots/);
   assert.match(migration, /scope in \('workspace', 'team'\)/);
   assert.match(migration, /foreign key \(team_id, organization_id\)/);
   assert.match(migration, /alter table public\.status_report_snapshots enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(migration, /grant select, insert on table public\.status_report_snapshots to authenticated/);
   assert.doesNotMatch(migration, /grant .*update/i);
   assert.doesNotMatch(migration, /grant .*delete/i);
   assert.match(foreignKeyIndex, /on public\.status_report_snapshots \(team_id, organization_id\)/);
});

test('snapshot capture is same-origin and server assembled from released read models', async () => {
   const route = await readSource('app/api/status-report-snapshots/route.ts');

   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /authorizeWorkspaceMemberAccess/);
   assert.match(route, /context\.role === 'guest'/);
   assert.match(route, /getWorkspaceDashboard\(request\)/);
   assert.match(route, /getWorkspaceDependencies\(request\)/);
   assert.match(route, /getTeamDashboard\(request/);
   assert.match(route, /createStatusReportSnapshotSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('status_report_snapshots'\)/);
   assert.match(route, /created_by: context\.userId/);
   assert.doesNotMatch(route, /payload:\s*parsed\.data/);
});

test('status history UI saves workspace and team snapshots and compares only saved numeric values', async () => {
   const page = await readSource('app/[orgId]/status-history/page.tsx');
   const history = await readSource('components/common/workspace/status-report-history.tsx');
   const nav = await readSource('components/layout/sidebar/nav-workspace.tsx');

   assert.match(page, /StatusReportHistory/);
   assert.match(history, /Save workspace snapshot/);
   assert.match(history, /Save team snapshot/);
   assert.match(history, /\/api\/status-report-snapshots\?organization=/);
   assert.match(history, /current snapshot value|numeric differences only/i);
   assert.match(history, /metric\.value - oldValue/);
   assert.match(history, /sameSeries/);
   assert.match(nav, /href=\{`\/\$\{orgId\}\/status-history`\}/);
   assert.match(nav, /<span>Status history<\/span>/);
});

test('Phase 39 explicitly rejects fabricated trend and forecast semantics', async () => {
   const scope = await readSource('PHASE39_SCOPE.md');

   assert.match(scope, /clients never submit snapshot payloads/i);
   assert.match(scope, /no `UPDATE` or `DELETE` grant/i);
   assert.match(scope, /current snapshot value - previous snapshot value/i);
   assert.match(scope, /not labeled as improvement, deterioration, trend, velocity, risk, forecast, or performance/i);
   assert.match(scope, /does \*\*not\*\* add/i);
});
