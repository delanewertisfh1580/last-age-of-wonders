import { describe, expect, it } from 'vitest';
import {
  applyCarryover,
  buildCarryover,
  generateMetaThreat,
  threatPressurePerTick,
  type EndingChoice,
  type RunStats,
} from '../../src/domain/meta/MetaThreat.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const ending: EndingChoice = { id: 'e', tag: 'mystery', threatBias: 1 };
const stats: RunStats = { cataclysmsSurvived: 2, companionDeaths: 0, reputation: 40, loreFragments: 3 };

describe('TKT-M32: мета-угроза', () => {
  it('детерминирована и учитывает статистику', () => {
    const a = generateMetaThreat(ending, stats, new SeededRngService('m'));
    const b = generateMetaThreat(ending, stats, new SeededRngService('m'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.value.level).toBeGreaterThanOrEqual(2);
    expect(a.value.traits.length).toBeGreaterThan(0);
    expect(threatPressurePerTick(a.value)).toBeGreaterThan(0);
  });

  it('невалидная статистика отклоняется, перенос сохраняет данные', () => {
    const invalid = generateMetaThreat(ending, { ...stats, reputation: -5 }, new SeededRngService('m'));
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.error.code).toBe('META_INVALID_RUN');
    const threat = generateMetaThreat(ending, stats, new SeededRngService('m'));
    if (!threat.ok) return;
    const carryover = buildCarryover(ending, threat.value, ['u']);
    expect(applyCarryover(carryover)).toEqual({ threatLevel: threat.value.level, unlocked: ['u'] });
  });
});
