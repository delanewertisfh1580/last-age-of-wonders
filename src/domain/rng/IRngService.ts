import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { RngStreamName } from './RngStreamName.js';
import type { RngStreamState } from './RngStreamState.js';

/**
 * TKT-M3-005: контракт сидированного рандома (§5.2 DEV-SPEC-005).
 * Все методы возвращают Result; потоки изолированы.
 */
export interface IRngService {
  nextFloat(stream: RngStreamName): Result<number, AppError>;
  nextInt(stream: RngStreamName, min: number, max: number): Result<number, AppError>;
  pickOne<T>(stream: RngStreamName, items: readonly T[]): Result<T, AppError>;
  shuffle<T>(stream: RngStreamName, items: readonly T[]): Result<readonly T[], AppError>;
  chance(stream: RngStreamName, p: number): Result<boolean, AppError>;
  getState(stream: RngStreamName): Result<RngStreamState, AppError>;
  restoreState(stream: RngStreamName, state: RngStreamState): Result<void, AppError>;
  listStreams(): readonly RngStreamName[];
  serializeAll(): Record<string, RngStreamState>;
}
