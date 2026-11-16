/**
 * TKT-M25: демо M25 — доктрины → приёмы → абордаж → победитель.
 * Запуск: bun scripts/demo-m25.ts
 */
import { createDuel, createDuelist, duelRound, equipBoardingTool, runDuel } from '../src/domain/duel/Duel.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

function duel(seed: string) {
  const left = createDuelist({ id: 'cap', name: 'Captain', doctrine: 'aggressive', poise: 30 });
  const right = createDuelist({ id: 'bosun', name: 'Bosun', doctrine: 'defensive', poise: 26 });
  equipBoardingTool(left, 4);
  const state = createDuel(left, right);
  const result = runDuel(state, new SeededRngService(seed));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const one = duel('duel-seed');
const two = duel('duel-seed');
const roundState = createDuel(
  createDuelist({ id: 'a', name: 'A', doctrine: 'balanced', poise: 10 }),
  createDuelist({ id: 'b', name: 'B', doctrine: 'balanced', poise: 10 }),
);
const round = duelRound(roundState, new SeededRngService('r1'), 'thrust', 'parry');

process.stdout.write(`→ раунд: ${round.ok ? round.value.log.at(-1) : 'err'}\n`);
process.stdout.write(`→ дуэль: раундов=${one.round}, победитель=${one.winner}\n`);
process.stdout.write(`→ журнал: ${one.log.join(' | ')}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(one) === JSON.stringify(two))}\n`);

if (!round.ok || !one.winner || JSON.stringify(one) !== JSON.stringify(two)) {
  process.stderr.write('DEMO M25 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M25 OK — доктрины → контр-приёмы → абордаж → победитель\n');
