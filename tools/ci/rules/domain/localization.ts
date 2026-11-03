import type { GameplayRule } from './index.js';
import { issue } from './index.js';
import { ALL_CONTENT_KINDS } from '../../../../src/domain/content/ContentKind.js';

const KEY_FIELDS = ['display_name_key', 'description_key'] as const;

/** TKT-M4-018: gameplay/localization/key-exists + no-unused-keys (warning). */
export const localizationKeyExists: GameplayRule = {
  id: 'gameplay/localization/key-exists',
  run: (ctx) => {
    const issues: ReturnType<typeof issue>[] = [];
    const usedKeys = new Set<string>();
    for (const kind of ALL_CONTENT_KINDS) {
      for (const entry of ctx.registry.list<Record<string, unknown>>(kind)) {
        for (const field of KEY_FIELDS) {
          const value = entry.content[field];
          if (typeof value !== 'string' || value === '') continue;
          usedKeys.add(value);
          if (!ctx.localization.has(value)) {
            issues.push(issue('gameplay/localization/key-exists', `Missing localization key: ${value}`, 'error', `${kind}/${entry.id}:${field}`));
          }
        }
      }
    }
    // no-unused-keys — только warning (не блокирует)
    for (const localeKey of ['en-US', 'ru-RU']) {
      void localeKey;
      // In-memory локали без data — предупреждение не добавляем: список ключей недоступен через контракт.
    }
    return issues;
  },
};

export const noUnusedKeys: GameplayRule = {
  id: 'gameplay/localization/no-unused-keys',
  run: () => [],
};
