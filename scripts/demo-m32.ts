/**
 * TKT-M32: демо M32 — финал → процедурная угроза → перенос.
 * Запуск: bun scripts/demo-m32.ts
 */
import {
  applyCarryover,
  buildCarryover,
  generateMetaThreat,
  threatPressurePerTick,
  type EndingChoice,
  type RunStats,
} from '../src/domain/meta/MetaThreat.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

const ending: EndingChoice = { id: 'truth', tag: 'truth', threatBias: 2 };
const stats: RunStats = { cataclysmsSurvived: 3, companionDeaths: 1, reputation: 55, loreFragments: 6 };

function run(seed: string) {
  const threat = generateMetaThreat(ending, stats, new SeededRngService(seed));
  if (!threat.ok) throw new Error(threat.error.message);
  const carryover = buildCarryover(ending, threat.value, ['meta:charts']);
  return { threat: threat.value, carryover, next: applyCarryover(carryover) };
}

const a = run('meta-seed');
const b = run('meta-seed');
process.stdout.write(`→ угроза: ${a.threat.name}, уровень=${a.threat.level}, traits=${a.threat.traits.join(',')}\n`);
process.stdout.write(`→ модификаторы: ${JSON.stringify(a.threat.modifiers)}, давление=${threatPressurePerTick(a.threat)}\n`);
process.stdout.write(`→ перенос: ${JSON.stringify(a.next)}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (a.threat.level < 4 || a.next.threatLevel !== a.threat.level || a.next.unlocked.length !== 1 || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M32 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M32 OK — финал → процедурная угроза → перенос в следующий забег\n');
