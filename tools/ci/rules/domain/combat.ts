import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/combat/faction-has-duel-doctrine. */
export const factionHasDuelDoctrine: GameplayRule = {
  id: 'gameplay/combat/faction-has-duel-doctrine',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const faction of ctx.registry.list<Record<string, unknown>>('faction')) {
      const hasDuel = ctx.registry.has('duelDoctrine', String(faction.id));
      if (!hasDuel) {
        issues.push(issue('gameplay/combat/faction-has-duel-doctrine', `Faction ${faction.id} has no duel doctrine`, 'warning', `faction/${faction.id}`));
      }
    }
    return issues;
  },
};
