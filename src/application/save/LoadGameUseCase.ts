import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { MementoRegistry } from '../../infrastructure/save/MementoRegistry.js';
import type { SaveSnapshotValidator } from '../../infrastructure/save/SaveSnapshotValidator.js';
import type { ISaveRepository } from '../../domain/save/ISaveRepository.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type { IMechanicRuntime } from '../../domain/mechanics/IMechanicRuntime.js';
import type { IContentRegistry } from '../../domain/content/IContentRegistry.js';
import { checkContentHash } from './CheckContentHash.js';

export interface LoadGameOptions {
  readonly repository: ISaveRepository;
  readonly validator: SaveSnapshotValidator;
  readonly mementos: MementoRegistry;
  readonly rng: IRngService;
  readonly runtime: IMechanicRuntime;
  readonly content: IContentRegistry;
  readonly env?: 'development' | 'production' | 'test';
}

/**
 * TKT-M3-015: загрузка и восстановление из SaveSnapshot.
 * Порядок восстановления — обратный порядку захвата (реверс list()).
 */
export class LoadGameUseCase {
  constructor(private readonly o: LoadGameOptions) {}

  execute(slotId: string): Result<SaveSnapshot, AppError> {
    const loaded = this.o.repository.load(slotId);
    if (!loaded.ok) return loaded as Result<SaveSnapshot, AppError>;
    const snapshot = loaded.value;

    const valid = this.o.validator.validate(snapshot);
    if (!valid.ok) return valid;

    const hashResult = checkContentHash({
      snapshot,
      registry: this.o.content,
      env: this.o.env ?? 'development',
    });
    if (!hashResult.ok) return hashResult;

    // 1. RNG (детерминизм всего остального).
    const rngState = snapshot.rngState as Record<
      string,
      { algorithm: string; s0: string; s1: string; s2: string; s3: string; callCount: number }
    >;
    if (!rngState || typeof rngState !== 'object') {
      return err(makeAppError('SAVE_INVALID_SNAPSHOT', 'rngState must be an object'));
    }
    for (const key of Object.keys(rngState).sort()) {
      const restored = this.o.rng.restoreState(key as never, rngState[key] as never);
      if (!restored.ok) return restored;
    }

    // 2. Mechanic runtime.
    const runtimeResult = this.o.runtime.restoreRuntimeState({ ...snapshot.mechanicRuntimeState });
    if (!runtimeResult.ok) return runtimeResult;

    // 3. Остальные домены (реверс list()).
    const providers = [...this.o.mementos.list()].reverse();
    for (const provider of providers) {
      if (provider.domainId === 'rng' || provider.domainId === 'mechanicRuntime') continue;
      const state = (snapshot.domainStates as Record<string, unknown>)[provider.domainId];
      if (state === undefined) {
        return err(
          makeAppError('SAVE_INVALID_SNAPSHOT', `Missing state for domain: ${provider.domainId}`),
        );
      }
      const restoreResult = provider.restoreState(state);
      if (!restoreResult.ok) return restoreResult as Result<SaveSnapshot, AppError>;
    }

    return ok(snapshot);
  }
}
