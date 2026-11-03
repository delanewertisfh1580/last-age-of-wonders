import { ok, err, type Result } from '../../../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../../../domain/app-error/AppError.js';
import { AbstractMechanicPlugin } from '../../../../domain/mechanics/IMechanicPlugin.js';
import type { MechanicContext } from '../../../../domain/mechanics/MechanicContext.js';
import type { DomainEvent } from '../../../../shared/events/DomainEvent.js';

export interface CounterState {
  readonly count: number;
}

/** TKT-M2-017: stub tracker — инкрементирует count на world.tick_advanced. */
export class StubCounterTracker extends AbstractMechanicPlugin {
  constructor() {
    super('stub-counter-tracker');
  }

  onEvent(_event: DomainEvent, ctx: MechanicContext): Result<void, AppError> {
    const current = ctx.getState<CounterState>() ?? { count: 0 };
    const next: CounterState = { count: current.count + 1 };
    return ctx.setState(next);
  }

  onTick(ctx: MechanicContext): Result<void, AppError> {
    const state = ctx.getState<CounterState>();
    if (!state) {
      return err(makeAppError('MECHANIC_STATE_TYPE_MISMATCH', 'counter state missing'));
    }
    ctx.logger.debug(`counter => ${state.count}`);
    return ok(undefined);
  }

  lastLoggedCount = 0;
}
