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

test('R4A missing model credentials disable Agent at runtime instead of blocking Workspace builds', async () => {
   const config = await readSource('next.config.ts');
   const orchestrator = await readSource('lib/agent/orchestrator.ts');
   const agentRoute = await readSource('app/api/agent/route.ts');

   assert.doesNotMatch(config, /OPENAI_API_KEY/);
   assert.doesNotMatch(config, /throw new Error\([^)]*OPENAI_API_KEY/);
   assert.match(orchestrator, /process\.env\.OPENAI_API_KEY/);
   assert.match(orchestrator, /AGENT_MODEL_NOT_CONFIGURED/);
   assert.match(agentRoute, /agentModelReadiness\(\)/);
   assert.match(agentRoute, /status: 503/);
});
