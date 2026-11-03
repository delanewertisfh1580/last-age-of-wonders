import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/cataclysm/has-min-2-stages: минимум 2 стадии. */
export const cataclysmHasMinStages: GameplayRule = {
  id: 'gameplay/cataclysm/has-min-2-stages',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const entry of ctx.registry.list<Record<string, unknown>>('cataclysm')) {
      const stages = (entry.content.stages as unknown[] | undefined) ?? [];
      if (stages.length < 2) {
        issues.push(issue('gameplay/cataclysm/has-min-2-stages', `Cataclysm ${entry.id} has ${stages.length} stages (< 2)`, 'error', `cataclysm/${entry.id}`));
      }
    }
    return issues;
  },
};
