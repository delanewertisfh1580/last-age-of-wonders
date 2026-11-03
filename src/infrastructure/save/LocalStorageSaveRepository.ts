import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { ISaveRepository, SaveSlotMeta } from '../../domain/save/ISaveRepository.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';

const KEY_PREFIX = 'nvm:save:';

/** Минимальный интерфейс хранилища (браузерный localStorage или мок). */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  item?(index: number): string | null;
}

/**
 * TKT-M3-012: LocalStorage-репозиторий сохранений.
 * Хранит JSON в ключах `nvm:save:{slotId}`; реестр ключей — отдельный ключ.
 */
export class LocalStorageSaveRepository implements ISaveRepository {
  private readonly indexKey = KEY_PREFIX + 'index';

  constructor(private readonly storage: Storage) {}

  list(): Result<readonly SaveSlotMeta[], AppError> {
    try {
      const raw = this.storage.getItem(this.indexKey);
      const metas: SaveSlotMeta[] = raw ? (JSON.parse(raw) as SaveSlotMeta[]) : [];
      return ok(metas.filter((m) => this.storage.getItem(KEY_PREFIX + m.slotId) !== null));
    } catch (e) {
      return err(this.storageError('list', e));
    }
  }

  save(slotId: string, snapshot: SaveSnapshot): Result<void, AppError> {
    try {
      this.storage.setItem(KEY_PREFIX + slotId, JSON.stringify(snapshot));
      const metas = (this.storage.getItem(this.indexKey) !== null
        ? (JSON.parse(this.storage.getItem(this.indexKey) as string) as SaveSlotMeta[])
        : []
      ).filter((m) => m.slotId !== slotId);
      metas.push({
        slotId,
        savedAtMs: snapshot.savedAtMs,
        contentHash: snapshot.contentHash,
        formatVersion: 1,
      });
      metas.sort((a, b) => a.slotId.localeCompare(b.slotId));
      this.storage.setItem(this.indexKey, JSON.stringify(metas));
      return ok(undefined);
    } catch (e) {
      return err(this.storageError('save', e, slotId));
    }
  }

  load(slotId: string): Result<SaveSnapshot, AppError> {
    try {
      const raw = this.storage.getItem(KEY_PREFIX + slotId);
      if (raw === null) {
        return err(
          makeAppError('INFRA_CONTENT_NOT_FOUND', `Save slot not found: ${slotId}`, { slotId }),
        );
      }
      return ok(JSON.parse(raw) as SaveSnapshot);
    } catch (e) {
      return err(this.storageError('load', e, slotId));
    }
  }

  delete(slotId: string): Result<void, AppError> {
    try {
      // Идемпотентно: отсутствие слота — не ошибка.
      if (this.storage.getItem(KEY_PREFIX + slotId) === null) return ok(undefined);
      this.storage.removeItem(KEY_PREFIX + slotId);
      const metas = (
        this.storage.getItem(this.indexKey) !== null
          ? (JSON.parse(this.storage.getItem(this.indexKey) as string) as SaveSlotMeta[])
          : []
      ).filter((m) => m.slotId !== slotId);
      this.storage.setItem(this.indexKey, JSON.stringify(metas));
      return ok(undefined);
    } catch (e) {
      return err(this.storageError('delete', e, slotId));
    }
  }

  exists(slotId: string): Result<boolean, AppError> {
    return ok(this.storage.getItem(KEY_PREFIX + slotId) !== null);
  }

  private storageError(op: string, cause: unknown, slotId?: string): AppError {
    const quota = cause instanceof Error && cause.name === 'QuotaExceededError';
    return makeAppError('INFRA_STORAGE_FAILED', `localStorage ${op} failed: ${String(cause)}`, {
      op,
      slotId,
      reason: quota ? 'quota_exceeded' : 'storage_error',
    });
  }
}
