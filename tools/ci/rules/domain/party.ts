import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/party/companion-has-min-2-mechanics. */
export const companionHasMinMechanics: GameplayRule = {
  id: 'gameplay/party/companion-has-min-2-mechanics',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const companion of ctx.registry.list<Record<string, unknown>>('companion')) {
      const mechanics = (companion.content.mechanic_ids as string[] | undefined) ?? [];
      if (mechanics.length < 2) {
        issues.push(issue('gameplay/party/companion-has-min-2-mechanics', `Companion ${companion.id} has ${mechanics.length} mechanics (< 2)`, 'warning', `companion/${companion.id}`));
      }
    }
    return issues;
  },
};
