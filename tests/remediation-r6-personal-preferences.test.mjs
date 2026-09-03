import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R6C theme preference contract is strict and bounded', async () => {
   const contract = await readSource('lib/preferences/contracts.ts');

   assert.match(contract, /mode: z\.enum\(\['system', 'light', 'dark', 'custom'\]\)/);
   assert.match(contract, /lightVariant: z\.enum\(\['light', 'pure-light'\]\)/);
   assert.match(contract, /darkVariant: z\.enum\(\['dark', 'magic-blue', 'classic-dark'\]\)/);
   assert.match(contract, /contrast: z\.number\(\)\.int\(\)\.min\(0\)\.max\(100\)/);
   assert.match(contract, /\.strict\(\)/);
});

test('R6C user preference table is self-only, RLS protected, and has no authenticated delete path', async () => {
   const migration = await readSource(
      'supabase/migrations/20260903163818_add_user_theme_preferences.sql'
   );

   assert.match(migration, /create table public\.user_preferences/);
   assert.match(migration, /references public\.profiles\(id\) on delete cascade/);
   assert.match(migration, /alter table public\.user_preferences enable row level security/);
   assert.match(migration, /grant select, insert, update on table public\.user_preferences to authenticated/);
   assert.doesNotMatch(migration, /grant[^;]*delete[^;]*authenticated/i);
   assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/);
   assert.match(migration, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
});

test('R6C preference API authenticates self, validates writes, protects origin, and never trusts a client user id', async () => {
   const route = await readSource('app/api/preferences/route.ts');

   assert.match(route, /supabase\.auth\.getClaims\(\)/);
   assert.match(route, /hasValidMutationOrigin\(request\)/);
   assert.match(route, /readJsonBody\(request\)/);
   assert.match(route, /themePreferencesSchema\.safeParse\(input\)/);
   assert.match(route, /\.from\('user_preferences'\)/);
   assert.match(route, /user_id: userId/);
   assert.match(route, /\.eq\('user_id', userId\)/);
   assert.match(route, /onConflict: 'user_id'/);
   assert.doesNotMatch(route, /input\.userId/);
   assert.doesNotMatch(route, /service[_-]?role/i);
});

test('R6C preferences hydrate from the account, preserve local fallback, and autosave real theme changes', async () => {
   const component = await readSource('components/common/settings/persistent-preferences.tsx');
   const theme = await readSource('components/common/settings/theme-preferences.tsx');
   const route = await readSource('app/[orgId]/settings/[section]/page.tsx');

   assert.match(component, /fetch\('\/api\/preferences', \{ cache: 'no-store' \}\)/);
   assert.match(component, /method: 'PUT'/);
   assert.match(component, /themePreferencesSchema\.safeParse/);
   assert.match(component, /useThemeStore\.setState\(parsed\.data\)/);
   assert.match(component, /Account sync is unavailable/);
   assert.match(component, /window\.setTimeout/);
   assert.match(component, /<ThemePreferences \/>/);
   assert.match(route, /'preferences': PersistentPreferences/);
   assert.doesNotMatch(route, /'preferences': PreferencesNotice/);

   assert.match(theme, /setMode/);
   assert.match(theme, /setLightVariant/);
   assert.match(theme, /setDarkVariant/);
   assert.match(theme, /setCustom/);
});

test('R6C server client extends the released database type chain with user preferences', async () => {
   const database = await readSource('lib/supabase/database-with-preferences.ts');
   const server = await readSource('lib/supabase/server.ts');

   assert.match(database, /DatabaseWithIntegrations/);
   assert.match(database, /user_preferences: UserPreferencesTable/);
   assert.match(server, /DatabaseWithPreferences/);
});
