import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { MechanicDefinition } from './MechanicDefinition.js';
import type { IEventBus } from '../events/IEventBus.js';
import type { IRngService } from '../rng/IRngService.js';
import type { Logger } from '../../shared/logging/Logger.js';
import type { EventPublishInput } from '../../shared/events/DomainEvent.js';
import type { EventType } from '../../shared/events/EventType.js';

/** TKT-M2-011: MechanicContext из §5.2 DEV-SPEC-004. */
export interface MechanicContext {
  readonly mechanic: MechanicDefinition;
  readonly eventBus: IEventBus;
  readonly rng: IRngService;
  readonly logger: Logger;
  readonly tick: number;
  emit(type: string, payload: unknown): Result<void, AppError>;
  emitRaw(input: EventPublishInput): Result<void, AppError>;
  getState<T>(): T | null;
  setState<T>(state: T): Result<void, AppError>;
}

export interface MechanicContextOptions {
  readonly mechanic: MechanicDefinition;
  readonly eventBus: IEventBus;
  readonly rng: IRngService;
  readonly logger: Logger;
  readonly tick: number;
  getState: () => unknown;
  setState: (state: unknown) => Result<void, AppError>;
}

/** TKT-M2-011: фабрика контекста — обёртки emit/setState над шиной и runtime state. */
export function createMechanicContext(opts: MechanicContextOptions): MechanicContext {
  const { mechanic, eventBus, rng, logger, tick, getState, setState } = opts;
  return {
    mechanic,
    eventBus,
    rng,
    logger,
    tick,
    emit(type, payload): Result<void, AppError> {
      return eventBus.publish({ type: type as EventType, payload, source: 'mechanic' });
    },
    emitRaw(input): Result<void, AppError> {
      return eventBus.publish({ ...input, source: input.source ?? 'mechanic' });
    },
    getState<T>(): T | null {
      return getState() as T | null;
    },
    setState<T>(state: T): Result<void, AppError> {
      return setState(state);
    },
  };
}
