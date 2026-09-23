import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('project collection derives persisted issue-completion progress per tenant', async () => {
   const route = await readSource('app/api/projects/route.ts');

   assert.match(route, /\.from\('issues'\)[\s\S]*\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /\.from\('statuses'\)[\s\S]*\.eq\('organization_id', organization\.id\)/);
   assert.match(route, /if \(category === 'canceled'\) continue/);
   assert.match(route, /if \(category === 'completed'\) counts\.completed \+= 1/);
   assert.match(route, /Math\.round\(\(counts\.completed \/ counts\.countable\) \* 100\)/);
   assert.match(route, /percentCompleteByProjectId/);
});

test('configured project surfaces use persisted progress instead of status placeholders', async () => {
   const contracts = await readSource('lib/projects/contracts.ts');
   const mapper = await readSource('lib/projects/mapper.ts');

   assert.match(contracts, /percentComplete: number/);
   assert.match(mapper, /statusFields\(dto\.status, dto\.percentComplete\)/);
   assert.doesNotMatch(mapper, /projectStatus === 'completed' \? 100 : 0/);
});
