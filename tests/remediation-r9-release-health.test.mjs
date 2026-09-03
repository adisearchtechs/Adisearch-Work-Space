import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R9 health endpoint stays minimal and non-cacheable', async () => {
   const route = await readSource('app/api/health/route.ts');

   assert.match(route, /\{ status: 'ok' \}/);
   assert.match(route, /Cache-Control': 'no-store, max-age=0'/);
   assert.doesNotMatch(route, /process\.env/);
});
