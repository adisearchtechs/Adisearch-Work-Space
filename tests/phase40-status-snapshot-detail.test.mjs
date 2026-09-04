import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('saved snapshot detail lookup is authenticated and tenant scoped', async () => {
   const route = await readSource('app/api/status-report-snapshots/[snapshotId]/route.ts');

   assert.match(route, /isUuid\(snapshotId\)/);
   assert.match(route, /authorizeWorkspaceMemberAccess/);
   assert.match(route, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(route, /\.eq\('id', snapshotId\)/);
   assert.match(route, /\.eq\('scope', snapshot\.scope\)/);
   assert.match(route, /\.lt\('created_at', snapshot\.created_at\)/);
   assert.match(route, /previousQuery\.eq\('team_id', snapshot\.team_id\)/);
   assert.match(route, /previousQuery\.is\('team_id', null\)/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
   assert.doesNotMatch(route, /export async function (POST|PATCH|PUT|DELETE)/);
});

test('saved snapshot detail UI renders frozen records and explicit exports', async () => {
   const page = await readSource('app/[orgId]/status-history/[snapshotId]/page.tsx');
   const detail = await readSource(
      'components/common/workspace/status-report-snapshot-detail.tsx'
   );
   const history = await readSource('components/common/workspace/status-report-history.tsx');
   const contracts = await readSource('lib/status-report-snapshots/contracts.ts');

   assert.match(page, /StatusReportSnapshotDetail/);
   assert.match(detail, /Copy saved update/);
   assert.match(detail, /Export JSON/);
   assert.match(detail, /frozen saved payload/i);
   assert.match(detail, /previous saved snapshot/i);
   assert.match(detail, /not labeled as improvement, deterioration, trend, risk, or forecast/i);
   assert.match(detail, /JSON\.stringify\(snapshot, null, 2\)/);
   assert.match(detail, /\/api\/status-report-snapshots\/\$\{encodeURIComponent\(snapshotId\)\}/);
   assert.match(history, /status-history\/\$\{snapshot\.id\}/);
   assert.match(history, /View saved snapshot/);
   assert.match(contracts, /StatusReportSnapshotDetailResponse/);
});

test('Phase 40 scope rejects public sharing and inferred analytics', async () => {
   const scope = await readSource('PHASE40_SCOPE.md');

   assert.match(scope, /read-only/i);
   assert.match(scope, /no service-role path/i);
   assert.match(scope, /current saved value - immediately previous saved value/i);
   assert.match(scope, /does \*\*not\*\* label/i);
   assert.match(scope, /No public\/share token/i);
   assert.match(scope, /does \*\*not\*\* add scheduled captures/i);
});
