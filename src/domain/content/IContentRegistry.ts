import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { ContentKind } from './ContentKind.js';

/** TKT-M2-005: запись контента в реестре. */
export interface ContentEntry<T = unknown> {
  readonly kind: ContentKind;
  readonly id: string;
  readonly content: T;
  readonly packId: string;
}

/** TKT-M2-005: контракт реестра контента из §5.3 DEV-SPEC-003. */
export interface IContentRegistry {
  loadAll(): Result<void, AppError>;
  get<T>(kind: ContentKind, id: string): Result<T, AppError>;
  list<T>(kind: ContentKind): readonly ContentEntry<T>[];
  has(kind: ContentKind, id: string): boolean;
  /** Вместо stub 'stub' из тикета — сразу ContentHasher из TKT-M2-007. */
  contentHash(): string;
  reload(reasons?: { devOnly: boolean }): Result<void, AppError>;
}
