import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { DomainEvent } from '../../shared/events/DomainEvent.js';
import type { MechanicScope } from './MechanicDefinition.js';

/** TKT-M2-015/TKT-M3-019: контракт механического рантайма. */
export interface IMechanicRuntime {
  dispatchEvent(event: DomainEvent): Result<void, AppError>;
  tickScope(scope: MechanicScope): Result<void, AppError>;
  activate(mechanicId: string, initialState?: unknown): Result<void, AppError>;
  deactivate(mechanicId: string): Result<void, AppError>;
  getState(mechanicId: string): Result<unknown, AppError>;

  /** TKT-M3-019: сериализация рантайм-состояния для SaveSnapshot. */
  captureRuntimeState(): Record<string, unknown>;
  restoreRuntimeState(state: Record<string, unknown>): Result<void, AppError>;
}
