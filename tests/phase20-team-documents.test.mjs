import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('team document contracts bound titles and document bodies', async () => {
   const contracts = await readSource('lib/team-documents/contracts.ts');
   assert.match(contracts, /z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
   assert.match(contracts, /z\.string\(\)\.max\(50000\)/);
   assert.match(contracts, /pinned: z\.boolean\(\)/);
   assert.match(contracts, /At least one team document field is required/);
});

test('team document APIs authenticate, tenant-scope and protect writes', async () => {
   const server = await readSource('lib/team-documents/server.ts');
   const collection = await readSource('app/api/teams/[teamId]/documents/route.ts');
   const item = await readSource('app/api/teams/[teamId]/documents/[documentId]/route.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /requireWrite && membership\.role === 'guest'/);
   assert.match(server, /\.eq\('organization_id', organization\.id\)/);
   assert.match(server, /\.eq\('key', upperReference\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /\.eq\('team_id', context\.team\.id\)/);
   assert.match(item, /\.eq\('team_id', context\.team\.id\)/);
   assert.match(collection, /created_by: context\.userId/);
   assert.match(collection, /canWrite: context\.role !== 'guest'/);
});

test('configured team documents use persistent CRUD while demo data stays isolated', async () => {
   const documents = await readSource('components/common/teams/team-documents.tsx');

   assert.match(documents, /if \(!workspace\.configured\) return <DemoTeamDocuments \/>/);
   assert.match(documents, /\/api\/teams\/\$\{encodeURIComponent\(resolvedTeam\.id\)\}\/documents/);
   assert.match(documents, /method: editingExisting \? 'PATCH' : 'POST'/);
   assert.match(documents, /method: 'DELETE'/);
   assert.match(documents, /body: JSON\.stringify\(\{ pinned: !document\.pinned \}\)/);
   assert.match(documents, /maxLength=\{160\}/);
   assert.match(documents, /maxLength=\{50000\}/);
   assert.doesNotMatch(documents, /dangerouslySetInnerHTML/);
});

test('team overview and runtime navigation expose persisted pinned documents', async () => {
   const overview = await readSource('components/common/teams/team-overview.tsx');
   const navigation = await readSource('components/layout/sidebar/nav-teams.tsx');
   const tabs = await readSource('components/layout/headers/team/header-tabs.tsx');

   assert.match(overview, /\/documents\$\{query\}/);
   assert.match(overview, /documents\.filter\(\(document\) => document\.pinned\)/);
   assert.match(overview, /Pinned documents/);
   assert.match(navigation, /team\/\$\{team\.key\}\/documents/);
   assert.match(tabs, /\{ label: 'Documents', segment: 'documents' \}/);
});

test('team documents migration is bounded, tenant-scoped, indexed and RLS protected', async () => {
   const migration = await readSource('supabase/migrations/20260902040516_add_team_documents.sql');
   const types = await readSource('lib/supabase/database.types.ts');
   const scope = await readSource('PHASE20_SCOPE.md');

   assert.match(migration, /create table public\.team_documents/);
   assert.match(migration, /char_length\(title\) >= 1 and char_length\(title\) <= 160/);
   assert.match(migration, /char_length\(body\) <= 50000/);
   assert.match(migration, /foreign key \(team_id, organization_id\)/);
   assert.match(migration, /references public\.teams\(id, organization_id\)/);
   assert.match(migration, /create index team_documents_team_org_idx/);
   assert.match(migration, /alter table public\.team_documents enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /created_by = \(select auth\.uid\(\)\)/);
   assert.match(migration, /revoke all on public\.team_documents from anon/);
   assert.match(migration, /private\.set_updated_at\(\)/);
   assert.match(types, /team_documents: Table</);
   assert.match(scope, /20260902040516_add_team_documents/);
});
