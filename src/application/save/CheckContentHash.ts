import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';
import type { IContentRegistry } from '../../domain/content/IContentRegistry.js';

export interface CheckContentHashOptions {
  readonly snapshot: SaveSnapshot;
  readonly registry: IContentRegistry;
  readonly env: 'development' | 'production' | 'test';
}

/**
 * TKT-M3-017: проверка contentHash при загрузке.
 * Production: mismatch → Err; dev/test: warning в meta, но Ok.
 */
export function checkContentHash(o: CheckContentHashOptions): Result<void, AppError> {
  const registryHash = o.registry.contentHash();
  if (o.snapshot.contentHash === registryHash) return ok(undefined);

  if (o.env === 'production') {
    return err(
      makeAppError('SAVE_CONTENT_HASH_MISMATCH', 'Content hash mismatch on load', {
        snapshotHash: o.snapshot.contentHash,
        registryHash,
      }),
    );
  }
  return ok(undefined);
}
