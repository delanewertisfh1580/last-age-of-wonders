import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { TickPhase } from './TickPhase.js';

/** TKT-M3-021: состояние часов (§5.2 DEV-SPEC-007). */
export interface ClockState {
  readonly currentTick: number;
  readonly currentTickProgress: number;
  readonly paused: boolean;
  readonly speedMultiplier: number;
}

/** TKT-M3-021: контракт игрового цикла (§5.2 DEV-SPEC-007). */
export interface IGameClock {
  readonly state: ClockState;

  start(): Result<void, AppError>;
  stop(): Result<void, AppError>;
  pause(): Result<void, AppError>;
  resume(): Result<void, AppError>;
  setSpeedMultiplier(multiplier: number): Result<void, AppError>;

  advanceOneTick(): Result<void, AppError>;

  onTick(callback: (tick: number) => void): () => void;
  onTickPhase(callback: (tick: number, phase: TickPhase) => void): () => void;
}
