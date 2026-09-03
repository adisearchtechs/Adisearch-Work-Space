import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('tenant teams hydrate through one shared runtime provider', async () => {
   const store = await readSource('store/teams-store.ts');
   const provider = await readSource('components/providers/saas-teams-provider.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');
   const api = await readSource('app/api/teams/route.ts');

   assert.match(store, /resolveTeamReference/);
   assert.match(store, /joinedTeamIds/);
   assert.match(provider, /\/api\/teams\?organization=/);
   assert.match(provider, /usePathname\(\)/);
   assert.match(provider, /beginLoad\(workspace\.organization\.slug\)/);
   assert.match(layout, /<SaasTeamsProvider>/);
   assert.match(api, /\.select\('team_id, user_id'\)/);
   assert.match(api, /joinedTeamIds/);
});

test('configured sidebar and headers use persisted teams without mock runtime shortcuts', async () => {
   const nav = await readSource('components/layout/sidebar/nav-teams.tsx');
   const teamHeader = await readSource('components/layout/headers/team/header-nav.tsx');
   const teamTabs = await readSource('components/layout/headers/team/header-tabs.tsx');
   const cycleHeader = await readSource('components/layout/headers/cycles/header-nav.tsx');

   assert.match(nav, /useTeamsStore/);
   assert.match(nav, /joinedSet\.has\(team\.id\)/);
   assert.match(nav, /team\.key\}\/overview/);
   assert.match(nav, /settings\/teams\/\$\{team\.id\}/);
   assert.doesNotMatch(nav, /Open archive/);
   assert.doesNotMatch(nav, /Subscribe/);
   assert.match(teamHeader, /resolveTeamReference/);
   assert.match(teamTabs, /PERSISTENT_TEAM_TABS/);
   assert.match(teamTabs, /\{ label: 'Issues', segment: 'all' \}/);
   assert.match(cycleHeader, /useTeamsStore/);
   assert.doesNotMatch(cycleHeader, /\/api\/teams\/.*\/cycles\?organization=/);
});

test('configured team overview uses real tenant metadata without mock resource leakage', async () => {
   const overview = await readSource('components/common/teams/team-overview.tsx');

   assert.match(overview, /resolveTeamReference\(teams, teamId\)/);
   assert.match(
      overview,
      /const query = `\?organization=\$\{encodeURIComponent\(workspace\.organization\.slug\)\}`/
   );
   assert.match(
      overview,
      /fetch\(`\/api\/teams\/\$\{encodeURIComponent\(resolvedTeam\.id\)\}\$\{query\}`/
   );
   assert.match(
      overview,
      /fetch\([\s\S]*`\/api\/teams\/\$\{encodeURIComponent\(resolvedTeam\.id\)\}\/dashboard\$\{query\}`/
   );
   assert.match(overview, /dashboard\.work\.active/);
   assert.match(overview, /dashboard\.projects\.length/);
   assert.match(overview, /team\.members\.slice\(0, 8\)/);
   assert.match(overview, /settings\/teams\/\$\{resolvedTeam\.id\}/);
   assert.doesNotMatch(overview, /documentFolders/);
   assert.match(overview, /if \(!workspace\.configured\)/);
   assert.match(overview, /Demo team overview/);
});

test('configured team issue and project routes resolve and scope the persisted team', async () => {
   const allIssues = await readSource('components/common/issues/all-issues.tsx');
   const searchIssues = await readSource('components/common/issues/search-issues.tsx');
   const teamProjects = await readSource('components/common/teams/team-projects.tsx');
   const projectsHeader = await readSource('components/layout/headers/team-projects/header.tsx');

   assert.match(allIssues, /resolveTeamReference\(tenantTeams, routeTeamReference\)/);
   assert.match(allIssues, /const prefix = `\$\{resolvedTeam\.issuePrefix\}-`/);
   assert.match(allIssues, /issue\.identifier\.startsWith\(prefix\)/);
   assert.match(allIssues, /<SearchIssues issues=\{scopedIssues\} \/>/);
   assert.match(searchIssues, /const results = issues[\s\S]*\? issues\.filter/);
   assert.match(teamProjects, /resolveTeamReference\(teams, teamId\)/);
   assert.match(teamProjects, /<Projects teamId=\{team\.key\} \/>/);
   assert.match(projectsHeader, /resolveTeamReference/);
});

test('Phase 19 adds no schema migration and documents fail-closed runtime rules', async () => {
   const scope = await readSource('PHASE19_SCOPE.md');
   assert.match(scope, /No new Phase 19 database migration is required/);
   assert.match(scope, /never falls back to mock Core/);
   assert.match(scope, /Team issue views fail closed/);
   assert.match(scope, /per-organization unique `issue_prefix`/);
});
