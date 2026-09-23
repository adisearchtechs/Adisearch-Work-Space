import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');

test('Phase 47 defines production monitoring, incident, rollback, and recovery evidence', async () => {
   const runbook = await read('PRODUCTION_OPERATIONS_RUNBOOK.md');

   assert.match(runbook, /Monitoring baseline/);
   assert.match(runbook, /SEV-1/);
   assert.match(runbook, /Application rollback/);
   assert.match(runbook, /Database recovery/);
   assert.match(runbook, /Recovery drill/);
   assert.match(runbook, /Release evidence record/);
   assert.match(runbook, /Do not force-push/);
   assert.doesNotMatch(runbook, /service[_-]?role\s*[=:]/i);
});

test('Phase 47 release controls route failed releases through the operations runbook', async () => {
   const checklist = await read('R9_RELEASE_CHECKLIST.md');
   const status = await read('R9_STATUS.md');

   assert.match(checklist, /PRODUCTION_OPERATIONS_RUNBOOK\.md/);
   assert.match(checklist, /database recovery as a separate, explicitly approved procedure/i);
   assert.match(status, /Production Launch Completion/);
   assert.match(status, /7448bcc80c47eac5ad9d5807c382d309f67924fe/);
   assert.doesNotMatch(status, /Vercel has not yet shown a production deployment/);
});
