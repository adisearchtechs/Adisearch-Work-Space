import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R2 hydrates configured workspace members from the tenant API', async () => {
   const contract = await readSource('lib/workspace-members/contracts.ts');
   const route = await readSource('app/api/members/route.ts');
   const provider = await readSource('components/providers/saas-members-provider.tsx');
   const layout = await readSource('app/[orgId]/layout.tsx');

   assert.match(contract, /teamIds: string\[\]/);
   assert.match(route, /\.select\('user_id, team_id'\)/);
   assert.match(route, /teamIdsByUser/);
   assert.match(route, /teamIds,/);
   assert.match(route, /teamCount: teamIds\.length/);
   assert.match(provider, /\/api\/members\?organization=/);
   assert.match(provider, /replaceMembers/);
   assert.match(layout, /<SaasMembersProvider>/);
});

test('R2 configured members list uses persistent records without fabricated presence or email', async () => {
   const page = await readSource('app/[orgId]/members/page.tsx');
   const runtime = await readSource('components/common/members/members-runtime.tsx');
   const persistent = await readSource('components/common/members/persistent-members.tsx');
   const line = await readSource('components/common/members/persistent-member-line.tsx');
   const nav = await readSource('components/layout/headers/members/header-nav.tsx');
   const options = await readSource('components/layout/headers/members/header-options.tsx');
   const filter = await readSource('components/layout/headers/members/filter.tsx');

   assert.match(page, /<MembersRuntime \/>/);
   assert.match(runtime, /workspace\.configured \? <PersistentMembers \/> : <Members \/>/);
   assert.doesNotMatch(persistent, /mock-data/);
   assert.doesNotMatch(line, /mock-data/);
   assert.match(line, /member\.createdIssueCount/);
   assert.match(line, /member\.teamCount/);
   assert.doesNotMatch(line, /Online|user\.email|Last seen/);
   assert.match(nav, /workspace\.configured \? persistentCount : users\.length/);
   assert.match(nav, /!workspace\.configured/);
   assert.match(options, /!workspace\.configured/);
   assert.match(filter, /PERSISTENT_ROLES/);
   assert.match(filter, /'Owner', 'Admin', 'Member', 'Guest'/);
});

test('R2 configured member profiles use real ownership, teams, and issue-derived breakdowns', async () => {
   const page = await readSource('app/[orgId]/profiles/[memberId]/page.tsx');
   const runtime = await readSource('components/common/members/member-profile-runtime.tsx');
   const profile = await readSource('components/common/members/persistent-member-profile.tsx');
   const header = await readSource('components/layout/headers/profile/header.tsx');
   const issueTypes = await readSource('lib/issues/types.ts');

   assert.match(page, /MemberProfileRuntime/);
   assert.match(runtime, /workspace\.configured/);
   assert.match(runtime, /<PersistentMemberProfile member=\{member\} \/>/);
   assert.match(runtime, /<MemberProfile member=\{member\} \/>/);
   assert.doesNotMatch(profile, /mock-data\/users|mock-data\/projects|mock-data\/teams|mock-data\/labels/);
   assert.match(profile, /issue\.creatorId === member\.id/);
   assert.match(profile, /issue\.assignee\?\.id === member\.id/);
   assert.match(profile, /member\.teamIds\.includes\(team\.id\)/);
   assert.match(profile, /displayedIssues\.flatMap\(\(issue\) => issue\.labels\)/);
   assert.doesNotMatch(profile, /presenceLabel|Local time|member\.email/);
   assert.match(header, /issue\.creatorId === persistentMember\.id/);
   assert.match(header, /!workspace\.configured/);
   assert.match(issueTypes, /creatorId\?: string/);
});

test('R2 configured issue errors never route users into the demo CORE team', async () => {
   const details = await readSource('components/common/issues/details/issue-details.tsx');

   assert.match(details, /workspace\.configured/);
   assert.match(details, /my-issues/);
   assert.match(details, /team\/CORE\/all/);
   assert.match(details, /const backHref = workspace\.configured/);
});
