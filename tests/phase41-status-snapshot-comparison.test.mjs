import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('saved snapshot comparison reuses authenticated tenant-scoped history only', async () => {
   const component = await readSource(
      'components/common/workspace/status-report-snapshot-comparison.tsx'
   );
   const route = await readSource('app/[orgId]/status-history/compare/page.tsx');

   assert.match(route, /StatusReportSnapshotComparison/);
   assert.match(component, /\/api\/status-report-snapshots\?organization=/);
   assert.match(component, /credentials: 'same-origin'/);
   assert.match(component, /seriesMatches/);
   assert.match(component, /option\.scope === snapshot\.scope && option\.teamId === snapshot\.teamId/);
   assert.doesNotMatch(component, /service.role|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
   assert.doesNotMatch(component, /method:\s*'(POST|PUT|PATCH|DELETE)'/);
});

test('comparison semantics are arithmetic and set membership only', async () => {
   const component = await readSource(
      'components/common/workspace/status-report-snapshot-comparison.tsx'
   );
   const scope = await readSource('PHASE41_SCOPE.md');

   assert.match(component, /Difference = Snapshot A − Snapshot B/);
   assert.match(component, /metric\.value - rightValue/);
   assert.match(component, /Only in A/);
   assert.match(component, /Only in B/);
   assert.match(component, /does not infer direction, performance, risk, trend, velocity, capacity, or forecast/i);
   assert.match(scope, /Snapshot A saved value - Snapshot B saved value/);
   assert.match(scope, /saved entity ID appears in one selected payload and not the other/i);
   assert.match(scope, /does \*\*not\*\* describe differences as improvement, deterioration/i);
   assert.match(scope, /No AI-generated interpretation/i);
});

test('comparison is discoverable and copy output stays deterministic', async () => {
   const component = await readSource(
      'components/common/workspace/status-report-snapshot-comparison.tsx'
   );
   const nav = await readSource('components/layout/sidebar/nav-workspace.tsx');

   assert.match(component, /Copy comparison/);
   assert.match(component, /buildComparisonText/);
   assert.match(component, /Source: two immutable saved status snapshots/);
   assert.match(nav, /href=\{`\/\$\{orgId\}\/status-history\/compare`\}/);
   assert.match(nav, /<span>Compare snapshots<\/span>/);
});
