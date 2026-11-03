import { err, ok, type Result } from '../result/Result.js';
import { makeAppError, type AppError } from '../app-error/AppError.js';
import type { ContentKind } from './ContentKind.js';

/** TKT-M2-002: ContentPack из §5.2 DEV-SPEC-003. */
export interface ContentPack {
  readonly id: string;
  readonly version: string;
  readonly kinds: readonly ContentKind[];
  readonly files: readonly string[];
  readonly dependencies: readonly string[];
}

export type ContentPackManifest = {
  readonly packs: readonly ContentPack[];
};

function parsePack(raw: unknown): ContentPack | null {
  const p = raw as Record<string, unknown> | null;
  if (!p || typeof p.id !== 'string') return null;
  return {
    id: p.id,
    version: (p.version as string) ?? '0.0.0',
    kinds: (p.kinds ?? []) as ContentKind[],
    files: (p.files ?? []) as string[],
    dependencies: (p.dependencies ?? []) as string[],
  };
}

/**
 * TKT-M2-002: топологическая сортировка паков по dependencies.
 * Цикл → Err; отсутствующая зависимость → Err.
 */
export function loadPacks(manifest: unknown): Result<readonly ContentPack[], AppError> {
  const m = manifest as Record<string, unknown> | null;
  if (!m || !Array.isArray(m.packs)) {
    return err(makeAppError('INFRA_SCHEMA_INVALID', 'Manifest must contain `packs` array'));
  }
  const packs: ContentPack[] = [];
  for (const raw of m.packs) {
    const p = parsePack(raw);
    if (!p) {
      return err(makeAppError('INFRA_SCHEMA_INVALID', 'Each pack must have string `id`'));
    }
    packs.push(p);
  }

  const byId = new Map<string, ContentPack>();
  for (const p of packs) {
    if (byId.has(p.id)) {
      return err(
        makeAppError('INFRA_SCHEMA_INVALID', `Duplicate pack id: ${p.id}`, { packId: p.id }),
      );
    }
    byId.set(p.id, p);
  }

  // Проверка зависимостей
  for (const p of packs) {
    for (const dep of p.dependencies) {
      if (!byId.has(dep)) {
        return err(
          makeAppError('INFRA_SCHEMA_INVALID', `Pack ${p.id} depends on unknown pack ${dep}`, {
            packId: p.id,
            dependency: dep,
          }),
        );
      }
    }
  }

  // Kahn topo sort
  const pending = new Set(packs.map((p) => p.id));
  const ordered: ContentPack[] = [];
  const resolvedIds = new Set<string>();
  // Детерминизм: обход исходного порядка packs на каждом проходе.
  while (pending.size > 0) {
    let progressed = false;
    for (const p of packs) {
      if (!pending.has(p.id)) continue;
      const ready = p.dependencies.every((d) => resolvedIds.has(d));
      if (ready) {
        ordered.push(p);
        resolvedIds.add(p.id);
        pending.delete(p.id);
        progressed = true;
      }
    }
    if (!progressed) {
      const cycleIds = [...pending].sort().join(', ');
      return err(
        makeAppError('INFRA_SCHEMA_INVALID', `Dependency cycle detected in packs: ${cycleIds}`, {
          cycle: [...pending].sort(),
        }),
      );
    }
  }
  return ok(ordered);
}
