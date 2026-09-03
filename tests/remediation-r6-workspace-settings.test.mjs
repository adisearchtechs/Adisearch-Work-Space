import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R6B workspace settings contract allows only a bounded organization name', async () => {
   const contract = await readSource('lib/workspace-settings/contracts.ts');

   assert.match(contract, /name: z\.string\(\)\.trim\(\)\.min\(2\)\.max\(100\)/);
   assert.match(contract, /\.strict\(\)/);
   assert.doesNotMatch(contract, /slug:/);
});

test('R6B workspace settings API requires membership and admin authority for writes', async () => {
   const route = await readSource('app/api/workspace-settings/route.ts');

   assert.match(route, /authorizeWorkspaceMemberAccess/);
   assert.match(route, /request,\s*true,\s*'Unable to save workspace settings\.'/s);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /readJsonBody\(request\)/);
   assert.match(route, /workspaceSettingsPatchSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('organizations'\)/);
   assert.match(route, /\.update\(\{ name: parsed\.data\.name, updated_at:/);
   assert.match(route, /\.eq\('id', context\.organizationId\)/);
   assert.doesNotMatch(route, /slug: parsed\.data/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});

test('R6B workspace settings UI persists organization name and keeps URL slug immutable', async () => {
   const component = await readSource('components/common/settings/workspace-general-settings.tsx');
   const route = await readSource('app/[orgId]/settings/[section]/page.tsx');
   const nav = await readSource('components/layout/sidebar/nav-settings.tsx');

   assert.match(component, /user\.role === 'owner' \|\| user\.role === 'admin'/);
   assert.match(component, /\/api\/workspace-settings\?organization=/);
   assert.match(component, /method: 'PATCH'/);
   assert.match(component, /body: JSON\.stringify\(\{ name: trimmedName \}\)/);
   assert.match(component, /router\.refresh\(\)/);
   assert.match(component, /value=\{organization\.slug\}/);
   assert.match(component, /readOnly/);
   assert.match(component, /URL changes are intentionally disabled/);
   assert.doesNotMatch(component, /localStorage/);

   assert.match(route, /'workspace': WorkspaceGeneralSettings/);
   assert.match(nav, /name: 'General', url: '\/settings\/workspace'/);
});

test('R6 keeps unreleased preference and notification controls behind truthful notices', async () => {
   const route = await readSource('app/[orgId]/settings/[section]/page.tsx');

   assert.match(route, /Persistent user preferences are not configurable yet/);
   assert.match(route, /Notification delivery preferences are not configurable yet/);
   assert.match(route, /'preferences': PreferencesNotice/);
   assert.match(route, /'notifications': NotificationsNotice/);
});
