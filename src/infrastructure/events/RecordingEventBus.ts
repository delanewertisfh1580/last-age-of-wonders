import type { Result } from '../../domain/result/Result.js';
import type { IEventBus, EventBusPublishOptions } from '../../domain/events/IEventBus.js';
import type { DomainEvent, EventPublishInput } from '../../shared/events/DomainEvent.js';
import type { DeliveryPolicy } from '../../shared/events/DeliveryPolicy.js';
import type { EventType } from '../../shared/events/EventType.js';
import type { AppError } from '../../domain/app-error/AppError.js';

/** TKT-M1-014: записывающий декоратор шины — используется в тестах. */
export class RecordingEventBus implements IEventBus {
  readonly recorded: DomainEvent[] = [];
  readonly errors: AppError[] = [];

  constructor(private readonly inner: IEventBus) {}

  publish(event: EventPublishInput, options?: EventBusPublishOptions): Result<void, AppError> {
    const result = this.inner.publish(event, options);
    if (!result.ok) this.errors.push(result.error);
    return result;
  }

  record(event: DomainEvent): void {
    this.recorded.push(event);
  }

  subscribe(type: EventType, handler: (e: DomainEvent) => void, priority?: number): () => void {
    return this.inner.subscribe(type, handler, priority);
  }

  drainQueue(policy: DeliveryPolicy): readonly DomainEvent[] {
    return this.inner.drainQueue(policy);
  }

  peekQueue(policy: DeliveryPolicy): readonly DomainEvent[] {
    return this.inner.peekQueue(policy);
  }

  clear(policy?: DeliveryPolicy): void {
    this.inner.clear(policy);
  }
}

/** Вспомогательная функция-хук: записывает события в recorder. */
export function recordingHookFor(recorder: RecordingEventBus): (event: DomainEvent) => void {
  return (event) => recorder.record(event);
}
