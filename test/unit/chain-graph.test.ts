import { describe, it, expect } from 'vitest';
import { InMemoryContentRegistry } from '../../src/infrastructure/content/InMemoryContentRegistry.js';
import { validateChainGraph } from '../../src/infrastructure/economy/ChainGraph.js';
import type { ProductionChainDefinition } from '../../src/domain/economy/ProductionChainDefinition.js';
import type { GoodId } from '../../src/domain/economy/GoodDefinition.js';

function makeChain(recipeIds: string[], entry: string[], exit: string[]): ProductionChainDefinition {
  return {
    id: 'test-chain',
    displayNameKey: 'chain.test-chain.name',
    recipeIds,
    entryGoodIds: entry as unknown as GoodId[],
    exitGoodIds: exit as unknown as GoodId[],
    factionTags: [],
    originTags: ['science'],
    validationRules: { acyclic: true, connected: true },
  };
}

describe('TKT-M5-004: ChainGraph', () => {
  it('цикл → Err(ECON_CHAIN_INVALID)', () => {
    const reg = new InMemoryContentRegistry({
      good: { a: { id: 'a' }, b: { id: 'b' } },
      recipe: {
        r1: { id: 'r1', inputs: [{ good_id: 'a' }], outputs: [{ good_id: 'b' }] },
        r2: { id: 'r2', inputs: [{ good_id: 'b' }], outputs: [{ good_id: 'a' }] },
      },
    });
    const r = validateChainGraph(makeChain(['r1', 'r2'], ['a'], ['b']), reg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ECON_CHAIN_INVALID');
  });

  it('несуществующий good → Err (AC07)', () => {
    const reg = new InMemoryContentRegistry({
      good: { a: { id: 'a' } },
      recipe: { r1: { id: 'r1', inputs: [{ good_id: 'ghost' }], outputs: [{ good_id: 'a' }] } },
    });
    const r = validateChainGraph(makeChain(['r1'], ['a'], ['a']), reg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ECON_CHAIN_INVALID');
  });

  it('несуществующий рецепт → Err', () => {
    const reg = new InMemoryContentRegistry({
      good: { a: { id: 'a' } },
      recipe: { r1: { id: 'r1', inputs: [{ good_id: 'a' }], outputs: [{ good_id: 'a' }] } },
    });
    const r = validateChainGraph(makeChain(['r1', 'missing'], ['a'], ['a']), reg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('ECON_CHAIN_INVALID');
  });

  it('валидная ацикличная цепь → Ok', () => {
    const reg = new InMemoryContentRegistry({
      good: { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } },
      recipe: {
        r1: { id: 'r1', inputs: [{ good_id: 'a' }], outputs: [{ good_id: 'b' }] },
        r2: { id: 'r2', inputs: [{ good_id: 'b' }], outputs: [{ good_id: 'c' }] },
      },
    });
    expect(validateChainGraph(makeChain(['r1', 'r2'], ['a'], ['c']), reg).ok).toBe(true);
  });
});
