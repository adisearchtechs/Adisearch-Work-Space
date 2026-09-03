import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R1 create issue persists selected team, assignee, and labels', async () => {
   const modal = await readSource('components/layout/sidebar/create-new-issue/index.tsx');
   const contracts = await readSource('lib/issues/contracts.ts');
   const route = await readSource('app/api/issues/route.ts');

   assert.match(modal, /useTeamsStore/);
   assert.match(modal, /aria-label="Issue team"/);
   assert.match(modal, /teamKey,/);
   assert.doesNotMatch(modal, /teamKey: 'CORE'/);
   assert.match(modal, /assigneeId: addIssueForm\.assignee\?\.id \?\? null/);
   assert.match(modal, /labelIds: addIssueForm\.labels\.map/);
   assert.match(contracts, /assigneeId: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
   assert.match(contracts, /labelIds: z\.array\(z\.string\(\)\.uuid\(\)\)/);
   assert.match(route, /actorMembership\.role === 'guest'/);
   assert.match(route, /Invalid assignee/);
   assert.match(route, /Invalid label/);
   assert.match(route, /assignee_id: parsed\.data\.assigneeId \?\? null/);
   assert.match(route, /\.from\('issue_labels'\)\.insert/);
});

test('R1 hydrates and edits real workspace issue labels', async () => {
   const route = await readSource('app/api/issues/route.ts');
   const mapper = await readSource('lib/issues/mapper.ts');
   const labelRoute = await readSource('app/api/issues/[issueId]/labels/[labelId]/route.ts');
   const provider = await readSource('components/providers/saas-issues-provider.tsx');
   const selector = await readSource('components/layout/sidebar/create-new-issue/label-selector.tsx');
   const properties = await readSource('components/common/issues/details/issue-properties-panel.tsx');

   assert.match(route, /\.from\('issue_labels'\)/);
   assert.match(route, /labelsByIssueId/);
   assert.match(mapper, /labels: dto\.labels\.map/);
   assert.match(labelRoute, /authorizeWorkspaceLabelAccess/);
   assert.match(labelRoute, /hasValidMutationOrigin/);
   assert.match(labelRoute, /export async function POST/);
   assert.match(labelRoute, /export async function DELETE/);
   assert.match(provider, /async addLabel/);
   assert.match(provider, /async removeLabel/);
   assert.match(selector, /\/api\/labels\?organization=/);
   assert.match(properties, /<LabelSelector selectedLabels=\{issue\.labels\} onChange=\{updateLabels\} \/>/);
});

test('R1 configured assignee selector uses real workspace members', async () => {
   const selector = await readSource('components/layout/sidebar/create-new-issue/assignee-selector.tsx');

   assert.match(selector, /\/api\/members\?organization=/);
   assert.match(selector, /workspace\.configured/);
   assert.match(selector, /members\.map\(memberToUser\)/);
});

test('R1 issue detail links resolve both canonical identifiers and legacy UUID links', async () => {
   const details = await readSource('components/common/issues/details/issue-details.tsx');
   const inbox = await readSource('components/common/inbox/persistent-inbox.tsx');
   const routes = await readSource('lib/issues/routes.ts');

   assert.match(details, /candidate\.identifier === issueId \|\| candidate\.id === issueId/);
   assert.match(inbox, /issueHref\(orgId, selected\.issue\.identifier\)/);
   assert.match(routes, /encodeURIComponent\(identifier\)/);
});