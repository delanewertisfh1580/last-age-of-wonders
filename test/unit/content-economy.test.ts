import { describe, it, expect, beforeAll } from 'vitest';
import { bootstrap } from '../../src/bootstrap/GameBootstrap.js';
import type { IContentRegistry } from '../../src/domain/content/IContentRegistry.js';
import { validateChainGraph, validateRecipeOwnership } from '../../src/infrastructure/economy/ChainGraph.js';
import { parseGoodDefinition, parseProductionChainDefinition } from '../../src/infrastructure/economy/ContentMappers.js';
import type { ProductionChainDefinition } from '../../src/domain/economy/ProductionChainDefinition.js';

let registry: IContentRegistry;

beforeAll(async () => {
  const boot = await bootstrap({ env: 'test', contentMode: 'json', contentRoot: 'content' });
  if (!boot.ok) throw new Error(`bootstrap failed: ${boot.error.message}`);
  registry = boot.value.content;
});

const DISPLAY_NAME_KINDS = ['good', 'recipe', 'productionChain', 'tradeNode', 'tradeRoute'] as const;

function list(kind: string): Record<string, unknown>[] {
  return registry.list<Record<string, unknown>>(kind as never).map((e) => e.content);
}

describe('TKT-M5-002/006: content economy (весь срез)', () => {
  it('JSON-срез грузится через loadAll → Ok и наполнен', () => {
    expect(list('good')).toHaveLength(14);
    expect(list('recipe')).toHaveLength(8);
    expect(list('productionChain')).toHaveLength(3);
    expect(list('tradeNode')).toHaveLength(12);
    expect(list('tradeRoute')).toHaveLength(16);
    expect(list('market')).toHaveLength(12);
    expect(list('priceModifier').length).toBeGreaterThan(50);
  });

  it('display_name_key уникальны во всём срезе', () => {
    const seen = new Set<string>();
    for (const kind of DISPLAY_NAME_KINDS) {
      for (const entry of list(kind)) {
        const key = entry.display_name_key as string;
        expect(typeof key).toBe('string');
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it('каждый узел инцидентен >= 2 рёбрам; граф узлов связен (INV-08)', () => {
    const degree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    const nodes = new Set<string>();
    for (const route of list('tradeRoute')) {
      const from = route.from_node_id as string;
      const to = route.to_node_id as string;
      nodes.add(from);
      nodes.add(to);
      degree.set(from, (degree.get(from) ?? 0) + 1);
      degree.set(to, (degree.get(to) ?? 0) + 1);
      if (!adj.has(from)) adj.set(from, []);
      if (!adj.has(to)) adj.set(to, []);
      adj.get(from)!.push(to);
      adj.get(to)!.push(from);
    }
    expect(nodes.size).toBe(12);
    for (const n of nodes) expect(degree.get(n) ?? 0).toBeGreaterThanOrEqual(2);

    const start = [...nodes][0];
    const visited = new Set<string>([start]);
    const stack = [start];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      for (const next of adj.get(cur) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
    expect(visited.size).toBe(nodes.size);
  });

  it('все policy_id (кроме legality) резолвятся в priceModifier', () => {
    const missing: string[] = [];
    const walk = (key: string, value: unknown): void => {
      if (key.endsWith('_policy_id') && key !== 'legality_policy_id' && typeof value === 'string') {
        if (!registry.has('priceModifier', value)) missing.push(`${key}=${value}`);
        return;
      }
      if (Array.isArray(value)) {
        for (const v of value) walk('', v);
        return;
      }
      if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(k, v);
      }
    };
    for (const kind of [...DISPLAY_NAME_KINDS, 'market'] as const) {
      for (const entry of list(kind)) walk('', entry);
    }
    expect(missing).toEqual([]);
  });

  it('цепочки ацикличны, связны; рецепт ровно в одной цепочке (INV-06)', () => {
    const parsed: ProductionChainDefinition[] = [];
    for (const entry of list('productionChain')) {
      const res = parseProductionChainDefinition(entry);
      expect(res.ok).toBe(true);
      if (res.ok) parsed.push(res.value);
    }
    expect(validateRecipeOwnership(parsed, registry).ok).toBe(true);
    for (const chain of parsed) {
      expect(validateChainGraph(chain, registry).ok).toBe(true);
    }
  });

  it('маппер parseGoodDefinition: coal — raw / science (демо покупает 5 coal)', () => {
    const got = registry.get<Record<string, unknown>>('good', 'coal');
    expect(got.ok).toBe(true);
    if (!got.ok) throw new Error('coal missing');
    const good = parseGoodDefinition(got.value);
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.value.id).toBe('coal');
      expect(good.value.tier).toBe('raw');
      expect(good.value.origin).toBe('science');
    }
  });
});
