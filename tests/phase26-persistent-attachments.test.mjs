import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('Phase 26 migration creates a private, bounded, tenant-safe attachment foundation', async () => {
   const migration = await readSource('supabase/migrations/20260902194631_add_workspace_attachments.sql');
   assert.match(migration, /'workspace-attachments'/);
   assert.match(migration, /false,\s*26214400/);
   assert.match(migration, /create table public\.attachments/);
   assert.match(migration, /attachments_exactly_one_parent/);
   assert.match(migration, /foreign key \(issue_id, organization_id\)/);
   assert.match(migration, /foreign key \(project_id, organization_id\)/);
   assert.match(migration, /foreign key \(initiative_id, organization_id\)/);
   assert.match(migration, /alter table public\.attachments enable row level security/);
   assert.match(migration, /private\.is_org_member\(organization_id\)/);
   assert.match(migration, /private\.can_write_org\(organization_id\)/);
   assert.match(migration, /revoke all on table public\.attachments from anon, authenticated/);
   assert.match(migration, /grant select, insert, delete on table public\.attachments to authenticated/);
   assert.doesNotMatch(migration, /grant update on table public\.attachments/);
   assert.match(migration, /workspace_attachments_select_members/);
   assert.match(migration, /workspace_attachments_insert_writers/);
   assert.match(migration, /workspace_attachments_delete_writers/);
   assert.match(migration, /storage\.foldername\(name\)/);
});

test('attachment APIs authenticate tenant targets, protect mutations, validate files, and use signed downloads', async () => {
   const collection = await readSource('app/api/attachments/route.ts');
   const item = await readSource('app/api/attachments/[attachmentId]/route.ts');
   const server = await readSource('lib/attachments/server.ts');
   const contracts = await readSource('lib/attachments/contracts.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /entityExists/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /request\.formData\(\)/);
   assert.match(collection, /MAX_ATTACHMENT_BYTES/);
   assert.match(collection, /allowedAttachmentMimeTypes/);
   assert.match(collection, /upsert: false/);
   assert.match(collection, /crypto\.randomUUID\(\)/);
   assert.match(item, /createSignedUrl/);
   assert.match(item, /60/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(contracts, /25 \* 1024 \* 1024/);
   assert.match(contracts, /'issue', 'project', 'initiative'/);
});

test('configured issue, project and initiative surfaces use the shared attachment UI without leaking it into demo mode', async () => {
   const component = await readSource('components/common/attachments/entity-attachments.tsx');
   const issue = await readSource('components/common/issues/details/issue-details.tsx');
   const project = await readSource('components/common/projects/details/project-overview.tsx');
   const initiative = await readSource('components/common/initiatives/initiative-resources.tsx');

   assert.match(component, /if \(!workspace\.configured\) return null/);
   assert.match(component, /\/api\/attachments\?organization=/);
   assert.match(component, /FormData/);
   assert.match(component, /Download/);
   assert.match(component, /Delete/);
   assert.match(issue, /<EntityAttachments entityType="issue" entityId=\{issue\.id\} compact \/>/);
   assert.match(issue, /!workspace\.configured && <button[^>]*aria-label="Attach file"/s);
   assert.match(project, /<EntityAttachments entityType="project" entityId=\{project\.id\} \/>/);
   assert.match(initiative, /<EntityAttachments entityType="initiative" entityId=\{initiativeId\} \/>/);
});

test('Phase 26 extends the stacked database type chain and records deferred content scanning', async () => {
   const database = await readSource('lib/supabase/database-with-attachments.ts');
   const scope = await readSource('PHASE26_SCOPE.md');

   assert.match(database, /DatabaseWithReviews/);
   assert.match(database, /attachments: AttachmentsTable/);
   assert.match(scope, /malware\/virus scanning/i);
   assert.match(scope, /signed URLs?/i);
   assert.match(scope, /Do not merge/i);
   assert.match(scope, /20260902194631_add_workspace_attachments/);
});
