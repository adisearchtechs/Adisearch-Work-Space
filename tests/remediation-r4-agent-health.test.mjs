import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R4A health probe reports readiness without exposing secret values', async () => {
   const route = await readSource('app/api/health/agent/route.ts');

   assert.match(route, /agentModelReadiness\(\)/);
   assert.match(route, /isSupabaseConfigured\(\)/);
   assert.match(route, /status: ready \? 200 : 503/);
   assert.match(route, /Cache-Control': 'no-store'/);
   assert.doesNotMatch(route, /process\.env\.OPENAI_API_KEY/);
   assert.doesNotMatch(route, /Authorization:/);
});
