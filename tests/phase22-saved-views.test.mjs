import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('saved-view contracts bound metadata, team ids and filter shapes', async () => {
   const contracts = await readSource('lib/views/contracts.ts');

   assert.match(contracts, /z\.enum\(\['issue', 'project'\]\)/);
   assert.match(contracts, /z\.string\(\)\.trim\(\)\.min\(1\)\.max\(160\)/);
   assert.match(contracts, /z\.string\(\)\.max\(1000\)/);
   assert.match(contracts, /teamId: z\.string\(\)\.uuid\(\)\.nullable\(\)\.optional\(\)/);
   assert.match(contracts, /statusCategories: z\.array/);
   assert.match(contracts, /statusIds: z\.array/);
   assert.match(contracts, /priorityIds: z\.array/);
   assert.match(contracts, /hasProject: z\.boolean\(\)\.optional\(\)/);
   assert.match(contracts, /hasIssueOnlySavedViewFilter/);
   assert.match(contracts, /value\.viewType === 'project'/);
});

test('saved-view APIs enforce authentication, tenancy, same-origin mutations and ownership', async () => {
   const server = await readSource('lib/views/server.ts');
   const collection = await readSource('app/api/views/route.ts');
   const item = await readSource('app/api/views/[viewId]/route.ts');

   assert.match(server, /supabase\.auth\.getClaims\(\)/);
   assert.match(server, /\.eq\('slug', organizationSlug\)/);
   assert.match(server, /\.from\('organization_members'\)/);
   assert.match(server, /membership\.role === 'guest'/);
   assert.match(server, /\.from\('teams'\)/);
   assert.match(server, /\.eq\('organization_id', context\.organizationId\)/);
   assert.match(collection, /hasValidMutationOrigin\(request\)/);
   assert.match(collection, /\.from\('saved_views'\)/);
   assert.match(collection, /owner_id: context\.userId/);
   assert.match(item, /hasValidMutationOrigin\(request\)/);
   assert.match(item, /canManageSavedView/);
   assert.match(item, /existing\.view_type === 'project'/);
   assert.match(item, /hasIssueOnlySavedViewFilter/);
   assert.match(item, /\.eq\('organization_id', context\.organizationId\)/);
});

test('configured saved-view runtime is persistent while demo mode remains isolated', async () => {
   const provider = await readSource('components/providers/saas-saved-views-provider.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');
   const viewsRuntime = await readSource('components/common/views/views-runtime.tsx');
   const detailRuntime = await readSource('components/common/views/view-details-runtime.tsx');
   const headerRuntime = await readSource('components/layout/headers/view/header-runtime.tsx');
   const workspacePage = await readSource('app/[orgId]/views/page.tsx');
   const teamPage = await readSource('app/[orgId]/team/[teamId]/views/page.tsx');
   const detailPage = await readSource('app/[orgId]/view/[viewId]/page.tsx');

   assert.match(provider, /\/api\/views\?organization=/);
   assert.match(provider, /replaceViews\(workspace\.organization\.slug, views, canWrite\)/);
   assert.match(layout, /<SaasSavedViewsProvider>/);
   assert.match(viewsRuntime, /workspace\.configured \? <PersistentViews/);
   assert.match(detailRuntime, /workspace\.configured/);
   assert.match(headerRuntime, /workspace\.configured/);
   assert.match(workspacePage, /<ViewsRuntime \/>/);
   assert.match(teamPage, /<ViewsRuntime teamId=\{teamId\} \/>/);
   assert.match(detailPage, /<ViewDetailsRuntime viewId=\{viewId\} \/>/);
});

test('configured view details filter hydrated tenant stores and fail closed on missing team scope', async () => {
   const runtime = await readSource('lib/views/runtime.ts');
   const detail = await readSource('components/common/views/persistent-view-details.tsx');
   const list = await readSource('components/common/views/persistent-views.tsx');

   assert.match(runtime, /filterIssuesForSavedView/);
   assert.match(runtime, /filterProjectsForSavedView/);
   assert.match(detail, /useIssuesStore/);
   assert.match(detail, /useProjectsStore/);
   assert.match(detail, /issue\.identifier\.startsWith\(`\$\{team\.issuePrefix\}-`\)/);
   assert.match(detail, /project\.teamId === team\.key/);
   assert.match(detail, /missingScopedTeam/);
   assert.match(detail, /Team-scoped view is unavailable/);
   assert.match(list, /team \? result\.filter\(\(view\) => view\.teamId === team\.id\) : \[\]/);
   assert.doesNotMatch(list, /issueViews|projectViews/);
});

test('configured navigation exposes real team Views and removes the inert workspace create control', async () => {
   const sidebar = await readSource('components/layout/sidebar/nav-teams.tsx');
   const tabs = await readSource('components/layout/headers/team/header-tabs.tsx');
   const teamHeader = await readSource('components/layout/headers/team-views/header.tsx');
   const workspaceHeader = await readSource('components/layout/headers/views/header.tsx');

   assert.match(sidebar, /team\.key\}\/views/);
   assert.match(sidebar, /<span>Views<\/span>/);
   assert.match(tabs, /\{ label: 'Views', segment: 'views' \}/);
   assert.match(teamHeader, /resolveTeamReference/);
   assert.match(teamHeader, /persistentTeam\?\.name/);
   assert.match(workspaceHeader, /!workspace\.configured/);
});

test('saved-view migrations enforce tenant identity, RLS, indexes and direct workspace tenancy', async () => {
   const migration = await readSource('supabase/migrations/20260902042336_add_saved_views.sql');
   const organizationFk = await readSource(
      'supabase/migrations/20260902050138_add_saved_views_organization_foreign_key.sql'
   );
   const types = await readSource('lib/supabase/database.types.ts');
   const scope = await readSource('PHASE22_SCOPE.md');

   assert.match(migration, /create table public\.saved_views/);
   assert.match(migration, /foreign key \(team_id, organization_id\)/);
   assert.match(migration, /saved_views_org_team_type_updated_idx/);
   assert.match(migration, /saved_views_team_org_idx/);
   assert.match(migration, /alter table public\.saved_views enable row level security/);
   assert.match(migration, /saved_views_select_members/);
   assert.match(migration, /saved_views_insert_writers/);
   assert.match(migration, /saved_views_update_owner_admin/);
   assert.match(migration, /saved_views_delete_owner_admin/);
   assert.match(migration, /owner_id = \(select auth\.uid\(\)\)/);
   assert.match(organizationFk, /saved_views_organization_id_fkey/);
   assert.match(organizationFk, /references public\.organizations\(id\)/);
   assert.match(types, /saved_views: Table/);
   assert.match(types, /view_type: 'issue' \| 'project'/);
   assert.match(scope, /configured routes never fall back to mock saved views/i);
});
