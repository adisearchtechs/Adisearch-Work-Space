import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('configured project Activity uses persistent updates and never falls back to mock project details', async () => {
   const page = await readSource('app/[orgId]/project/[projectId]/activity/page.tsx');
   const runtime = await readSource('components/common/projects/details/project-activity-runtime.tsx');

   assert.match(page, /ProjectActivityRuntime/);
   assert.doesNotMatch(page, /ProjectActivity from/);
   assert.match(runtime, /workspace\.configured/);
   assert.match(runtime, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/updates\?organization=/);
   assert.match(runtime, /<EntityAttachments entityType="project" entityId=\{project\.id\} \/>/);
   assert.match(runtime, /<ProjectSidePanel project=\{project\} issues=\{issues\} \/>/);
   assert.doesNotMatch(runtime, /getProjectDetail/);
   assert.doesNotMatch(runtime, /mock-data\/project-details/);
});

test('configured project side panel consumes persistent milestone DTOs with an honest loading state', async () => {
   const sidePanel = await readSource('components/common/projects/details/project-side-panel.tsx');
   const properties = await readSource(
      'components/common/projects/details/persistent-project-properties-panel.tsx'
   );

   assert.match(sidePanel, /useProjectMilestones\(project\.id\)/);
   assert.match(sidePanel, /workspace\.configured/);
   assert.match(sidePanel, /milestones=\{milestones\}/);
   assert.match(sidePanel, /milestonesLoading=\{milestonesLoading\}/);
   assert.match(properties, /ProjectMilestoneDto/);
   assert.match(properties, /Loading milestones…/);
   assert.match(properties, /Slack workspace authorization is not released yet/);
   assert.doesNotMatch(properties, /mock-data\/project-details/);
});

test('project resource mutations use a real item endpoint instead of appending after the query string', async () => {
   const resources = await readSource('components/common/projects/details/project-resources.tsx');

   assert.match(
      resources,
      /`\/api\/projects\/\$\{encodedProjectId\}\/resources\/\$\{encodeURIComponent\(resourceId\)\}\?organization=\$\{organization\}`/
   );
   assert.doesNotMatch(resources, /`\$\{collectionEndpoint\}\/\$\{resourceId\}`/);
   assert.match(resources, /method: editingId \? 'PATCH' : 'POST'/);
   assert.match(resources, /method: 'DELETE'/);
});

test('configured team settings navigation is tenant-backed while demo teams stay demo-only', async () => {
   const navigation = await readSource('components/layout/sidebar/nav-teams-settings.tsx');

   assert.match(navigation, /useWorkspace/);
   assert.match(navigation, /useTeamsStore/);
   assert.match(navigation, /workspace\.configured/);
   assert.match(navigation, /joinedTeamIds/);
   assert.match(navigation, /demoTeams/);
   assert.match(navigation, /Loading teams…/);
});

test('Help contains working destinations rather than inert search or shortcut controls', async () => {
   const help = await readSource('components/layout/sidebar/help-button.tsx');

   assert.match(help, /Support/);
   assert.match(help, /Workspace resources/);
   assert.match(help, /Release notes on GitHub/);
   assert.doesNotMatch(help, /Search for help/);
   assert.doesNotMatch(help, /Keyboard shortcuts/);
});

test('Phase 42 scope records the no-migration truthfulness boundary and release gates', async () => {
   const scope = await readSource('PHASE42_SCOPE.md');

   assert.match(scope, /Control Truthfulness & Project Runtime Hardening/);
   assert.match(scope, /does not add a new persistence domain or database table/i);
   assert.match(scope, /Configured workspaces must never fall back to deterministic project detail content/);
   assert.match(scope, /Browser E2E and Authenticated E2E/);
   assert.match(scope, /no database migration is required/i);
   assert.match(scope, /do not deliberately trigger an extra Vercel deployment/i);
});
