import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/companion/has-synergy-or-conflict. */
export const companionHasSynergyOrConflict: GameplayRule = {
  id: 'gameplay/companion/has-synergy-or-conflict',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const companion of ctx.registry.list<Record<string, unknown>>('companion')) {
      const synergy = (companion.content.synergies as unknown[] | undefined) ?? [];
      const conflict = (companion.content.conflicts as unknown[] | undefined) ?? [];
      if (synergy.length === 0 && conflict.length === 0) {
        issues.push(issue('gameplay/companion/has-synergy-or-conflict', `Companion ${companion.id} has neither synergy nor conflict`, 'warning', `companion/${companion.id}`));
      }
    }
    return issues;
  },
};
