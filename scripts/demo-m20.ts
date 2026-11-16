/**
 * TKT-M20: демо M20 — давление → warning → impact → escalation → aftermath → resolved.
 * Запуск: bun scripts/demo-m20.ts
 */
import {
  addPressure,
  createCataclysm,
  recordConsequence,
  tickCataclysm,
} from '../src/domain/cataclysm/Lifecycle.js';

function run() {
  const cataclysm = createCataclysm('c1', 'storm', 'aurum');
  const stages: string[] = [cataclysm.stage];
  addPressure(cataclysm, 50);
  stages.push(cataclysm.stage);
  addPressure(cataclysm, 60);
  stages.push(cataclysm.stage);
  const escalations: boolean[] = [];
  for (let i = 0; i < 3; i++) {
    const tick = tickCataclysm(cataclysm);
    if (!tick.ok) throw new Error(tick.error.message);
    escalations.push(tick.value.escalated);
    stages.push(cataclysm.stage);
  }
  recordConsequence(cataclysm, 'harbor-damaged');
  for (let i = 0; i < 6; i++) tickCataclysm(cataclysm, 10);
  stages.push(cataclysm.stage);
  return { cataclysm, stages, escalations };
}

const a = run();
const b = run();

process.stdout.write(`→ стадии: ${a.stages.join(' → ')}\n`);
process.stdout.write(`→ эскалации: ${a.escalations.map(String).join(',')}, severity=${a.cataclysm.severity}\n`);
process.stdout.write(`→ события: ${a.cataclysm.events.length}, детерминизм=${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (a.stages[0] !== 'dormant' || a.stages[1] !== 'warning' || a.stages[2] !== 'impact' || a.cataclysm.stage !== 'resolved' || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M20 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M20 OK — давление → warning → impact → escalation → aftermath → resolved\n');
