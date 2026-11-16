import { describe, expect, it } from 'vitest';
import {
  adjustRelation,
  captureWorld,
  contestMark,
  createWorld,
  isAtWar,
  makePeace,
  relation,
  restoreWorld,
  tickWorld,
} from '../../src/domain/world/World.js';

const world = () => createWorld([
  { id: 'a', name: 'A', faction: 'f1', population: 1000, wealth: 100, defense: 10, tradeRoutes: [] },
  { id: 'b', name: 'B', faction: 'f2', population: 500, wealth: 50, defense: 30, tradeRoutes: [] },
]);

describe('TKT-M18: отношения и войны', () => {
  it('отношения меняются двусторонне и ограничены', () => {
    const w = world();
    expect(adjustRelation(w, 'a', 'b', 150).ok).toBe(true);
    expect(relation(w, 'a', 'b')).toBe(100);
    expect(relation(w, 'b', 'a')).toBe(90);
    const unknown = adjustRelation(w, 'a', 'x', 1);
    expect(unknown.ok).toBe(false);
  });

  it('война объявляется и завершается миром', () => {
    const w = world();
    adjustRelation(w, 'a', 'b', -100);
    expect(isAtWar(w, 'a', 'b')).toBe(true);
    makePeace(w, 'a', 'b');
    expect(isAtWar(w, 'a', 'b')).toBe(false);
  });
});

describe('TKT-M18: тик и восстановление', () => {
  it('население растёт, бой определяет победителя', () => {
    const w = world();
    adjustRelation(w, 'a', 'b', -100);
    const report = tickWorld(w);
    expect(report.growth.a).toBeGreaterThan(0);
    expect(report.battles[0].winner).toBe('b');
  });

  it('capture/restore сохраняет мир', () => {
    const w = world();
    adjustRelation(w, 'a', 'b', 15);
    contestMark(w, 'm', 'f1', 60);
    const snapshot = captureWorld(w);
    tickWorld(w);
    restoreWorld(w, snapshot);
    expect(captureWorld(w)).toEqual(snapshot);
  });
});
