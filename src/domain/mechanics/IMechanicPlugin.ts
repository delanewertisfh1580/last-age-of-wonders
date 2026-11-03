import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { MechanicContext } from './MechanicContext.js';
import type { DomainEvent } from '../../shared/events/DomainEvent.js';

/** TKT-M2-012: интерфейс плагина из §5.3 DEV-SPEC-004. */
export interface IMechanicPlugin {
  readonly definitionId: string;

  onEvent(event: DomainEvent, ctx: MechanicContext): Result<void, AppError>;
  onTick(ctx: MechanicContext): Result<void, AppError>;
  onActivate(ctx: MechanicContext): Result<void, AppError>;
  onDeactivate(ctx: MechanicContext): Result<void, AppError>;
}

/** TKT-M2-012: базовый класс — no-op для onTick/onActivate/onDeactivate. */
export abstract class AbstractMechanicPlugin implements IMechanicPlugin {
  readonly definitionId: string;

  constructor(definitionId: string) {
    this.definitionId = definitionId;
  }

  abstract onEvent(event: DomainEvent, ctx: MechanicContext): Result<void, AppError>;

  onTick(_ctx: MechanicContext): Result<void, AppError> {
    return { ok: true, value: undefined };
  }

  onActivate(_ctx: MechanicContext): Result<void, AppError> {
    return { ok: true, value: undefined };
  }

  onDeactivate(_ctx: MechanicContext): Result<void, AppError> {
    return { ok: true, value: undefined };
  }
}
