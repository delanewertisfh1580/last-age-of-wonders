import { ok, type Result } from '../../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../../domain/app-error/AppError.js';
import type { IMementoProvider } from '../../../domain/save/IMementoProvider.js';
import type { IMechanicRuntime } from '../../../domain/mechanics/IMechanicRuntime.js';

/** TKT-M3-019: memento-провайдер для состояния MechanicRuntime. */
export class MechanicRuntimeMementoProvider implements IMementoProvider<Record<string, unknown>> {
  readonly domainId = 'mechanicRuntime';

  constructor(private readonly runtime: IMechanicRuntime) {}

  captureState(): Result<Record<string, unknown>, AppError> {
    return ok(this.runtime.captureRuntimeState());
  }

  restoreState(state: Record<string, unknown>): Result<void, AppError> {
    const restored = this.runtime.restoreRuntimeState({ ...state });
    if (!restored.ok) {
      return {
        ok: false,
        error: makeAppError('SAVE_INVALID_SNAPSHOT', `Failed to restore mechanic runtime: ${restored.error.message}`),
      };
    }
    return ok(undefined);
  }
}
