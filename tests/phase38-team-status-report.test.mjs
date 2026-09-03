import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('team status report route uses the existing team header and persistent report surface', async () => {
   const page = await readSource('app/[orgId]/team/[teamId]/status-report/page.tsx');
   const report = await readSource('components/common/teams/team-status-report.tsx');

   assert.match(page, /TeamStatusReport/);
   assert.match(page, /header=\{<Header \/>\}/);
   assert.match(report, /Team status report/);
   assert.match(report, /Demo mode does not fabricate team operating metrics/);
});

test('configured team status report resolves runtime team and composes both authenticated read models', async () => {
   const report = await readSource('components/common/teams/team-status-report.tsx');

   assert.match(report, /resolveTeamReference\(teams, teamId\)/);
   assert.match(report, /Promise\.all\(\[/);
   assert.match(report, /\/api\/teams\/\$\{runtimeTeamId\}\/dashboard\?organization=/);
   assert.match(report, /\/api\/dependencies\?organization=/);
   assert.match(report, /credentials: 'same-origin'/);
});

test('team status dependency rollup includes only unresolved edges touching the selected team', async () => {
   const report = await readSource('components/common/teams/team-status-report.tsx');

   assert.match(report, /dependency\.blocking\.team\.id === resolvedTeam\.id/);
   assert.match(report, /dependency\.blocked\.team\.id === resolvedTeam\.id/);
   assert.match(report, /teamDependencies\.slice\(0, 8\)/);
   assert.match(report, /Unresolved persisted blocks relationships where this team owns either issue/);
});

test('team update copy action is deterministic and does not invoke AI generation', async () => {
   const report = await readSource('components/common/teams/team-status-report.tsx');

   assert.match(report, /function buildTeamUpdate\(/);
   assert.match(report, /navigator\.clipboard\.writeText/);
   assert.match(report, /Copy team update/);
   assert.match(report, /Source: current persisted team and dependency records/);
   assert.doesNotMatch(report, /\/api\/agent/);
   assert.doesNotMatch(report, /OPENAI_API_KEY/);
});

test('team navigation exposes status report for configured and demo routes', async () => {
   const nav = await readSource('components/layout/sidebar/nav-teams.tsx');

   assert.match(nav, /href=\{`\/\$\{orgId\}\/team\/\$\{team\.key\}\/status-report`\}/);
   assert.match(nav, /href=\{`\/\$\{orgId\}\/team\/\$\{team\.id\}\/status-report`\}/);
   assert.match(nav, /<span>Status report<\/span>/);
});

test('Phase 38 preserves truthful team reporting boundaries and needs no migration', async () => {
   const scope = await readSource('PHASE38_SCOPE.md');
   const report = await readSource('components/common/teams/team-status-report.tsx');

   assert.match(scope, /No new database migration is required/i);
   assert.match(scope, /Project health is displayed only when a persisted project health update exists/i);
   assert.match(scope, /Team dependencies are only unresolved persisted `blocks` relationships touching the selected team/i);
   assert.match(scope, /does not infer capacity, member utilization, workload percentage, velocity, critical path, delivery probability, or predicted completion dates/i);
   assert.match(report, /No persisted at-risk or off-track project health updates are present/);
   assert.match(report, /does not create delivery forecasts, capacity estimates, or inferred risk scores/i);
});
