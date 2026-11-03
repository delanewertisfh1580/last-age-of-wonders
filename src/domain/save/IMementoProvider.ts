import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';

/** TKT-M3-010: контракт доменного memento-провайдера (§5.1 DEV-SPEC-006). */
export interface IMementoProvider<TState = unknown> {
  readonly domainId: string;
  captureState(): Result<TState, AppError>;
  restoreState(state: TState): Result<void, AppError>;
}
