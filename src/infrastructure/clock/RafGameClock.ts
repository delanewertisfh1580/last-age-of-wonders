import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IGameClock, ClockState } from '../../domain/clock/IGameClock.js';
import type { TickPhase } from '../../domain/clock/TickPhase.js';
import type { TickScheduler } from './TickScheduler.js';
import type { Logger } from '../../shared/logging/Logger.js';

export interface RafGameClockOptions {
  readonly scheduler: TickScheduler;
  readonly logger: Logger;
  readonly tickIntervalMs: number;
  /** Для тестов: подменяет requestAnimationFrame / cancelAnimationFrame. */
  readonly raf?: (cb: FrameRequestCallback) => number;
  readonly cancelRaf?: (handle: number) => void;
  /** Для тестов: подменяет performance.now(). */
  readonly now?: () => number;
}

/**
 * TKT-M3-024: RAF-часы. Накапливает elapsed; при elapsed * speed >= tickInterval
 * выполняет advanceOneTick(). Callbacks изолированы; pause/speed валидируются.
 */
export class RafGameClock implements IGameClock {
  private readonly tickCallbacks = new Set<(tick: number) => void>();
  private readonly phaseCallbacks = new Set<(tick: number, phase: TickPhase) => void>();
  private readonly memory = { paused: false, speed: 1, currentTick: 0, progress: 0 };
  private accumulatedMs = 0;
  private lastMs: number | null = null;
  private rafHandle: number | null = null;
  private readonly rafFn: (cb: FrameRequestCallback) => number;
  private readonly cancelFn: (handle: number) => void;
  private readonly nowFn: () => number;

  constructor(private readonly o: RafGameClockOptions) {
    this.rafFn =
      o.raf ??
      ((cb) =>
        requestAnimationFrame(cb));
    this.cancelFn = o.cancelRaf ?? ((h) => cancelAnimationFrame(h));
    this.nowFn = o.now ?? (() => performance.now());
  }

  get state(): ClockState {
    return {
      currentTick: this.memory.currentTick,
      currentTickProgress: this.memory.progress,
      paused: this.memory.paused,
      speedMultiplier: this.memory.speed,
    };
  }

  start(): Result<void, AppError> {
    if (this.rafHandle !== null) return ok(undefined);
    this.lastMs = this.nowFn();
    const loop = (time: number) => {
      const delta = this.lastMs === null ? 0 : Math.max(0, time - this.lastMs);
      this.accumulatedMs += delta;
      this.lastMs = time;

      if (!this.memory.paused && this.accumulatedMs * this.memory.speed >= this.o.tickIntervalMs) {
        const result = this.advanceOneTick();
        if (!result.ok) this.o.logger.error('advanceOneTick failed', { code: result.error.code });
        this.accumulatedMs = 0;
        this.memory.progress = 0;
      } else {
        this.memory.progress = Math.min(
          (this.accumulatedMs * this.memory.speed) / this.o.tickIntervalMs,
          0.999999,
        );
      }
      this.rafHandle = this.rafFn(loop);
    };
    this.rafHandle = this.rafFn(loop);
    return ok(undefined);
  }

  stop(): Result<void, AppError> {
    if (this.rafHandle !== null) {
      this.cancelFn(this.rafHandle);
      this.rafHandle = null;
    }
    this.lastMs = null;
    this.accumulatedMs = 0;
    return ok(undefined);
  }

  pause(): Result<void, AppError> {
    this.memory.paused = true;
    return ok(undefined);
  }

  resume(): Result<void, AppError> {
    this.memory.paused = false;
    this.accumulatedMs = 0;
    return ok(undefined);
  }

  setSpeedMultiplier(multiplier: number): Result<void, AppError> {
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
      return err(makeAppError('DOMAIN_INVARIANT_VIOLATION', 'speedMultiplier must be > 0'));
    }
    this.memory.speed = multiplier;
    return ok(undefined);
  }

  /** TKT-M3-024: ручное продвижение такта (и INV-03 для паузы). */
  advanceOneTick(): Result<void, AppError> {
    if (this.memory.paused) return ok(undefined);
    this.memory.currentTick += 1;
    this.notifyTick(this.memory.currentTick);
    return ok(undefined);
  }

  private notifyTick(tick: number): void {
    for (const cb of [...this.tickCallbacks]) {
      try {
        cb(tick);
      } catch (e) {
        this.o.logger.error('onTick callback failed', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  onTick(cb: (tick: number) => void): () => void {
    this.tickCallbacks.add(cb);
    return () => this.tickCallbacks.delete(cb);
  }

  onTickPhase(cb: (tick: number, phase: TickPhase) => void): () => void {
    this.phaseCallbacks.add(cb);
    return () => this.phaseCallbacks.delete(cb);
  }
}
