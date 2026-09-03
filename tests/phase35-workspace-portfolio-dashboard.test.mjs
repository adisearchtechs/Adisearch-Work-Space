import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('workspace root becomes a configured portfolio dashboard while preserving demo redirect behavior', async () => {
   const page = await readSource('app/[orgId]/page.tsx');

   assert.match(page, /WorkspacePortfolioDashboard/);
   assert.match(page, /isSupabaseConfigured\(\)/);
   assert.match(page, /redirect\(`\/\$\{orgId\}\/team\/CORE\/all`\)/);
   assert.match(page, /<MainLayout header=\{<Header \/>\}/);
});

test('workspace dashboard read model is authenticated, tenant scoped, and persistent-data only', async () => {
   const route = await readSource('app/api/dashboard/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /\.from\('organization_members'\)/);
   assert.match(route, /\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /\.from\('teams'\)/);
   assert.match(route, /\.from\('statuses'\)/);
   assert.match(route, /\.from\('issues'\)/);
   assert.match(route, /\.from\('projects'\)/);
   assert.match(route, /\.from\('project_updates'\)/);
   assert.match(route, /\.from\('project_milestones'\)/);
   assert.match(route, /\.from\('initiatives'\)/);
   assert.match(route, /\.from\('initiative_projects'\)/);
   assert.match(route, /\.from\('initiative_updates'\)/);
   assert.match(route, /'Cache-Control': 'private, no-store'/);
});

test('portfolio dashboard derives issue attention, project progress, and cross-project milestone horizon', async () => {
   const route = await readSource('app/api/dashboard/route.ts');

   assert.match(route, /status\.slug === 'blocked'/);
   assert.match(route, /issue\.priority === 'urgent'/);
   assert.match(route, /issue\.due_date < today/);
   assert.match(route, /completedCount \/ countable/);
   assert.match(route, /issue\.milestone_id === milestone\.id/);
   assert.match(route, /overdue: !milestone\.completed/);
   assert.match(route, /projectIdsByInitiative/);
   assert.match(route, /latestProjectHealth/);
   assert.match(route, /latestInitiativeHealth/);
});

test('configured workspace overview renders portfolio health, milestone horizon, initiatives and attention', async () => {
   const dashboard = await readSource('components/common/workspace/workspace-portfolio-dashboard.tsx');
   const nav = await readSource('components/layout/sidebar/nav-workspace.tsx');

   assert.match(dashboard, /\/api\/dashboard\?organization=/);
   assert.match(dashboard, /Portfolio health/);
   assert.match(dashboard, /Milestone horizon/);
   assert.match(dashboard, /Initiatives/);
   assert.match(dashboard, /Needs attention/);
   assert.match(dashboard, /project\.progress/);
   assert.match(dashboard, /milestone\.progress/);
   assert.match(nav, /<LayoutDashboard \/>/);
   assert.match(nav, /<span>Overview<\/span>/);
   assert.match(nav, /href=\{`\/\$\{orgId\}`\}/);
});

test('Phase 35 reuses released schema and explicitly avoids fabricated analytics', async () => {
   const scope = await readSource('PHASE35_SCOPE.md');

   assert.match(scope, /No new database migration is required/i);
   assert.match(scope, /project_milestones/);
   assert.match(scope, /initiative_projects/);
   assert.match(scope, /No velocity, capacity, workload percentage, or predictive delivery score is fabricated/i);
   assert.match(scope, /Unconfigured\/demo mode preserves the existing `CORE\/all` redirect/i);
});
