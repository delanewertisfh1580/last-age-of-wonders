import { describe, expect, it } from 'vitest';
import {
  ageCaptain,
  changeReputation,
  computePension,
  createCaptain,
  resolveVow,
  retire,
  swearVow,
} from '../../src/domain/captain/Captain.js';

describe('TKT-M27: старение и репутация', () => {
  it('старение снижает навыки после 50 и увольняет в 70', () => {
    const captain = createCaptain('c', 'C', 49);
    for (let i = 0; i < 30; i++) ageCaptain(captain, 10);
    expect(captain.age).toBe(52);
    expect(captain.skills.seamanship).toBeLessThan(3);
    for (let i = 0; i < 200; i++) ageCaptain(captain, 10);
    expect(captain.retired).toBe(true);
    expect(ageCaptain(captain).ok).toBe(false);
  });

  it('репутация ограничена', () => {
    const captain = createCaptain('c', 'C');
    expect(changeReputation(captain, 500)).toBe(100);
    expect(changeReputation(captain, -500)).toBe(0);
  });
});

describe('TKT-M27: клятвы и пенсия', () => {
  it('исполненная клятва даёт репутацию, нарушенная отнимает', () => {
    const captain = createCaptain('c', 'C', 40, 50);
    swearVow(captain, { id: 'v', description: 'v', reputationReward: 20, condition: 'protect_crew', fulfilled: false, broken: false });
    expect(resolveVow(captain, 'v', true).ok).toBe(true);
    expect(captain.reputation).toBe(70);
    expect(resolveVow(captain, 'missing', true).ok).toBe(false);
  });

  it('пенсия и выход на пенсию', () => {
    const captain = createCaptain('c', 'C', 60, 50);
    swearVow(captain, { id: 'v', description: 'v', reputationReward: 10, condition: 'pay_debts', fulfilled: false, broken: false });
    resolveVow(captain, 'v', true);
    const pension = computePension(captain, 100);
    expect(pension.amount).toBeGreaterThan(0);
    expect(pension.legacy).toEqual(['legacy:v']);
    expect(retire(captain).years).toBe(40);
  });
});
