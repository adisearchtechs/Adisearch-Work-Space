import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project update contracts accept only the supported non-empty patch', async () => {
   const contracts = await readSource('lib/projects/contracts.ts');

   assert.match(contracts, /export const updateProjectSchema/);
   assert.match(contracts, /name: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)\.optional\(\)/);
   assert.match(contracts, /status: projectStatusSchema\.optional\(\)/);
   assert.match(contracts, /targetDate: z\.string\(\)\.date\(\)\.nullable\(\)\.optional\(\)/);
   assert.match(contracts, /\.strict\(\)[\s\S]*\.refine\(/);
});

test('project patch authenticates, authorizes, validates, and scopes the update', async () => {
   const route = await readSource('app/api/projects/[projectId]/route.ts');

   assert.match(route, /export async function PATCH/);
   assert.match(route, /hasValidMutationOrigin/);
   assert.match(route, /updateProjectSchema\.safeParse\(input\)/);
   assert.match(route, /auth\.getClaims\(\)/);
   assert.match(route, /membership\.role === 'guest'/);
   assert.match(
      route,
      /\.from\('projects'\)[\s\S]*\.update\(changes\)[\s\S]*\.eq\('id', projectId\)[\s\S]*\.eq\('organization_id', organization\.id\)[\s\S]*\.maybeSingle\(\)/
   );
   assert.match(route, /if \(!updated\).*status: 404/);
});

test('project persistence sends only supported fields to the tenant route', async () => {
   const provider = await readSource('components/providers/saas-projects-provider.tsx');

   assert.match(provider, /function supportedProjectChanges/);
   assert.match(provider, /method: 'PATCH'/);
   assert.match(provider, /organization=\$\{encodeURIComponent\(organizationSlug\)\}/);
   assert.match(provider, /body: JSON\.stringify\(supportedProjectChanges\(changes\)\)/);
   assert.match(provider, /update\(id, changes\)/);
});

test('project store rolls back rejected fields without replacing a newer edit', async () => {
   const store = await readSource('store/projects-store.ts');

   assert.match(store, /updateProject: async/);
   assert.match(store, /applyProjectUpdate\(previousProject, changes\)/);
   assert.match(store, /await adapter\.update\(id, changes\)/);
   assert.match(store, /restoreRejectedProjectUpdate/);
   assert.match(store, /currentProject\.name === optimisticProject\.name/);
   assert.match(store, /currentProject\.targetDate === optimisticProject\.targetDate/);
   assert.match(store, /currentProject\.status\.id === optimisticProject\.status\.id/);
   assert.match(store, /get\(\)\.persistenceAdapter === adapter/);
});

test('project edit dialog is accessible, permission-aware, and waits for persistence', async () => {
   const dialog = await readSource('components/common/projects/edit-project-dialog.tsx');

   assert.match(dialog, /aria-label={`Edit \$\{project\.name\}`}/);
   assert.match(dialog, /<DialogTitle>Edit project<\/DialogTitle>/);
   assert.match(dialog, /htmlFor="edit-project-name"/);
   assert.match(dialog, /htmlFor="edit-project-status"/);
   assert.match(dialog, /htmlFor="edit-project-target-date"/);
   assert.match(dialog, /workspace\.user\.role !== 'guest'/);
   assert.match(dialog, /trimmedName !== project\.name/);
   assert.match(dialog, /normalizedTargetDate !== currentTargetDate/);
   assert.match(dialog, /Object\.keys\(changes\)\.length === 0/);
   assert.match(dialog, /await updateProject\(project\.id, changes\)/);
   assert.match(dialog, /submitting \? 'Saving…' : 'Save changes'/);
});

test('project detail header exposes editing only to writers', async () => {
   const header = await readSource('components/layout/headers/project/header.tsx');

   assert.match(header, /const canWrite = .*workspace\.user\.role !== 'guest'/);
   assert.match(header, /{canWrite && <EditProjectDialog project={project} \/>}/);
});
