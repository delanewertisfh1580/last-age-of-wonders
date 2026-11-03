import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/narrative/beacon-has-completion. */
export const beaconHasCompletion: GameplayRule = {
  id: 'gameplay/narrative/beacon-has-completion',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const beacon of ctx.registry.list<Record<string, unknown>>('storyBeacon')) {
      const completion = beacon.content.completion_event_id;
      if (typeof completion !== 'string' || completion === '') {
        issues.push(issue('gameplay/narrative/beacon-has-completion', `Story beacon ${beacon.id} has no completion event`, 'error', `storyBeacon/${beacon.id}`));
      }
    }
    return issues;
  },
};
