import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

const workflows = [
   '.github/workflows/ci.yml',
   '.github/workflows/browser-e2e.yml',
   '.github/workflows/authenticated-e2e.yml',
];

test('R9 certifies with the same Node major used by production', async () => {
   for (const workflowPath of workflows) {
      const workflow = await readSource(workflowPath);
      assert.match(workflow, /node-version:\s*24/);
      assert.match(workflow, /workflow_dispatch:/);
   }
});

test('R9 runs authenticated E2E on master and all same-repository pull requests', async () => {
   const workflow = await readSource('.github/workflows/authenticated-e2e.yml');

   assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- master/);
   assert.match(workflow, /pull_request:\s*\n\s*branches:\s*\n\s*- master/);
   assert.doesNotMatch(workflow, /\n\s*paths:/);
   assert.match(
      workflow,
      /github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.head\.repo\.full_name == github\.repository/
   );
});

test('R9 covers every foreign key reported as unindexed by the release audit', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903213000_add_missing_foreign_key_indexes.sql'
   );

   for (const indexedColumns of [
      'agent_conversations (created_by, organization_id)',
      'agent_messages (conversation_id, organization_id)',
      'integration_authorization_states (organization_id)',
      'issue_comments (author_id, organization_id)',
      'issue_relations (source_issue_id, organization_id)',
      'issue_relations (target_issue_id, organization_id)',
      'organization_invitation_teams (invitation_id, organization_id)',
      'organization_invitation_teams (team_id, organization_id)',
   ]) {
      assert.match(migration, new RegExp(indexedColumns.replace(/[()]/g, '\\$&')));
   }
});
