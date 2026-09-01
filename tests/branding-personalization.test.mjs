import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('loading surface uses Adisearch identity and removes Circle copy', async () => {
   const loading = await readSource('app/loading.tsx');

   assert.match(loading, /\/brand\/adisearch-mark\.svg/);
   assert.match(loading, /Adisearch Workspace/);
   assert.doesNotMatch(loading, /Loading Circle/);
});

test('authentication and workspace switcher render the Adisearch mark', async () => {
   const login = await readSource('app/login/page.tsx');
   const switcher = await readSource('components/layout/sidebar/org-switcher.tsx');

   assert.match(login, /src=\{brand\.logoPath\}/);
   assert.match(switcher, /src=\{brand\.logoPath\}/);
   assert.match(switcher, /user\.displayName/);
   assert.match(switcher, /settings\/profile/);
});

test('profile settings are session-backed instead of mock-user backed', async () => {
   const profile = await readSource('components/common/settings/profile.tsx');

   assert.match(profile, /useWorkspace/);
   assert.match(profile, /user\.displayName/);
   assert.match(profile, /user\.email/);
   assert.doesNotMatch(profile, /mock-data\/users/);
   assert.doesNotMatch(profile, /defaultValue="LN"/);
});

test('brand configuration points at current Adisearch repository and logo', async () => {
   const brand = await readSource('lib/brand.ts');
   const logo = await readSource('public/brand/adisearch-mark.svg');

   assert.match(brand, /logoPath: '\/brand\/adisearch-mark\.svg'/);
   assert.match(brand, /adisearchtechs\/Adisearch-Work-Space/);
   assert.match(logo, /<title id="title">Adisearch<\/title>/);
});
