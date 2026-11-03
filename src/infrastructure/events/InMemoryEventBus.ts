import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IEventBus, EventBusPublishOptions, EventHandler } from '../../domain/events/IEventBus.js';
import type { IEventRegistry } from '../../domain/events/IEventRegistry.js';
import type { EventPayloadValidator } from './EventPayloadValidator.js';
import type { Logger } from '../../shared/logging/Logger.js';
import type {
  DomainEvent,
  EventPublishInput,
} from '../../shared/events/DomainEvent.js';
import {
  EVENT_QUEUE_POLICIES,
  isQueuePolicy,
  type DeliveryPolicy,
} from '../../shared/events/DeliveryPolicy.js';
import type { EventType } from '../../shared/events/EventType.js';

interface Sub {
  readonly priority: number;
  readonly order: number;
  readonly handler: EventHandler;
}

/**
 * TKT-M1-010: in-memory шина событий.
 * - Immediate — доставка подписчикам сразу, с приоритетом и изоляцией;
 * - NextTick / AfterScene / WarningThenImpact — буфер до drainQueue.
 */
export class InMemoryEventBus implements IEventBus {
  private readonly subs = new Map<string, Sub[]>();
  private readonly queues = new Map<DeliveryPolicy, DomainEvent[]>();
  private readonly recorder?: (event: DomainEvent) => void;
  private orderSequence = 0;
  private currentTick = 0;
  private currentMs = 0;

  constructor(
    private readonly registry: IEventRegistry,
    private readonly validator: EventPayloadValidator,
    private readonly logger: Logger = { debug() {}, info() {}, warn() {}, error() {} },
    opts?: { recorder?: (event: DomainEvent) => void; getTick?: () => number; getMs?: () => number },
  ) {
    if (opts?.recorder) this.recorder = opts.recorder;
    this.currentTick = opts?.getTick ? opts.getTick() : 0;
    this.currentMs = opts?.getMs ? opts.getMs() : 0;
  }

  setClockProvider(getTick: () => number, getMs: () => number): void {
    this.currentTick = getTick();
    this.currentMs = getMs();
  }

  publish(event: EventPublishInput, options?: EventBusPublishOptions): Result<void, AppError> {
    const regErr = this.registry.get(event.type);
    if (!regErr.ok) return regErr as Result<void, AppError>;

    const payloadCheck = this.validator.validate(
      event.type,
      event.payload ?? null,
      regErr.value,
    );
    if (!payloadCheck.ok) return payloadCheck;

    const domainEvent: DomainEvent = {
      type: event.type,
      payload: event.payload ?? null,
      emittedAtTick: this.currentTick,
      emittedAtMs: this.currentMs,
      source: event.source ?? 'core',
      correlationId: event.correlationId,
    };

    const policy: DeliveryPolicy = options?.deliveryPolicy ?? 'Immediate';
    if (policy === 'Immediate') {
      this.dispatch(domainEvent);
      return ok(undefined);
    }
    if (!isQueuePolicy(policy)) {
      return err(makeAppError('DOMAIN_DELIVERY_FAILED', `Unknown delivery policy: ${policy}`));
    }
    const queue = this.queues.get(policy) ?? [];
    queue.push(domainEvent);
    this.queues.set(policy, queue);
    return ok(undefined);
  }

  subscribe(type: EventType, handler: EventHandler, priority = 0): () => void {
    const list = this.subs.get(type) ?? [];
    const sub: Sub = { priority, order: this.orderSequence++, handler };
    list.push(sub);
    list.sort((a, b) => b.priority - a.priority || a.order - b.order);
    this.subs.set(type, list);
    return () => {
      const arr = this.subs.get(type);
      if (!arr) return;
      const idx = arr.indexOf(sub);
      if (idx >= 0) arr.splice(idx, 1);
    };
  }

  drainQueue(policy: DeliveryPolicy): readonly DomainEvent[] {
    if (!isQueuePolicy(policy)) return [];
    const queue = this.queues.get(policy) ?? [];
    const drained = [...queue];
    for (const event of drained) this.dispatch(event);
    queue.length = 0;
    return drained;
  }

  peekQueue(policy: DeliveryPolicy): readonly DomainEvent[] {
    return [...(this.queues.get(policy) ?? [])];
  }

  clear(policy?: DeliveryPolicy): void {
    if (policy) {
      this.queues.set(policy, []);
      return;
    }
    for (const p of EVENT_QUEUE_POLICIES) this.queues.set(p, []);
  }

  private dispatch(event: DomainEvent): void {
    const subs = this.subs.get(event.type) ?? [];
    for (const sub of [...subs]) {
      try {
        sub.handler(event);
      } catch (e) {
        this.logger.error(`Handler error for ${event.type}`, {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    this.recorder?.(event);
  }
}
