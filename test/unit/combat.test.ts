import { describe, expect, it } from 'vitest';
import { createCombat, createUnit, damageLayers, runCombat } from '../../src/domain/combat/Combat.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const hero = () => createUnit({ id: 'h', name: 'Hero', attack: 30, defense: 8, hp: 100, maxHp: 100, morale: 90 });
const goblin = () => createUnit({ id: 'g', name: 'Goblin', attack: 5, defense: 2, hp: 20, maxHp: 20, morale: 30 });

describe('TKT-M24: слои урона', () => {
  it('фланг и моральный шок добавляют урон', () => {
    const normal = damageLayers(hero(), goblin(), 0.5, false);
    const flank = damageLayers(hero(), goblin(), 0.5, true);
    expect(flank.flank).toBeGreaterThan(0);
    expect(normal.moraleShock).toBeGreaterThan(0);
    expect(flank.total).toBeGreaterThanOrEqual(normal.total);
  });
});

describe('TKT-M24: бой', () => {
  it('победа, потери и детерминизм', () => {
    const run = () => {
      const combat = createCombat([hero()], [goblin()]);
      if (!combat.ok) throw new Error('combat');
      const result = runCombat(combat.value, new SeededRngService('c'));
      if (!result.ok) throw new Error('run');
      return result.value;
    };
    const a = run();
    expect(a.phase).toBe('resolved');
    expect(a.outcome).toBe('victory');
    expect(a.casualties).toContain('enemy:g');
    expect(JSON.stringify(run())).toBe(JSON.stringify(a));
  });

  it('пустой бой отклоняется', () => {
    expect(createCombat([], [goblin()]).ok).toBe(false);
  });
});
