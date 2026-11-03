import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/transformation/tree-has-final-state. */
export const treeHasFinalState: GameplayRule = {
  id: 'gameplay/transformation/tree-has-final-state',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const tree of ctx.registry.list<Record<string, unknown>>('transformationTree')) {
      const finalStates = (tree.content.final_states as unknown[] | undefined) ?? [];
      if (finalStates.length === 0) {
        issues.push(issue('gameplay/transformation/tree-has-final-state', `Transformation tree ${tree.id} has no final state`, 'error', `transformationTree/${tree.id}`));
      }
    }
    return issues;
  },
};
