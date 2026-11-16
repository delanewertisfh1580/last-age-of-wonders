import { describe, expect, it } from 'vitest';
import {
  advancePhase,
  calculateDamage,
  createCombatant,
  createEncounter,
  resolveRound,
  runNavalEncounter,
} from '../../src/domain/naval/NavalCombat.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const attacker = () => createCombatant({ id: 'a', hp: 100, armor: 5, power: 30, morale: 80 });
const defender = () => createCombatant({ id: 'd', hp: 80, armor: 3, power: 15, morale: 50 });

describe('TKT-M16-002: EncounterStateMachine', () => {
  it('фазы идут по порядку, из resolved выход запрещён', () => {
    const encounter = createEncounter('e', attacker(), defender());
    expect(advancePhase(encounter).ok).toBe(true);
    expect(encounter.phase).toBe('broadside');
    encounter.phase = 'resolved';
    expect(advancePhase(encounter).ok).toBe(false);
  });
});

describe('TKT-M16-003/004: урон и раунды', () => {
  it('броня поглощает часть урона, крит добавляет', () => {
    const result = calculateDamage(attacker(), defender(), new SeededRngService('damage'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBeGreaterThan(0);
    expect(result.value.absorbed).toBeLessThanOrEqual(3);
  });

  it('раунд уменьшает hp и завершает бой', () => {
    const encounter = createEncounter('e', attacker(), { ...defender(), hp: 1 });
    const round = resolveRound(encounter, new SeededRngService('r'));
    expect(round.ok).toBe(true);
    expect(encounter.phase).toBe('resolved');
    expect(encounter.outcome).toBe('victory');
  });
});

describe('TKT-M16-005: движок и детерминизм', () => {
  it('одинаковый seed → одинаковый исход', () => {
    const run = () => {
      const encounter = createEncounter('e', attacker(), defender());
      return runNavalEncounter(encounter, new SeededRngService('naval'), 20);
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
