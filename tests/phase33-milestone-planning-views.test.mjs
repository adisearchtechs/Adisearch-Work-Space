import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('milestones expose a dedicated nested planning route', async () => {
   const route = await readSource(
      'app/[orgId]/project/[projectId]/milestones/[milestoneId]/page.tsx'
   );
   const header = await readSource('components/layout/headers/project/header.tsx');

   assert.match(route, /ProjectMilestonePlanning/);
   assert.match(route, /projectId, milestoneId/);
   assert.match(route, /<Header projectId=\{projectId\}/);
   assert.match(header, /pathname === href \|\| pathname\.startsWith\(`\$\{href\}\/`\)/);
});

test('configured milestone planning scopes persistent issues to project and milestone', async () => {
   const planning = await readSource(
      'components/common/projects/details/project-milestone-planning.tsx'
   );

   assert.match(planning, /useProjectMilestones\(projectId\)/);
   assert.match(planning, /issue\.project\?\.id === projectId/);
   assert.match(planning, /\(issue as WorkspaceIssue\)\.milestoneId === milestoneId/);
   assert.match(planning, /applyIssueFilters\(milestoneIssues, filters\)/);
   assert.match(planning, /status\.category === 'completed'/);
   assert.match(planning, /status\.category === 'canceled'/);
});

test('milestone planning supports board and list views over the existing issue system', async () => {
   const planning = await readSource(
      'components/common/projects/details/project-milestone-planning.tsx'
   );

   assert.match(planning, /useState<'board' \| 'list'>\('board'\)/);
   assert.match(planning, /<IssueFilterBar/);
   assert.match(planning, /<GroupedIssuesView/);
   assert.match(planning, /statuses=\{displayOrderedStatus\}/);
   assert.match(planning, /isViewTypeGrid=\{view === 'board'\}/);
   assert.match(planning, /No issues assigned to this milestone/);
});

test('milestone index surfaces real assignment counts and links into planning', async () => {
   const milestones = await readSource(
      'components/common/projects/details/project-milestones.tsx'
   );

   assert.match(milestones, /\(issue as WorkspaceIssue\)\.milestoneId === milestone\.id/);
   assert.match(milestones, /completedCount/);
   assert.match(milestones, /plannedCount/);
   assert.match(milestones, /\% complete/);
   assert.match(milestones, /milestones\$\{milestone\.id\}/);
});

test('Phase 33 reuses existing persistent milestone and issue schema', async () => {
   const scope = await readSource('PHASE33_SCOPE.md');

   assert.match(scope, /No new database migration/i);
   assert.match(scope, /project_milestones/);
   assert.match(scope, /issues\.milestone_id/);
   assert.match(scope, /configured workspace/i);
   assert.match(scope, /demo/i);
});
