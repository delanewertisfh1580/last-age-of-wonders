import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/fleet/faction-has-doctrine: у фракции есть doctrine_id. */
export const factionHasDoctrine: GameplayRule = {
  id: 'gameplay/fleet/faction-has-doctrine',
  run: (ctx) => {
    const issues = [];
    for (const faction of ctx.registry.list<Record<string, unknown>>('faction')) {
      const doctrine = faction.content.doctrine_id;
      if (typeof doctrine !== 'string' || doctrine === '') {
        issues.push(issue('gameplay/fleet/faction-has-doctrine', `Faction ${faction.id} has no doctrine_id`, 'error', `faction/${faction.id}`));
      }
    }
    return issues;
  },
};
