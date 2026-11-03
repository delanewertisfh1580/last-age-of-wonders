import { ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import { err as _err } from '../../domain/result/Result.js';
import type {
  ContentEntry,
  IContentRegistry,
} from '../../domain/content/IContentRegistry.js';
import type { ContentKind } from '../../domain/content/ContentKind.js';

type KindMap = Partial<Record<ContentKind, Record<string, unknown>>>;

/**
 * TKT-M2-009: in-memory реестр для tests — конструктор принимает данные напрямую.
 */
export class InMemoryContentRegistry implements IContentRegistry {
  private readonly storage: Map<ContentKind, Map<string, ContentEntry>>;

  constructor(
    data: KindMap,
    private readonly validator?: AjvSchemaValidatorLike,
  ) {
    this.storage = new Map();
    for (const [kind, records] of Object.entries(data)) {
      const map = new Map<string, ContentEntry>();
      const keys =
        records instanceof Map ? records : new Map(Object.entries(records ?? {}));
      for (const [id, content] of keys) {
        map.set(id, {
          kind: kind as ContentKind,
          id,
          content,
          packId: 'in-memory',
        });
      }
      this.storage.set(kind as ContentKind, map);
    }
  }

  /** Валидация содержимого заранее подготовленным валидатором (контракт тот же). */
  validateAll(): Result<void, AppError> {
    if (!this.validator) return ok(undefined);
    for (const [kind, map] of this.storage) {
      const schemaName = kind === 'event' ? 'event-definition' : kind === 'mechanic' ? 'mechanic-definition' : 'generic-content';
      for (const entry of map.values()) {
        const r = this.validator.validate(schemaName, entry.content);
        if (!r.ok) return r;
      }
    }
    return ok(undefined);
  }

  loadAll(): Result<void, AppError> {
    return this.validateAll();
  }

  get<T>(kind: ContentKind, id: string): Result<T, AppError> {
    const found = this.storage.get(kind)?.get(id);
    if (!found) {
      return _err(
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
    return 'in-memory-stub';
  }

  reload(): Result<void, AppError> {
    return ok(undefined);
  }
}

export interface AjvSchemaValidatorLike {
  validate(name: string, value: unknown): Result<void, AppError>;
}
