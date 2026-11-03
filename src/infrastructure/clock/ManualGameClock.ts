import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IGameClock, ClockState } from '../../domain/clock/IGameClock.js';
import type { TickPhase } from '../../domain/clock/TickPhase.js';

export interface ManualGameClockOptions {
  /** Выполняет один тик (например scheduler.runOneTick()); вызывается синхронно. */
  readonly runTick?: () => void;
}

/**
 * TKT-M3-025: ручные часы без RAF — advanceOneTick() синхронный, для тестов.
 */
export class ManualGameClock implements IGameClock {
  private readonly tickCallbacks = new Set<(tick: number) => void>();
  private readonly phaseCallbacks = new Set<(tick: number, phase: TickPhase) => void>();
  private currentTick = 0;
  private paused = false;
  private speed = 1;

  constructor(private readonly o: ManualGameClockOptions = {}) {}

  get state(): ClockState {
    return {
      currentTick: this.currentTick,
      currentTickProgress: 0,
      paused: this.paused,
      speedMultiplier: this.speed,
    };
  }

  setTick(value: number): void {
    this.currentTick = value;
  }

  advanceOneTick(): Result<void, AppError> {
    if (this.paused) {
      // Инвариант INV-03: на паузе такт не продвигается, но возвращается Ok.
      return ok(undefined);
    }
    try {
      this.o.runTick?.();
    } catch (e) {
      return err(
        makeAppError('DOMAIN_DELIVERY_FAILED', `runTick failed: ${e instanceof Error ? e.message : String(e)}`),
      );
    }
    const tickNumber = this.currentTick;
    for (const cb of [...this.tickCallbacks]) {
      try {
        cb(tickNumber);
      } catch (e) {
        // INV-07: ошибка callback логируется (в тестах — проглатывается), другие продолжаются.
        console.error('onTick callback failed', e);
      }
    }
    this.currentTick = tickNumber + 1;
    return ok(undefined);
  }

  onTick(cb: (tick: number) => void): () => void {
    this.tickCallbacks.add(cb);
    return () => this.tickCallbacks.delete(cb);
  }

  onTickPhase(cb: (tick: number, phase: TickPhase) => void): () => void {
    this.phaseCallbacks.add(cb);
    return () => this.phaseCallbacks.delete(cb);
  }

  start(): Result<void, AppError> {
    return ok(undefined);
  }

  stop(): Result<void, AppError> {
    return ok(undefined);
  }

  pause(): Result<void, AppError> {
    this.paused = true;
    return ok(undefined);
  }

  resume(): Result<void, AppError> {
    this.paused = false;
    return ok(undefined);
  }

  setSpeedMultiplier(multiplier: number): Result<void, AppError> {
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
      return err(makeAppError('DOMAIN_INVARIANT_VIOLATION', 'speedMultiplier must be > 0'));
    }
    this.speed = multiplier;
    return ok(undefined);
  }
}
