import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { ISaveRepository, SaveSlotMeta } from '../../domain/save/ISaveRepository.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';

/** TKT-M3-013: in-memory репозиторий для unit-тестов без браузера. */
export class InMemorySaveRepository implements ISaveRepository {
  private readonly slots = new Map<string, SaveSnapshot>();

  list(): Result<readonly SaveSlotMeta[], AppError> {
    const metas: SaveSlotMeta[] = [...this.slots.entries()]
      .map(([slotId, snapshot]): SaveSlotMeta => ({
        slotId,
        savedAtMs: snapshot.savedAtMs,
        contentHash: snapshot.contentHash,
        formatVersion: 1,
      }))
      .sort((a, b) => a.slotId.localeCompare(b.slotId));
    return ok(metas);
  }

  save(slotId: string, snapshot: SaveSnapshot): Result<void, AppError> {
    this.slots.set(slotId, snapshot);
    return ok(undefined);
  }

  load(slotId: string): Result<SaveSnapshot, AppError> {
    const snapshot = this.slots.get(slotId);
    if (!snapshot) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Save slot not found: ${slotId}`, { slotId }),
      );
    }
    return ok(snapshot);
  }

  delete(slotId: string): Result<void, AppError> {
    this.slots.delete(slotId);
    return ok(undefined);
  }

  exists(slotId: string): Result<boolean, AppError> {
    return ok(this.slots.has(slotId));
  }
}
