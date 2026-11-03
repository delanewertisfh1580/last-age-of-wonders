import { ok, type Result } from '../../../../domain/result/Result.js';
import type { AppError } from '../../../../domain/app-error/AppError.js';
import { AbstractMechanicPlugin } from '../../../../domain/mechanics/IMechanicPlugin.js';
import type { MechanicContext } from '../../../../domain/mechanics/MechanicContext.js';
import type { DomainEvent } from '../../../../shared/events/DomainEvent.js';

/** TKT-M2-017: stub resolver — логирует каждый world tick. */
export class StubTickLoggerResolver extends AbstractMechanicPlugin {
  constructor() {
    super('stub-tick-logger-resolver');
  }

  onEvent(event: DomainEvent, ctx: MechanicContext): Result<void, AppError> {
    ctx.logger.debug(`tick advanced: ${String(ctx.tick)}`, { type: event.type });
    return ok(undefined);
  }
}
