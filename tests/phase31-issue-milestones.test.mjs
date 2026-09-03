import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('issue milestones are constrained to the same project and workspace', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903001500_add_issue_milestone_assignments.sql'
   );

   assert.match(migration, /add column milestone_id uuid/i);
   assert.match(migration, /issues_milestone_requires_project_check/i);
   assert.match(
      migration,
      /foreign key \(milestone_id, project_id, organization_id\)[\s\S]*references public\.project_milestones \(id, project_id, organization_id\)/i
   );
   assert.match(migration, /on delete set null \(milestone_id\)/i);
   assert.match(migration, /issues_milestone_project_organization_idx/i);
   assert.match(migration, /'milestone_changed'/);
   assert.match(migration, /issues_capture_milestone_audit_event/i);
});

test('issue contracts and APIs persist validated milestone assignments', async () => {
   const contracts = await readSource('lib/issues/contracts.ts');
   const collection = await readSource('app/api/issues/route.ts');
   const item = await readSource('app/api/issues/[issueId]/route.ts');

   assert.match(contracts, /milestoneId: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
   assert.match(contracts, /milestoneId: string \| null/);
   assert.match(collection, /milestone_id/);
   assert.match(collection, /\.from\('project_milestones'\)/);
   assert.match(collection, /\.eq\('project_id', parsed\.data\.projectId!\)/);
   assert.match(item, /targetMilestoneId/);
   assert.match(item, /projectChanged[\s\S]*\? null/);
   assert.match(item, /\.eq\('project_id', targetProjectId\)/);
   assert.match(item, /milestone_id: targetMilestoneId/);
});

test('issue creation and details expose the real project milestone selector', async () => {
   const selector = await readSource(
      'components/layout/sidebar/create-new-issue/milestone-selector.tsx'
   );
   const createIssue = await readSource('components/layout/sidebar/create-new-issue/index.tsx');
   const properties = await readSource(
      'components/common/issues/details/issue-properties-panel.tsx'
   );
   const provider = await readSource('components/providers/saas-issues-provider.tsx');

   assert.match(selector, /useProjectMilestones\(projectId\)/);
   assert.match(selector, /No milestone/);
   assert.match(selector, /workspace\.user\.role === 'guest'/);
   assert.match(createIssue, /milestoneId: addIssueForm\.milestoneId \?\? null/);
   assert.match(createIssue, /<MilestoneSelector/);
   assert.match(createIssue, /project: newProject,[\s\S]*milestoneId: null/);
   assert.match(properties, /workspace\.configured && \([\s\S]*<MilestoneSelector/);
   assert.match(properties, /milestoneId: null/);
   assert.match(properties, /!workspace\.configured && issue\.project && detail\?\.milestone/);
   assert.match(provider, /'milestoneId' in changes/);
});

test('milestone assignments hydrate and appear in immutable issue activity', async () => {
   const mapper = await readSource('lib/issues/mapper.ts');
   const activityContracts = await readSource('lib/issue-activity/contracts.ts');
   const activityFeed = await readSource('components/common/issues/details/activity-feed.tsx');
   const server = await readSource('lib/supabase/server.ts');

   assert.match(mapper, /milestoneId: dto\.milestoneId/);
   assert.match(activityContracts, /'milestone_changed'/);
   assert.match(activityFeed, /milestone_changed: <Flag/);
   assert.match(activityFeed, /changed milestone from/);
   assert.match(server, /DatabaseWithIssueMilestones/);
});
