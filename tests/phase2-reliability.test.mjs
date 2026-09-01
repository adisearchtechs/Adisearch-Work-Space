import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('issue deletion requires explicit confirmation and waits for persistence', async () => {
   const menu = await readSource('components/common/issues/issue-context-menu.tsx');
   const store = await readSource('store/issues-store.ts');

   assert.match(menu, /<AlertDialog open={deleteDialogOpen}/);
   assert.match(menu, /This action cannot\s+be undone/);
   assert.match(menu, /await deleteIssue\(issueId\)/);
   assert.match(store, /deleteIssue: async/);
   assert.match(store, /await adapter\.delete\(id\)/);
   assert.match(store, /get\(\)\.persistenceAdapter === adapter/);
   assert.match(store, /const restoredIssues = \[\.\.\.state\.issues, deletedIssue\]/);
   assert.match(store, /It has been restored/);
});

test('workspace hydration clears tenant state before loading and on unmount', async () => {
   const provider = await readSource('components/providers/saas-issues-provider.tsx');

   const resetCalls = provider.match(/replaceIssues\(\[\]\)/g) ?? [];
   assert.equal(resetCalls.length, 2);
   assert.match(provider, /controller\.abort\(\)/);
   assert.match(provider, /if \(controller\.signal\.aborted\) return/);
});

test('issue APIs fail closed when supporting reads or updates do not match', async () => {
   const collectionRoute = await readSource('app/api/issues/route.ts');
   const itemRoute = await readSource('app/api/issues/[issueId]/route.ts');

   assert.match(collectionRoute, /teamsError \|\| statusesError \|\| issuesError/);
   assert.match(itemRoute, /\.update\(changes\)[\s\S]*\.select\('id'\)[\s\S]*\.maybeSingle\(\)/);
   assert.match(itemRoute, /if \(!updated\).*status: 404/);
});
