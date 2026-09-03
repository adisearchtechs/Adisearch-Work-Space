import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

const migrationPath =
   'supabase/migrations/20260903172500_harden_privileged_function_boundaries.sql';

test('R7 moves privileged invitation and integration implementations out of the exposed schema', async () => {
   const migration = await readSource(migrationPath);

   for (const name of [
      'create_organization_invitation',
      'revoke_organization_invitation',
      'accept_organization_invitation',
      'reissue_organization_invitation',
      'create_integration_authorization_state',
      'get_integration_authorization_state',
      'record_integration_authorization_candidate',
      'complete_github_integration_authorization',
   ]) {
      assert.match(migration, new RegExp(`alter function public\\.${name}\\([\\s\\S]*?set schema private`, 'i'));
      assert.match(migration, new RegExp(`create function public\\.${name}\\(`));
   }

   assert.equal((migration.match(/security invoker/g) ?? []).length >= 8, true);
   assert.doesNotMatch(
      migration,
      /create function public\.[a-z_]+\([\s\S]*?security definer/i
   );
});

test('R7 keeps public RPC names authenticated-only while private implementations remain explicit', async () => {
   const migration = await readSource(migrationPath);

   assert.match(
      migration,
      /revoke all on function public\.accept_organization_invitation\(text\)[\s\S]*from public, anon, authenticated/i
   );
   assert.match(
      migration,
      /grant execute on function public\.accept_organization_invitation\(text\) to authenticated/i
   );
   assert.match(
      migration,
      /revoke all on function private\.complete_github_integration_authorization\(text, text, text, text\[\]\)[\s\S]*from public, anon, authenticated/i
   );
   assert.match(
      migration,
      /grant execute on function private\.complete_github_integration_authorization\(text, text, text, text\[\]\)[\s\S]*to authenticated/i
   );
});

test('R7 removes direct execution from trigger-only definer helpers', async () => {
   const migration = await readSource(migrationPath);

   for (const name of ['handle_new_user', 'bootstrap_workspace', 'assign_issue_number']) {
      assert.match(
         migration,
         new RegExp(`revoke all on function private\\.${name}\\(\\) from public, anon, authenticated`, 'i')
      );
   }
});

test('R7 defaults new public and private functions to non-executable application roles', async () => {
   const migration = await readSource(migrationPath);

   assert.match(
      migration,
      /alter default privileges for role postgres in schema public[\s\S]*revoke execute on functions from public, anon, authenticated/i
   );
   assert.match(
      migration,
      /alter default privileges for role postgres in schema private[\s\S]*revoke execute on functions from public, anon, authenticated/i
   );
});
