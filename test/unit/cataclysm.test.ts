import { describe, expect, it } from 'vitest';
import {
  addPressure,
  advanceTo,
  createCataclysm,
  recordConsequence,
  tickCataclysm,
} from '../../src/domain/cataclysm/Lifecycle.js';

describe('TKT-M20: жизненный цикл', () => {
  it('порог давления переводит warning → impact', () => {
    const cataclysm = createCataclysm('c', 'storm', 'n');
    addPressure(cataclysm, 40);
    expect(cataclysm.stage).toBe('warning');
    addPressure(cataclysm, 60);
    expect(cataclysm.stage).toBe('impact');
  });

  it('эскалация в impact, aftermath и разрешение', () => {
    const cataclysm = createCataclysm('c', 'plague', 'n');
    advanceTo(cataclysm, 'impact');
    const first = tickCataclysm(cataclysm);
    const second = tickCataclysm(cataclysm);
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.value.escalated).toBe(true);
    tickCataclysm(cataclysm);
    expect(cataclysm.stage).toBe('aftermath');
    addPressure(cataclysm, 10);
    for (let i = 0; i < 6; i++) tickCataclysm(cataclysm, 10);
    expect(cataclysm.stage).toBe('resolved');
  });

  it('нельзя откатить стадию, последствия не дублируются', () => {
    const cataclysm = createCataclysm('c', 'storm', 'n');
    advanceTo(cataclysm, 'impact');
    expect(advanceTo(cataclysm, 'warning').ok).toBe(false);
    expect(recordConsequence(cataclysm, 'x')).toBe(true);
    expect(recordConsequence(cataclysm, 'x')).toBe(false);
    expect(addPressure(cataclysm, Number.NaN).ok).toBe(false);
  });
});
