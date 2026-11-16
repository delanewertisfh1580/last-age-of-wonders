/**
 * TKT-M24: демо M24 — подход → бой → слои урона → потери → развязка.
 * Запуск: bun scripts/demo-m24.ts
 */
import { createCombat, createUnit, damageLayers, runCombat } from '../src/domain/combat/Combat.js';
import { SeededRngService } from '../src/infrastructure/rng/SeededRngService.js';

function fight(seed: string) {
  const combat = createCombat(
    [
      createUnit({ id: 'cap', name: 'Captain', attack: 22, defense: 10, hp: 90, maxHp: 90, morale: 80 }),
      createUnit({ id: 'gun', name: 'Gunner', attack: 18, defense: 6, hp: 60, maxHp: 60, morale: 70 }),
      createUnit({ id: 'doc', name: 'Surgeon', attack: 8, defense: 5, hp: 50, maxHp: 50, morale: 60 }),
    ],
    [
      createUnit({ id: 'pirate', name: 'Pirate', attack: 16, defense: 5, hp: 70, maxHp: 70, morale: 50 }),
      createUnit({ id: 'brute', name: 'Brute', attack: 20, defense: 8, hp: 90, maxHp: 90, morale: 40 }),
    ],
  );
  if (!combat.ok) throw new Error(combat.error.message);
  const result = runCombat(combat.value, new SeededRngService(seed));
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

const layers = damageLayers(
  createUnit({ id: 'a', name: 'A', attack: 20, defense: 0, hp: 10, maxHp: 10, morale: 100 }),
  createUnit({ id: 'd', name: 'D', attack: 0, defense: 4, hp: 10, maxHp: 10, morale: 20 }),
  0.5,
  true,
);
const a = fight('combat-seed');
const b = fight('combat-seed');

process.stdout.write(`→ слои: base=${layers.base}, flank=${layers.flank}, morale=${layers.moraleShock}, absorbed=${layers.absorbed}, total=${layers.total}\n`);
process.stdout.write(`→ бой: раундов=${a.round}, исход=${a.outcome}, потерь=${a.casualties.length}\n`);
process.stdout.write(`→ потери: ${a.casualties.join(', ')}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (!a.outcome || a.phase !== 'resolved' || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M24 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M24 OK — фазы → слои урона → потери → развязка\n');
