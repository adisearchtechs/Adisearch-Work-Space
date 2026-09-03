import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Phase 27 migration keeps Agent conversations tenant-safe and private to their creator', async () => {
   const migration = await readSource(
      'supabase/migrations/20260902201500_add_persistent_agent_conversations.sql'
   );
   assert.match(migration, /create table public\.agent_conversations/);
   assert.match(migration, /create table public\.agent_messages/);
   assert.match(migration, /agent_conversations_creator_organization_fkey/);
   assert.match(migration, /agent_messages_conversation_organization_fkey/);
   assert.match(migration, /generated always as identity/);
   assert.match(migration, /alter table public\.agent_conversations enable row level security/);
   assert.match(migration, /alter table public\.agent_messages enable row level security/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /grant select, insert on table public\.agent_messages to authenticated/);
   assert.doesNotMatch(migration, /grant .*update.*agent_messages/i);
});

test('Agent API authenticates membership, rejects unsafe mutations and persists model-derived replies', async () => {
   const route = await readSource('app/api/agent/route.ts');
   const server = await readSource('lib/agent/server.ts');
   const contracts = await readSource('lib/agent/contracts.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /authorizeAgentAccess\(request, true\)/);
   assert.match(route, /agentModelReadiness\(\)/);
   assert.match(route, /generateWorkspaceAgentReply/);
   assert.match(route, /agentChatTitleFrom\(body\.input\)/);
   assert.match(route, /content: generated\.reply/);
   assert.doesNotMatch(route, /getAgentReply/);
   assert.match(route, /\.from\('agent_conversations'\)/);
   assert.match(route, /\.from\('agent_messages'\)/);
   assert.match(contracts, /MAX_AGENT_INPUT_CHARS = 8000/);
});

test('configured Agent UI hydrates persistence and displays only server-authoritative replies', async () => {
   const component = await readSource('components/common/agent/agent-chat.tsx');
   const store = await readSource('store/agent-chat-store.ts');

   assert.match(component, /useWorkspace\(\)/);
   assert.match(component, /connectPersistence\(workspace\.configured/);
   assert.match(component, /agentAvailability/);
   assert.match(component, /Read-only workspace tools/);
   assert.doesNotMatch(component, /useStreamReply/);
   assert.match(store, /\/api\/agent\?organization=/);
   assert.match(store, /credentials: 'same-origin'/);
   assert.match(store, /method: 'POST'/);
   assert.match(store, /persistenceQueue/);
   assert.match(store, /persistedAssistant/);
   assert.match(store, /streaming: false/);
   assert.doesNotMatch(store, /getAgentReply/);
   assert.doesNotMatch(store, /appendToMessage/);
   assert.doesNotMatch(store, /finishMessage/);
});

test('Phase 27 extends the stacked database type chain and records the Agent persistence boundary', async () => {
   const database = await readSource('lib/supabase/database-with-agent.ts');
   const scope = await readSource('PHASE27_SCOPE.md');

   assert.match(database, /DatabaseWithAttachments/);
   assert.match(database, /agent_conversations: AgentConversationsTable/);
   assert.match(database, /agent_messages: AgentMessagesTable/);
   assert.match(scope, /model-provider execution/i);
   assert.match(scope, /tool calling/i);
   assert.match(scope, /Do not merge/i);
   assert.match(scope, /20260902201500_add_persistent_agent_conversations/);
});
