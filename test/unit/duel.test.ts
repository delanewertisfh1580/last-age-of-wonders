import { describe, expect, it } from 'vitest';
import { createDuel, createDuelist, duelRound, equipBoardingTool, runDuel } from '../../src/domain/duel/Duel.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';

const duelist = (id: string, doctrine: 'aggressive' | 'defensive' | 'balanced', poise = 12) =>
  createDuelist({ id, name: id, doctrine, poise });

describe('TKT-M25: дуэль', () => {
  it('контр-приём снижает урон и тратит стойкость', () => {
    const state = createDuel(duelist('a', 'balanced', 20), duelist('b', 'balanced', 20));
    const result = duelRound(state, new SeededRngService('d'), 'thrust', 'parry');
    expect(result.ok).toBe(true);
    expect(state.right.poise).toBeLessThan(20);
    expect(state.left.stamina).toBeLessThan(100);
    expect(state.log[0]).toContain('thrust/parry');
  });

  it('нулевая стойкость завершает дуэль, абордажный инструмент усиливает', () => {
    const state = createDuel(duelist('a', 'aggressive', 12), duelist('b', 'balanced', 3));
    equipBoardingTool(state.left, 5);
    for (let i = 0; i < 5 && !state.winner; i++) duelRound(state, new SeededRngService(`d${i}`), 'thrust', 'feint');
    expect(state.winner).toBe('a');
    expect(duelRound(state, new SeededRngService('x'), 'thrust', 'parry').ok).toBe(false);
  });

  it('детерминированный прогон', () => {
    const run = () => {
      const state = createDuel(duelist('a', 'aggressive', 8), duelist('b', 'defensive', 8));
      return runDuel(state, new SeededRngService('z'));
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
