import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R4A model execution is server-only, uses Responses function calling, and fails closed when unconfigured', async () => {
   const orchestrator = await readSource('lib/agent/orchestrator.ts');
   const env = await readSource('.env.example');

   assert.match(orchestrator, /import 'server-only'/);
   assert.match(orchestrator, /https:\/\/api\.openai\.com\/v1\/responses/);
   assert.match(orchestrator, /process\.env\.OPENAI_API_KEY/);
   assert.match(orchestrator, /OPENAI_AGENT_MODEL/);
   assert.match(orchestrator, /gpt-5\.6-terra/);
   assert.match(orchestrator, /function_call_output/);
   assert.match(orchestrator, /call_id: call\.call_id/);
   assert.match(orchestrator, /previous_response_id: response\.id/);
   assert.match(orchestrator, /AGENT_MODEL_NOT_CONFIGURED/);
   assert.doesNotMatch(orchestrator, /service[_-]?role/i);

   assert.match(env, /OPENAI_API_KEY=/);
   assert.match(env, /OPENAI_AGENT_MODEL=gpt-5\.6-terra/);
   assert.doesNotMatch(env, /NEXT_PUBLIC_OPENAI/i);
});

test('R4A exposes only bounded tenant-scoped read tools and no workspace mutation capability', async () => {
   const tools = await readSource('lib/agent/tools.ts');
   const expectedTools = [
      'list_issues',
      'get_issue',
      'search_projects',
      'get_project',
      'list_milestones',
      'list_teams',
      'list_cycles',
      'inspect_dependencies',
      'workspace_portfolio_summary',
      'search_documents',
      'list_reviews',
   ];

   assert.match(tools, /import 'server-only'/);
   assert.match(tools, /MAX_TOOL_ROWS = 50/);
   for (const toolName of expectedTools) {
      assert.match(tools, new RegExp(`name: '${toolName}'`));
   }
   const tenantScopes = tools.match(/\.eq\('organization_id', organizationId\)/g) ?? [];
   assert.ok(tenantScopes.length >= 10, 'Agent reads must repeatedly enforce organization scope');
   assert.doesNotMatch(tools, /\.insert\(/);
   assert.doesNotMatch(tools, /\.update\(/);
   assert.doesNotMatch(tools, /\.delete\(/);
   assert.doesNotMatch(tools, /\.rpc\(/);
   assert.doesNotMatch(tools, /service[_-]?role/i);
});

test('R4A generates a grounded model reply before any new Agent messages are persisted', async () => {
   const route = await readSource('app/api/agent/route.ts');

   assert.match(route, /authorizeAgentAccess\(request, true\)/);
   assert.match(route, /agentModelReadiness\(\)/);
   assert.match(route, /status: 503/);
   assert.match(route, /generated = await generateWorkspaceAgentReply/);
   assert.match(route, /No message was saved/);
   assert.match(route, /content: generated\.reply/);
   assert.match(route, /mode: 'read-only'/);
   assert.doesNotMatch(route, /getAgentReply/);

   const generation = route.indexOf('generated = await generateWorkspaceAgentReply');
   const persistence = route.indexOf('const { data: messages, error: messageError }');
   assert.ok(generation >= 0 && persistence > generation, 'Model generation must precede message persistence');
});

test('R4A client displays the server response, rolls back failures, and contains no fake write affordances', async () => {
   const store = await readSource('store/agent-chat-store.ts');
   const component = await readSource('components/common/agent/agent-chat.tsx');
   const examples = await readSource('mock-data/agent.ts');

   assert.match(store, /persistedAssistant/);
   assert.match(store, /return \{ \.\.\.persistedAssistant, streaming: false \}/);
   assert.match(store, /item\.id !== userMessageId && item\.id !== assistantMessageId/);
   assert.match(store, /payload\.canWrite === false/);
   assert.doesNotMatch(store, /getAgentReply/);

   assert.match(component, /Real AI enabled/);
   assert.match(component, /Read-only workspace tools/);
   assert.match(component, /R4A cannot modify workspace data/);
   assert.doesNotMatch(component, /Paperclip/);
   assert.doesNotMatch(component, /useStreamReply/);
   assert.doesNotMatch(component, /Agent is now your default view/);

   assert.doesNotMatch(examples, /CANNED_REPLIES/);
   assert.doesNotMatch(examples, /getAgentReply/);
   assert.doesNotMatch(examples, /Create a new project/);
   assert.doesNotMatch(examples, /Create automated loop/);
});
