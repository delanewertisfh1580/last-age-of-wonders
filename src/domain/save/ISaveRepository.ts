import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { SaveSnapshot } from './SaveSnapshot.js';

export interface SaveSlotMeta {
  readonly slotId: string;
  readonly savedAtMs: number;
  readonly contentHash: string;
  readonly formatVersion: 1;
}

/** TKT-M3-012: контракт репозитория сохранений (§5.3 DEV-SPEC-006). */
export interface ISaveRepository {
  list(): Result<readonly SaveSlotMeta[], AppError>;
  save(slotId: string, snapshot: SaveSnapshot): Result<void, AppError>;
  load(slotId: string): Result<SaveSnapshot, AppError>;
  delete(slotId: string): Result<void, AppError>;
  exists(slotId: string): Result<boolean, AppError>;
}
