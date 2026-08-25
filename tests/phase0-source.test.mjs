import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceRoots = ['app', 'components'];

const readSource = (relativePath) =>
   readFile(path.join(repositoryRoot, relativePath), 'utf8');

async function findSourceFiles(directory) {
   const entries = await readdir(directory, { withFileTypes: true });
   const nested = await Promise.all(
      entries.map((entry) => {
         const entryPath = path.join(directory, entry.name);
         if (entry.isDirectory()) return findSourceFiles(entryPath);
         return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
      })
   );
   return nested.flat();
}

test('the create-issue dialog has one global owner', async () => {
   const files = (
      await Promise.all(sourceRoots.map((root) => findSourceFiles(path.join(repositoryRoot, root))))
   ).flat();
   const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));
   const dialogMounts = sources.reduce(
      (count, source) => count + (source.match(/<CreateNewIssue\s*\/>/g)?.length ?? 0),
      0
   );
   const orgSwitcher = await readSource('components/layout/sidebar/org-switcher.tsx');

   assert.equal(dialogMounts, 1);
   assert.match(orgSwitcher, /<CreateIssueTrigger\s*\/>/);
});

test('board drops update an issue without requiring a nested drop', async () => {
   const source = await readSource('components/common/issues/group-issues.tsx');

   assert.match(source, /drop\(item: Issue\)/);
   assert.doesNotMatch(source, /monitor\.didDrop\(\)/);
   assert.match(source, /updateIssueStatus\(item\.id, status\)/);
});

test('initial issue sorting does not mutate shared mock data', async () => {
   const source = await readSource('store/issues-store.ts');

   assert.match(source, /const initialIssues = \[\.\.\.mockIssues\]\.sort/);
   assert.doesNotMatch(source, /issues:\s*mockIssues\.sort/);
   assert.match(source, /issuesByStatus: groupIssuesByStatus\(initialIssues\)/);
});

test('theme data is validated and stored under a versioned key', async () => {
   const store = await readSource('store/theme-store.ts');
   const preferences = await readSource('components/common/settings/theme-preferences.tsx');

   assert.match(store, /customThemeSchema/);
   assert.match(store, /theme-settings:v1/);
   assert.match(store, /persistedThemeSchema\.safeParse/);
   assert.match(preferences, /customThemeSchema\.safeParse/);
});

test('core accessibility protections remain enabled', async () => {
   const layout = await readSource('app/layout.tsx');
   const mainLayout = await readSource('components/layout/main-layout.tsx');
   const globalStyles = await readSource('app/globals.css');

   assert.doesNotMatch(layout, /maximum-scale|user-scalable/i);
   assert.match(mainLayout, /Skip to main content/);
   assert.match(globalStyles, /prefers-reduced-motion: reduce/);
});

test('baseline response security headers remain configured', async () => {
   const config = await readSource('next.config.ts');

   for (const header of [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
   ]) {
      assert.match(config, new RegExp(header));
   }
});

test('CI uses a supported Node and pnpm toolchain', async () => {
   const manifest = JSON.parse(await readSource('package.json'));
   const workflow = await readSource('.github/workflows/ci.yml');
   const workspaceConfig = await readSource('pnpm-workspace.yaml');

   assert.match(manifest.packageManager, /^pnpm@11\./);
   assert.equal(manifest.engines.node, '>=22.0.0');
   assert.match(workflow, /node-version: 22/);
   assert.match(workflow, /pnpm\/action-setup@v4/);
   assert.match(workspaceConfig, /allowBuilds:\s+sharp: true/);
});
