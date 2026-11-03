import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IContentRegistry } from '../../domain/content/IContentRegistry.js';
import type { ContentKind } from '../../domain/content/ContentKind.js';

export type CrossRefConfig = Record<string, ContentKind>;

const DEFAULT_FIELD_TO_KIND: CrossRefConfig = {
  shader_graph_id: 'shaderGraph',
  mechanic_ids: 'mechanic',
  scar_ids: 'nodeScar',
  event_id: 'event',
  faction_id: 'faction',
  doctrine_id: 'doctrine',
  companion_id: 'companion',
  captain_id: 'captain',
  transformation_tree_id: 'transformationTree',
  story_beacon_id: 'storyBeacon',
};

/**
 * TKT-M2-006: валидация перекрёстных ссылок по конфигу cross-refs.json.
 * Поле вида `x_id` / `x_ids` — ссылка; непустое значение должно существовать в kind.
 */
export class CrossReferenceValidator {
  private fieldToKind: CrossRefConfig = { ...DEFAULT_FIELD_TO_KIND };

  constructor(fieldToKind?: CrossRefConfig) {
    if (fieldToKind) this.fieldToKind = { ...DEFAULT_FIELD_TO_KIND, ...fieldToKind };
  }

  loadConfig(contentRoot: string, path = 'cross-refs.json'): Result<void, AppError> {
    const full = join(contentRoot, path);
    if (!existsSync(full)) return ok(undefined);
    try {
      const raw = JSON.parse(readFileSync(full, 'utf8')) as Record<string, string>;
      for (const [field, kind] of Object.entries(raw)) {
        if (typeof kind === 'string') this.fieldToKind[field] = kind as ContentKind;
      }
      return ok(undefined);
    } catch {
      return err(makeAppError('INFRA_SCHEMA_INVALID', `Cannot parse ${path}`));
    }
  }

  validate(registry: IContentRegistry): Result<readonly ValidationFinding[], AppError> {
    // Обходим все kind, что встречаются в реестре; поля из конфига — ссылки.
    const konfigKinds = new Set(Object.values(this.fieldToKind));
    const sources = new Set<ContentKind>([...konfigKinds, 'event', 'mechanic']);
    const findings: ValidationFinding[] = [];

    for (const kind of sources) {
      for (const entry of registry.list<Record<string, unknown>>(kind)) {
        const content = entry.content as Record<string, unknown> | null;
        if (!content) continue;
        for (const [field, value] of Object.entries(content)) {
          if (field === 'id') continue;
          const targetKind = this.fieldToKind[field];
          if (!targetKind) continue;

          const targets = Array.isArray(value) ? value : [value];
          for (const target of targets) {
            if (target === null || target === undefined || target === '') continue;
            if (typeof target !== 'string') continue;
            if (!registry.has(targetKind, target)) {
              findings.push({ kind, id: entry.id, field, target, targetKind });
            }
          }
        }
      }
    }

    if (findings.length > 0) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', 'Cross-reference validation failed', {
          issues: findings.map(
            (f) => `${f.kind}/${f.id}: '${f.field}' -> ${f.targetKind}('${f.target}') not found`,
          ),
        }),
      );
    }
    return ok(findings);
  }
}

export interface ValidationFinding {
  readonly kind: ContentKind;
  readonly id: string;
  readonly field: string;
  readonly target: string;
  readonly targetKind: ContentKind;
}
