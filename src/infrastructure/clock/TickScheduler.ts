import type { IEventBus } from '../../domain/events/IEventBus.js';
import type { IMechanicRuntime } from '../../domain/mechanics/IMechanicRuntime.js';
import type { Logger } from '../../shared/logging/Logger.js';
import { makeEventType } from '../../shared/events/EventType.js';
import { TICK_SCOPES, type TickPhase } from '../../domain/clock/TickPhase.js';

export interface TickSchedulerOptions {
  readonly eventBus: IEventBus;
  readonly runtime: IMechanicRuntime;
  readonly logger: Logger;
  readonly getTick?: () => number;
}

/**
 * TKT-M3-023: фиксированный порядок фаз одного такта (§7.3 DEV-SPEC-007).
 * Исключения в любой фазе ловятся, логируются, продолжаем со следующей.
 */
export class TickScheduler {
  readonly worldTickType = makeEventType('world.tick_advanced');
  readonly combatStartedType = makeEventType('combat.started');

  private tick = 0;
  private phaseCallbacks = new Set<(tick: number, phase: TickPhase) => void>();

  constructor(private readonly o: TickSchedulerOptions) {}

  onPhase(cb: (tick: number, phase: TickPhase) => void): () => void {
    this.phaseCallbacks.add(cb);
    return () => this.phaseCallbacks.delete(cb);
  }

  currentTick(): number {
    return this.o.getTick ? this.o.getTick() : this.tick;
  }

  setTick(value: number): void {
    this.tick = value;
  }

  async runOneTick(): Promise<void> {
    const tickNumber = this.tick;

    const safe = async (phase: TickPhase, fn: () => void): Promise<void> => {
      try {
        fn();
      } catch (e) {
        this.o.logger.error(`Tick phase ${phase} failed`, {
          phase,
          tick: tickNumber,
          error: e instanceof Error ? e.message : String(e),
        });
      }
      this.notify(tickNumber, phase);
    };

    // 1. WarningThenImpact → 2. NextTick
    await safe('warning-drain', () => this.o.eventBus.drainQueue('WarningThenImpact'));
    await safe('tick-drain', () => this.o.eventBus.drainQueue('NextTick'));
    // 3. world.tick_advanced
    await safe('world-tick-advance', () => {
      const published = this.o.eventBus.publish(
        { type: this.worldTickType, payload: { tick: tickNumber } },
        { deliveryPolicy: 'Immediate' },
      );
      if (!published.ok) {
        this.o.logger.error(`Publish world.tick_advanced failed: ${published.error.message}`);
      }
    });
    // 4..12: scopes в строгом порядке
    for (const scope of TICK_SCOPES) {
      await safe(`scope:${scope}` as TickPhase, () => {
        const r = this.o.runtime.tickScope(scope);
        if (!r.ok) {
          this.o.logger.error(`tickScope(${scope}) failed: ${r.error.message}`);
        }
      });
    }
    // 13. after-scene drain
    await safe('after-scene-drain', () => this.o.eventBus.drainQueue('AfterScene'));

    this.tick = tickNumber + 1;
  }

  private notify(tick: number, phase: TickPhase): void {
    for (const cb of [...this.phaseCallbacks]) {
      try {
        cb(tick, phase);
      } catch (e) {
        this.o.logger.error('onTickPhase callback threw', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
}
