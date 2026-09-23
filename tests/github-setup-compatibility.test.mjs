import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

test('legacy GitHub installation returns are handed to the verified setup route', async () => {
   const source = await readFile(path.join(root, 'app/setup/page.tsx'), 'utf8');

   assert.match(source, /params\.installation_id/);
   assert.match(source, /params\.state/);
   assert.match(source, /params\.setup_action/);
   assert.match(source, /redirect\(`\/api\/integrations\/github\/setup\?/);
   assert.doesNotMatch(source, /Object\.entries\(params\)/);
});
