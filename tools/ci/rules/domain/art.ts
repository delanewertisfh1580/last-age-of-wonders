import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/art/faction-has-visual-doctrine. */
export const factionHasVisualDoctrine: GameplayRule = {
  id: 'gameplay/art/faction-has-visual-doctrine',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const faction of ctx.registry.list<Record<string, unknown>>('faction')) {
      const hasVisual = ctx.registry.has('factionVisualDoctrine', String(faction.id));
      if (!hasVisual) {
        issues.push(issue('gameplay/art/faction-has-visual-doctrine', `Faction ${faction.id} has no visual doctrine`, 'warning', `faction/${faction.id}`));
      }
    }
    return issues;
  },
};
