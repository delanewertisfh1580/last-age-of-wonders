import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import {
  isContentKind,
  type ContentKind,
} from '../../domain/content/ContentKind.js';
import { loadPacks, type ContentPack } from '../../domain/content/ContentPack.js';
import type {
  ContentEntry,
  IContentRegistry,
} from '../../domain/content/IContentRegistry.js';
import { hashEntries } from '../../domain/content/ContentHasher.js';
import type { AjvSchemaValidator } from './AjvSchemaValidator.js';

const DIR_TO_KIND: Record<string, ContentKind> = {
  events: 'event',
  mechanics: 'mechanic',
};

/** Логическая схема, валидирующая записки контента по kind. */
function schemaNameForKind(kind: ContentKind): string {
  const known: Partial<Record<ContentKind, string>> = {
    event: 'event-definition',
    mechanic: 'mechanic-definition',
  };
  return known[kind] ?? 'generic-content';
}

/** Идентификатор записи: event использует `type`, остальное — `id`. */
function entryKey(kind: ContentKind, raw: unknown): string | null {
  const rec = raw as Record<string, unknown> | null;
  if (!rec) return null;
  if (kind === 'event') {
    return typeof rec.type === 'string' ? rec.type : null;
  }
  return typeof rec.id === 'string' ? rec.id : null;
}

/** Правило: директория файла определяет kind. */
function kindForPath(path: string): ContentKind | null {
  const dir = path.split('/')[0];
  if (DIR_TO_KIND[dir]) return DIR_TO_KIND[dir];
  if (isContentKind(dir)) return dir;
  return null;
}

/**
 * TKT-M2-005: JsonContentRegistry.loadAll.
 * Порядок: packs topo → файл → kind по пути → ajv-валидация → дубликаты → Map.
 */
export class JsonContentRegistry implements IContentRegistry {
  private storage = new Map<ContentKind, Map<string, ContentEntry>>();
  private hash = '';
  private loaded = false;

  constructor(
    private readonly contentRoot: string,
    private readonly validator: AjvSchemaValidator,
    private readonly env: 'development' | 'production' | 'test' = 'development',
  ) {}

  loadAll(): Result<void, AppError> {
    let manifestRaw: unknown;
    try {
      manifestRaw = JSON.parse(readFileSync(join(this.contentRoot, 'packs.json'), 'utf8'));
    } catch (e) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Cannot read packs manifest: ${String(e)}`),
      );
    }

    const packsResult = loadPacks(manifestRaw);
    if (!packsResult.ok) return packsResult as Result<void, AppError>;
    const packs = packsResult.value;

    const next = new Map<ContentKind, Map<string, ContentEntry>>();
    const keys = new Map<ContentKind, Set<string>>();

    for (const pack of packs) {
      for (const file of pack.files) {
        const kind = kindForPath(file);
        if (!kind) {
          return err(
            makeAppError(
              'CONTENT_REGISTRY_MALFORMED',
              `Cannot determine kind for file ${file}`,
            ),
          );
        }
        const schemaName = schemaNameForKind(kind);
        if (!this.validator.hasSchema(schemaName)) {
          return err(
            makeAppError('INFRA_SCHEMA_INVALID', `No schema for kind ${kind}`, { kind }),
          );
        }
        let raw: unknown;
        try {
          raw = JSON.parse(readFileSync(join(this.contentRoot, file), 'utf8'));
        } catch (e) {
          return err(
            makeAppError('INFRA_CONTENT_NOT_FOUND', `Cannot read ${file}: ${String(e)}`, {
              file,
            }),
          );
        }
        const arr = Array.isArray(raw) ? raw : [raw];
        for (const item of arr) {
          const key = entryKey(kind, item);
          if (!key) {
            return err(
              makeAppError('CONTENT_REGISTRY_MALFORMED', `Entry missing key in ${file}`),
            );
          }
          const validated = this.validator.validate(schemaName, item);
          if (!validated.ok) return validated as Result<void, AppError>;

          const kindKeys = keys.get(kind) ?? new Set<string>();
          if (kindKeys.has(key)) {
            return err(
              makeAppError(
                'CONTENT_DUPLICATE_KIND',
                `Duplicate id in kind ${kind}: ${key}`,
                { kind, id: key },
              ),
            );
          }
          kindKeys.add(key);
          keys.set(kind, kindKeys);

          const kindMap = next.get(kind) ?? new Map<string, ContentEntry>();
          kindMap.set(key, { kind, id: key, content: item, packId: pack.id });
          next.set(kind, kindMap);
        }
      }
    }

    this.storage = next;
    const entries = [...next.values()].flatMap((m) => [...m.values()]);
    this.hash = hashEntries(entries);
    this.loaded = true;
    return ok(undefined);
  }

  get<T>(kind: ContentKind, id: string): Result<T, AppError> {
    const found = this.storage.get(kind)?.get(id);
    if (!found) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Content not found: ${kind}/${id}`, {
          kind,
          id,
        }),
      );
    }
    return ok(found.content as T);
  }

  list<T>(kind: ContentKind): readonly ContentEntry<T>[] {
    const m = this.storage.get(kind);
    if (!m) return [];
    return [...m.values()] as readonly ContentEntry<T>[];
  }

  has(kind: ContentKind, id: string): boolean {
    return this.storage.get(kind)?.has(id) ?? false;
  }

  contentHash(): string {
    return this.hash;
  }

  reload(reasons?: { devOnly: boolean }): Result<void, AppError> {
    // TKT-M2-008: hot reload доступен только в development.
    if (reasons?.devOnly === true || this.env === 'production') {
      if (this.env === 'production') {
        return err(
          makeAppError('DOMAIN_INVARIANT_VIOLATION', 'Reload is dev only', { reason: 'dev_only' }),
        );
      }
    }
    const result = this.loadAll();
    if (result.ok) return ok(undefined);
    return result as Result<void, AppError>;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  packsOrderFrom(manifest: unknown): Result<readonly ContentPack[], AppError> {
    return loadPacks(manifest);
  }
}
