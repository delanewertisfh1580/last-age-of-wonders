import type { GameplayRule } from './index.js';
import { issue } from './index.js';

/** gameplay/epilogue/template-has-scenes. */
export const templateHasScenes: GameplayRule = {
  id: 'gameplay/epilogue/template-has-scenes',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    for (const template of ctx.registry.list<Record<string, unknown>>('epilogueTemplate')) {
      const scenes = (template.content.scenes as unknown[] | undefined) ?? [];
      if (scenes.length === 0) {
        issues.push(issue('gameplay/epilogue/template-has-scenes', `Epilogue template ${template.id} has no scenes`, 'error', `epilogueTemplate/${template.id}`));
      }
    }
    return issues;
  },
};
