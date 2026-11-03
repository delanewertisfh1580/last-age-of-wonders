import { ok, type Result } from '../../../domain/result/Result.js';
import type { AppError } from '../../../domain/app-error/AppError.js';
import type { IMementoProvider } from '../../../domain/save/IMementoProvider.js';
import type { IRngService } from '../../../domain/rng/IRngService.js';
import type { RngStreamState } from '../../../domain/rng/RngStreamState.js';

/** TKT-M3-019: memento-провайдер для RNG. */
export class RngMementoProvider implements IMementoProvider<Record<string, RngStreamState>> {
  readonly domainId = 'rng';

  constructor(private readonly rng: IRngService) {}

  captureState(): Result<Record<string, RngStreamState>, AppError> {
    return ok(this.rng.serializeAll());
  }

  restoreState(state: Record<string, RngStreamState>): Result<void, AppError> {
    for (const key of Object.keys(state).sort()) {
      const restored = this.rng.restoreState(key as never, state[key] as never);
      if (!restored.ok) return restored;
    }
    return ok(undefined);
  }
}
