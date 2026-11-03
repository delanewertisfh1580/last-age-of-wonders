import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { DomainEvent, EventPublishInput } from '../../shared/events/DomainEvent.js';
import type { DeliveryPolicy } from '../../shared/events/DeliveryPolicy.js';
import type { EventType } from '../../shared/events/EventType.js';

export interface EventBusPublishOptions {
  readonly deliveryPolicy?: DeliveryPolicy;
  readonly priority?: number;
}

export type EventHandler = (event: DomainEvent) => void;

/** TKT-M1-010: контракт шины событий. */
export interface IEventBus {
  publish(event: EventPublishInput, options?: EventBusPublishOptions): Result<void, AppError>;

  subscribe(
    type: EventType,
    handler: EventHandler,
    priority?: number,
  ): () => void;

  /** Доставить buffered-события выбранной политики. Возвращаются обработанные события. */
  drainQueue(policy: DeliveryPolicy): readonly DomainEvent[];

  /** Посмотреть очередь, не вынимая события (используется Save). */
  peekQueue(policy: DeliveryPolicy): readonly DomainEvent[];

  clear(feature?: DeliveryPolicy): void;
}
