import { describe, expect, it } from 'vitest';
import {
  captureCompanions,
  checkBetrayal,
  createCompanion,
  dieWithLegacy,
  react,
  recruitCompanion,
  restoreCompanions,
  synergy,
  type Companion,
} from '../../src/domain/companion/Companions.js';

describe('TKT-M23: отношения', () => {
  it('события меняют лояльность и доверие в границах', () => {
    const companion = createCompanion('c', 'C', ['sea'], 95, 95);
    react(companion, 'gift');
    expect(companion.loyalty).toBe(100);
    react(companion, 'betrayal');
    expect(companion.loyalty).toBe(60);
    expect(checkBetrayal(companion)).toBe(false);
  });

  it('синергия по общим тегам и дубликаты', () => {
    const roster: Companion[] = [];
    const a = createCompanion('a', 'A', ['sea', 'guns', 'loyal']);
    const b = createCompanion('b', 'B', ['sea', 'guns']);
    expect(recruitCompanion(roster, a).ok).toBe(true);
    expect(recruitCompanion(roster, a).ok).toBe(false);
    expect(synergy(a, b)).toBe(6);
  });
});

describe('TKT-M23: предательство, смерть, restore', () => {
  it('низкая лояльность ведёт к предательству, смерть оставляет наследие', () => {
    const companion = createCompanion('c', 'C', [], 15, 10);
    expect(checkBetrayal(companion)).toBe(true);
    const roster = [companion];
    const snapshot = captureCompanions(roster);
    expect(dieWithLegacy(companion, 'compass').ok).toBe(true);
    expect(companion.alive).toBe(false);
    expect(react(companion, 'gift').ok).toBe(false);
    restoreCompanions(roster, snapshot);
    expect(roster[0].alive).toBe(true);
  });
});
