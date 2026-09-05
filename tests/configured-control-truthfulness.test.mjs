import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('configured settings never expose prototype-only connected or enabled controls', async () => {
   const page = await readSource('app/[orgId]/settings/[section]/page.tsx');
   const runtime = await readSource('components/common/settings/settings-section-runtime.tsx');

   assert.match(page, /SettingsSectionRuntime/);
   assert.match(runtime, /if \(!workspace\.configured\)/);
   assert.match(runtime, /section === 'issue-labels'/);
   assert.match(runtime, /section === 'members'/);
   assert.match(runtime, /section === 'profile'/);
   assert.match(runtime, /No connected accounts/);
   assert.match(runtime, /No production integrations connected/);
   assert.match(runtime, /Git synchronization not connected/);
   assert.match(runtime, /Prototype.*hidden/i);
   assert.match(runtime, /SettingsPlaceholder config=\{placeholder\}/);
});

test('configured agent does not stream canned demo replies', async () => {
   const page = await readSource('app/[orgId]/agent/page.tsx');
   const runtime = await readSource('components/common/agent/agent-runtime.tsx');

   assert.match(page, /AgentRuntime/);
   assert.match(runtime, /workspace\.configured/);
   assert.match(runtime, /Agent is not connected yet/);
   assert.match(runtime, /deterministic demo agent is intentionally/);
   assert.match(runtime, /return <AgentChat \/>/);
});

test('configured issue detail uses persisted issue fields and hides unimplemented collaboration controls', async () => {
   const page = await readSource('app/[orgId]/issue/[issueId]/page.tsx');
   const runtime = await readSource('components/common/issues/details/issue-details-runtime.tsx');

   assert.match(page, /IssueDetailsRuntime/);
   assert.match(runtime, /workspace\.configured \? <PersistentIssueDetails \/> : <IssueDetails \/>/);
   assert.match(runtime, /issue\.description/);
   assert.match(runtime, /IssueSubscriptionButton/);
   assert.match(runtime, /Reactions, file attachments, persistent sub-issues/);
   assert.doesNotMatch(runtime, /getIssueDetail\(/);
   assert.doesNotMatch(runtime, /aria-label="Attach file"/);
   assert.doesNotMatch(runtime, /Add sub-issues/);
});

test('configured project side panel contains only real navigation and truthful integration state', async () => {
   const router = await readSource('components/common/projects/details/project-side-panel.tsx');
   const persistent = await readSource(
      'components/common/projects/details/persistent-project-properties-panel.tsx'
   );

   assert.match(router, /workspace\.configured \?/);
   assert.match(router, /PersistentProjectPropertiesPanel/);
   assert.match(router, /activity: \[\]/);
   assert.match(persistent, /\$\{base\}\/overview/);
   assert.match(persistent, /\$\{base\}\/issues/);
   assert.match(persistent, /\$\{base\}\/milestones/);
   assert.match(persistent, /\$\{base\}\/activity/);
   assert.match(persistent, /No Slack integration is connected/);
   assert.doesNotMatch(persistent, /<button/);
   assert.doesNotMatch(persistent, /Connect channel/);
   assert.doesNotMatch(persistent, /Add members/);
});

test('project resource item mutations build the path before the organization query string', async () => {
   const resources = await readSource('components/common/projects/details/project-resources.tsx');

   assert.match(resources, /const itemEndpoint = \(resourceId: string\)/);
   assert.match(
      resources,
      /resources\/\$\{encodeURIComponent\(resourceId\)\}\?organization=\$\{organization\}/
   );
   assert.match(resources, /editingId \? itemEndpoint\(editingId\) : collectionEndpoint/);
   assert.match(resources, /fetch\(itemEndpoint\(resource\.id\)/);
   assert.doesNotMatch(resources, /\$\{collectionEndpoint\}\/\$\{encodeURIComponent/);
});

test('configured project activity exposes only real post controls', async () => {
   const page = await readSource('app/[orgId]/project/[projectId]/activity/page.tsx');
   const runtime = await readSource('components/common/projects/details/project-activity-runtime.tsx');

   assert.match(page, /ProjectActivityRuntime/);
   assert.match(runtime, /workspace\.configured \? <PersistentProjectActivity/);
   assert.match(runtime, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/updates/);
   assert.match(runtime, /method: 'POST'/);
   assert.match(runtime, /Agent drafting and file attachments are not connected yet/);
   assert.doesNotMatch(runtime, /Sparkles/);
   assert.doesNotMatch(runtime, /Paperclip/);
});

test('persistent Reviews visible controls are connected or truthfully unavailable', async () => {
   const reviews = await readSource('components/common/reviews/persistent-reviews.tsx');

   assert.match(reviews, /onClick=\{\(\) => setShowCreate/);
   assert.match(reviews, /onSubmit=\{createReview\}/);
   assert.match(reviews, /href=\{`\/\$\{workspace\.organization\.slug\}\/reviews`\}/);
   assert.match(reviews, /href=\{`\/\$\{workspace\.organization\.slug\}\/reviews\/created`\}/);
   assert.match(reviews, /runMutation\(`\/api\/reviews\/\$\{selectedReview\.id\}/);
   assert.match(reviews, /method: 'PATCH'/);
   assert.match(reviews, /method: 'DELETE'/);
   assert.match(reviews, /onSubmit=\{submitComment\}/);
   assert.match(reviews, /Open linked pull request/);
   assert.match(reviews, /Git-backed .* is not connected yet/);
   assert.doesNotMatch(reviews, /console\.log/);
   assert.doesNotMatch(reviews, /href=["']#["']/);
});
