import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/economy/chain-acyclic: производственная цепочка без циклов. */
export const chainAcyclic: GameplayRule = {
  id: 'gameplay/economy/chain-acyclic',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    const chains = ctx.registry.list<Record<string, unknown>>('productionChain');
    for (const chain of chains) {
      const id = String(chain.content.id);
      const visited = new Set<string>([id]);
      // Простая проверка self-reference в inputs/outputs (упрощение для скелета).
      const inputs = (chain.content.inputs as { good_id?: string }[] | undefined) ?? [];
      for (const input of inputs) {
        if (input?.good_id && visited.has(input.good_id)) {
          issues.push(issue('gameplay/economy/chain-acyclic', `Production chain ${id} references itself`, 'error', `productionChain/${id}`));
        }
      }
    }
    return issues;
  },
};
