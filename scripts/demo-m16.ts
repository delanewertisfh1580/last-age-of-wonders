/**
 * TKT-M16-007: демо M16 — encounter FSM → раунды → исход.
 * Запуск: bun scripts/demo-m16.ts
 */
import { createCombatant, createEncounter, runNavalEncounter } from '../src/domain/naval/NavalCombat.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

function fight(seed: string) {
  const encounter = createEncounter(
    'enc-1',
    createCombatant({ id: 'player', hp: 160, armor: 6, power: 42, morale: 80 }),
    createCombatant({ id: 'corsair', hp: 120, armor: 4, power: 30, morale: 60 }),
  );
  const result = runNavalEncounter(encounter, new SeededRngService(seed), 12);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const a = fight('naval-seed');
const b = fight('naval-seed');
process.stdout.write(`→ фаз: ${a.encounter.phase}, раундов: ${a.rounds}, исход: ${a.encounter.outcome}\n`);
process.stdout.write(`→ hp: player=${a.encounter.attacker.hp}, corsair=${a.encounter.defender.hp}\n`);
process.stdout.write(`→ журнал: ${a.encounter.log.length} записей, детерминизм=${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (a.encounter.phase !== 'resolved' || !a.encounter.outcome || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M16 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M16 OK — FSM → слои урона → исход → детерминизм\n');
