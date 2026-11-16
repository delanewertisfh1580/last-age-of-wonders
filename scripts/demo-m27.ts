/**
 * TKT-M27: демо M27 — старение → репутация → клятвы → пенсия.
 * Запуск: bun scripts/demo-m27.ts
 */
import {
  ageCaptain,
  changeReputation,
  computePension,
  createCaptain,
  resolveVow,
  retire,
  swearVow,
} from '../src/domain/captain/Captain.js';

function life() {
  const captain = createCaptain('cap', 'Elena Voss', 68, 40);
  swearVow(captain, { id: 'crew', description: 'Protect the crew', reputationReward: 10, condition: 'protect_crew', fulfilled: false, broken: false });
  swearVow(captain, { id: 'debts', description: 'Pay all debts', reputationReward: 8, condition: 'pay_debts', fulfilled: false, broken: false });
  resolveVow(captain, 'crew', true);
  resolveVow(captain, 'debts', false);
  changeReputation(captain, 5);
  for (let i = 0; i < 20; i++) ageCaptain(captain, 10);
  const pension = computePension(captain, 50);
  retire(captain);
  return { captain, pension };
}

const a = life();
const b = life();
process.stdout.write(`→ возраст: ${a.captain.age}, retired=${a.captain.retired}\n`);
process.stdout.write(`→ репутация: ${a.captain.reputation}, навыки=${JSON.stringify(a.captain.skills)}\n`);
process.stdout.write(`→ пенсия: ${a.pension.amount}, legacy=${a.pension.legacy.join(',')}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (!a.captain.retired || a.captain.age !== 70 || a.captain.vows[0].fulfilled !== true || a.captain.vows[1].broken !== true || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M27 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M27 OK — старение → репутация → клятвы → пенсия\n');
