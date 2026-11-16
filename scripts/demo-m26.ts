/**
 * TKT-M26: демо M26 — поле → элита → влияние дуэли → развязка.
 * Запуск: bun scripts/demo-m26.ts
 */
import { applyDuelResult, createBattlefield, runBattlefield, sidePower } from '../src/domain/battlefield/Battlefield.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

function battle(seed: string, duelWinner: 'party' | 'enemy') {
  const created = createBattlefield(
    [
      { id: 'p1', side: 'party', zone: 'left', strength: 60, morale: 80, elite: true },
      { id: 'p2', side: 'party', zone: 'center', strength: 50, morale: 70, elite: false },
      { id: 'e1', side: 'enemy', zone: 'right', strength: 55, morale: 65, elite: false },
      { id: 'e2', side: 'enemy', zone: 'center', strength: 45, morale: 60, elite: false },
    ],
    { winner: duelWinner, bonus: 20 },
  );
  if (!created.ok) throw new Error(created.error.message);
  const state = created.value;
  const result = runBattlefield(state, new SeededRngService(seed));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const withDuel = battle('battle-seed', 'party');
const withoutDuel = battle('battle-seed', 'enemy');
const swapped = applyDuelResult(withDuel, 'party', 20);

process.stdout.write(`→ сила party/enemy: ${sidePower(withDuel, 'party')}/${sidePower(withDuel, 'enemy')}\n`);
process.stdout.write(`→ с дуэлью: winner=${withDuel.winner}, раундов=${withDuel.round}\n`);
process.stdout.write(`→ против дуэли: winner=${withoutDuel.winner}\n`);
process.stdout.write(`→ применение дуэли: ${swapped.duel.winner}/${swapped.duel.bonus}\n`);

if (!withDuel.winner || !withoutDuel.winner || swapped.duel.bonus !== 20) {
  process.stderr.write('DEMO M26 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M26 OK — поле → элита → влияние дуэли → развязка\n');
