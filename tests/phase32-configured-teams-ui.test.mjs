import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('configured Teams page renders persistent workspace teams instead of demo rows', async () => {
   const teams = await readSource('components/common/teams/teams.tsx');
   const persistentLine = await readSource('components/common/teams/persistent-team-line.tsx');

   assert.match(teams, /useWorkspace\(\)/);
   assert.match(teams, /useTeamsStore/);
   assert.match(teams, /workspace\.configured/);
   assert.match(teams, /<PersistentTeamLine/);
   assert.match(teams, /displayedDemoTeams\.map/);
   assert.doesNotMatch(persistentLine, /mock-data/);
   assert.match(persistentLine, /team\.usage\.members/);
   assert.match(persistentLine, /team\.usage\.projects/);
   assert.match(persistentLine, /team\.key/);
});

test('Teams header uses the persistent team count and a real create-team route', async () => {
   const header = await readSource('components/layout/headers/teams/header-nav.tsx');

   assert.match(header, /useTeamsStore/);
   assert.match(header, /workspace\.configured/);
   assert.match(header, /teams\.length/);
   assert.match(header, /settings\/teams\/new/);
   assert.match(header, /workspace\.user\.role === 'owner'/);
});

test('configured sidebar keeps real team navigation reachable on mobile', async () => {
   const navTeams = await readSource('components/layout/sidebar/nav-teams.tsx');
   const sidebar = await readSource('components/layout/sidebar/app-sidebar.tsx');

   assert.match(navTeams, /if \(workspace\.configured\)/);
   assert.match(navTeams, /useTeamsStore/);
   assert.match(navTeams, /runtimeTeams\.map/);
   assert.match(navTeams, /team\.key/);
   assert.match(sidebar, /SidebarContent className="overscroll-contain"/);
   assert.match(sidebar, /hidden w-full flex-col[\s\S]*md:flex/);
});
