import { ok, type Result } from '../../../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../../../domain/app-error/AppError.js';
import { AbstractMechanicPlugin } from '../../../../domain/mechanics/IMechanicPlugin.js';
import type { MechanicContext } from '../../../../domain/mechanics/MechanicContext.js';
import type { DomainEvent } from '../../../../shared/events/DomainEvent.js';

/** TKT-M2-017: stub resolver, считающий combat.started событий в памяти. */
export class StubEventCounterResolver extends AbstractMechanicPlugin {
  combatEventCount = 0;

  constructor() {
    super('stub-event-counter-resolver');
  }

  onEvent(event: DomainEvent, _ctx: MechanicContext): Result<void, AppError> {
    if (String(event.type) === 'combat.started') {
      this.combatEventCount += 1;
    }
    return ok(undefined);
  }

  throwOnNext = false;

  onTick(_ctx: MechanicContext): Result<void, AppError> {
    if (this.throwOnNext) {
      this.throwOnNext = false;
      throw makeAppError('DOMAIN_DELIVERY_FAILED', 'intentional stub failure');
    }
    return ok(undefined);
  }
}
