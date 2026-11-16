import { describe, expect, it } from 'vitest';
import { createBattlefield, runBattlefield, sidePower } from '../../src/domain/battlefield/Battlefield.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const squads = () => [
  { id: 'p', side: 'party' as const, zone: 'center' as const, strength: 50, morale: 80, elite: true },
  { id: 'e', side: 'enemy' as const, zone: 'center' as const, strength: 40, morale: 60, elite: false },
];

describe('TKT-M26: поле боя', () => {
  it('элита и дуэль повышают силу стороны', () => {
    const created = createBattlefield(squads(), { winner: 'party', bonus: 20 });
    if (!created.ok) throw new Error('create');
    const normal = sidePower(created.value, 'party');
    const noElite = createBattlefield(
      squads().map((squad) => ({ ...squad, elite: false })),
      { winner: 'party', bonus: 20 },
    );
    if (!noElite.ok) throw new Error('create');
    expect(sidePower(noElite.value, 'party')).toBeLessThan(normal);
  });

  it('бой завершается победителем детерминированно', () => {
    const run = () => {
      const created = createBattlefield(squads(), { winner: 'party', bonus: 15 });
      if (!created.ok) throw new Error('create');
      const result = runBattlefield(created.value, new SeededRngService('b'));
      if (!result.ok) throw new Error('run');
      return result.value;
    };
    const a = run();
    expect(a.winner).toBeDefined();
    expect(JSON.stringify(run())).toBe(JSON.stringify(a));
  });

  it('пустое поле отклоняется', () => {
    expect(createBattlefield([squads()[0]], { winner: 'draw', bonus: 0 }).ok).toBe(false);
  });
});
