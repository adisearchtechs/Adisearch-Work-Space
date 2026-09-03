import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const readSource = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

test('R8 mutation origin validation remains strict while supporting trusted proxy routing', async () => {
   const source = await readSource('lib/api/security.ts');

   assert.match(source, /new URL\(origin\)/);
   assert.match(source, /originUrl\.origin === request\.nextUrl\.origin/);
   assert.match(source, /x-forwarded-host/);
   assert.match(source, /x-forwarded-proto/);
   assert.match(source, /originUrl\.host\.toLowerCase\(\) === requestHost\.toLowerCase\(\)/);
   assert.match(
      source,
      /originUrl\.protocol\.toLowerCase\(\) === `\$\{requestProtocol\.toLowerCase\(\)\}:`/
   );
   assert.match(source, /catch \{\s*return false;\s*\}/);
});
