import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('status report route renders the persistent workspace status surface', async () => {
   const page = await readSource('app/[orgId]/status-report/page.tsx');
   const report = await readSource('components/common/workspace/workspace-status-report.tsx');

   assert.match(page, /WorkspaceStatusReport/);
   assert.match(report, /Workspace status report/);
   assert.match(report, /workspace\.configured/);
   assert.match(report, /Demo mode does not fabricate operating metrics/);
});

test('configured status report composes both authenticated tenant-scoped read models', async () => {
   const report = await readSource('components/common/workspace/workspace-status-report.tsx');

   assert.match(report, /Promise\.all\(\[/);
   assert.match(report, /\/api\/dashboard\?organization=/);
   assert.match(report, /\/api\/dependencies\?organization=/);
   assert.match(report, /credentials: 'same-origin'/);
   assert.match(report, /workspace\.organization\.slug/);
});

test('status report copy action is deterministic and does not invoke AI generation', async () => {
   const report = await readSource('components/common/workspace/workspace-status-report.tsx');

   assert.match(report, /function buildStatusUpdate\(/);
   assert.match(report, /navigator\.clipboard\.writeText/);
   assert.match(report, /Copy status update/);
   assert.match(report, /Source: current persisted workspace records/);
   assert.doesNotMatch(report, /\/api\/agent/);
   assert.doesNotMatch(report, /OPENAI_API_KEY/);
});

test('workspace navigation exposes the status report as a stable destination', async () => {
   const nav = await readSource('components/layout/sidebar/nav-workspace.tsx');

   assert.match(nav, /href=\{`\/\$\{orgId\}\/status-report`\}/);
   assert.match(nav, /<span>Status report<\/span>/);
});

test('Phase 37 preserves truthfulness boundaries and requires no database migration', async () => {
   const scope = await readSource('PHASE37_SCOPE.md');
   const report = await readSource('components/common/workspace/workspace-status-report.tsx');

   assert.match(scope, /No new database migration is required/i);
   assert.match(scope, /health is shown only when a persisted project health update exists/i);
   assert.match(scope, /Dependencies come only from unresolved persisted `blocks` relationships/i);
   assert.match(scope, /does not infer capacity, workload percentage, velocity, critical path, delivery probability, or predicted completion dates/i);
   assert.match(report, /persisted at-risk/);
   assert.match(report, /persisted off-track/);
   assert.match(report, /no delivery forecast, capacity, or inferred risk score/i);
});
