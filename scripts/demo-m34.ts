/**
 * TKT-M34-009/010: демо M34 — полный забег из 10 шагов, 6 чекпоинтов,
 * отчёт, бюджет и golden run. Запуск: bun scripts/demo-m34.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SliceRunner, runSlice } from '../src/app/slice/SliceRunner.js';
import { SLICE_SEAMS, validateSeamTopics } from '../src/app/slice/Seams.js';

const seed = 'golden-slice';
const desktop = runSlice({ seed, mode: 'desktop' });
if (!desktop.ok) throw new Error(`${desktop.error.code}: ${desktop.error.message}`);

const mobile = runSlice({ seed, mode: 'mobile', maxTickMs: 25, maxSaveBytes: 2 * 1024 * 1024 });
if (!mobile.ok) throw new Error(`${mobile.error.code}: ${mobile.error.message}`);

const golden = runSlice({ seed, mode: 'desktop' });
if (!golden.ok) throw new Error('golden run failed');
const goldenIdentical = JSON.stringify(desktop.value.hashes) === JSON.stringify(golden.value.hashes)
  && JSON.stringify(desktop.value.events) === JSON.stringify(golden.value.events);

// Проверка продолжения с cp-3.
const runner = new SliceRunner({ seed, mode: 'desktop' });
while (runner.currentStepIndex() < 5) runner.runNext();
const cp3 = runner.registry.get('cp-3');
if (!cp3) throw new Error('cp-3 missing');
runner.runAll();
const continuousHash = runner.currentHash();
const resumed = new SliceRunner({ seed, mode: 'desktop' });
resumed.registry.save('cp-3', cp3.stepIndex, cp3.state, cp3.rng);
resumed.restoreCheckpoint('cp-3');
resumed.runAll();
const checkpointHash = resumed.currentHash();

const coreEvents = (JSON.parse(readFileSync('content/events/core.json', 'utf8')) as { type: string }[]).map((event) => event.type);
const seamErrors = validateSeamTopics(desktop.value.events, coreEvents);

process.stdout.write('→ шаги и хеши:\n');
for (const [index, step] of desktop.value.steps.entries()) {
  process.stdout.write(`  ${index + 1}. ${step.id} [${step.scope}] ${step.hash.slice(0, 12)} (${step.durationMs.toFixed(2)}мс)\n`);
}
process.stdout.write(`→ чекпоинты: ${runner.registry.list().join(', ')} (${runner.registry.list().length})\n`);
process.stdout.write(`→ cp-3 continue: ${String(continuousHash === checkpointHash)}\n`);
process.stdout.write(`→ бюджет mobile: max_tick_ms=${mobile.value.metrics.maxTickMs}, save_bytes=${mobile.value.metrics.saveBytes}\n`);
process.stdout.write(`→ швы: ${SLICE_SEAMS.length}, нарушений=${seamErrors.length}\n`);
process.stdout.write(`→ golden run: ${goldenIdentical}, passed=${desktop.value.passed && mobile.value.passed}\n`);

const artifact = {
  seed,
  passed: desktop.value.passed && mobile.value.passed,
  goldenIdentical,
  checkpointContinuation: continuousHash === checkpointHash,
  metrics: desktop.value.metrics,
  mobileMetrics: mobile.value.metrics,
  steps: desktop.value.steps,
  hashes: desktop.value.hashes,
  events: desktop.value.events,
  errors: desktop.value.errors,
};
mkdirSync('artifacts/slice', { recursive: true });
writeFileSync(`artifacts/slice/run-${seed}.json`, `${JSON.stringify(artifact, null, 2)}\n`);

if (!desktop.value.passed || !mobile.value.passed || !goldenIdentical || continuousHash !== checkpointHash || seamErrors.length > 0) {
  process.stderr.write('DEMO M34 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M34 OK — полный забег → 6 чекпоинтов → отчёт → бюджет → golden run\n');
