import { describe, it, expect } from 'vitest';
import { makeEventType } from '../../src/shared/events/EventType.js';
import { InMemoryEventRegistry } from '../../src/infrastructure/events/InMemoryEventRegistry.js';
import { EventPayloadValidator } from '../../src/infrastructure/events/EventPayloadValidator.js';
import { InMemoryEventBus } from '../../src/infrastructure/events/InMemoryEventBus.js';
import { RecordingEventBus } from '../../src/infrastructure/events/RecordingEventBus.js';
import { NoopLogger } from '../../src/infrastructure/logging/NoopLogger.js';
import type { DomainEvent } from '../../src/shared/events/DomainEvent.js';

const tick = makeEventType('world.tick_advanced');
const readiness = makeEventType('world.scene_changed');

function makeBus(): InMemoryEventBus {
  const registry = new InMemoryEventRegistry();
  registry.register({ type: tick, source: 'core', payloadSchema: null });
  registry.register({ type: readiness, source: 'core', payloadSchema: null });
  return new InMemoryEventBus(registry, new EventPayloadValidator(), new NoopLogger());
}

describe('TKT-M1-010: InMemoryEventBus', () => {
  it('публикация незарегистрированного события → Err', () => {
    const bus = makeBus();
    const result = bus.publish({ type: makeEventType('unknown.type.event') as typeof tick, payload: null });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DOMAIN_EVENT_NOT_REGISTERED');
  });

  it('Invalid payload → Err(DOMAIN_INVALID_EVENT_PAYLOAD)', () => {
    const registry = new InMemoryEventRegistry();
    registry.register({
      type: tick,
      source: 'core',
      payloadSchema: { type: 'object', required: ['tick'], properties: { tick: { type: 'number' } }, additionalProperties: true },
    });
    const bus = new InMemoryEventBus(registry, new EventPayloadValidator(), new NoopLogger());

    const bad = bus.publish({ type: tick, payload: { tick: 'not-a-number' } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('DOMAIN_INVALID_EVENT_PAYLOAD');

    const good = bus.publish({ type: tick, payload: { tick: 1 } });
    expect(good.ok).toBe(true);
  });

  it('Immediate: подписчики вызываются по priority убыванию; tie-break по порядку подписки', () => {
    const bus = makeBus();
    const calls: string[] = [];
    bus.subscribe(tick, () => calls.push('low'), 0);
    bus.subscribe(tick, () => calls.push('high'), 100);
    bus.publish({ type: tick, payload: { tick: 1 } });
    expect(calls).toEqual(['high', 'low']);
  });

  it('Очереди: NextTick не доставляется до drainQueue', () => {
    const bus = makeBus();
    const seen: number[] = [];
    bus.subscribe(tick, (e) => seen.push(e.emittedAtTick));
    bus.publish({ type: tick, payload: { tick: 1 } }, { deliveryPolicy: 'NextTick' });
    expect(seen).toHaveLength(0);
    bus.publish({ type: tick, payload: { tick: 2 } }, { deliveryPolicy: 'NextTick' });
    const drained = bus.drainQueue('NextTick');
    expect(drained).toHaveLength(2);
    expect(seen).toHaveLength(2);
    expect(bus.peekQueue('NextTick')).toHaveLength(0);
  });

  it('Изоляция: исключение в handler' + 'A не мешает handler-B', () => {
    const bus = makeBus();
    const calls: string[] = [];
    bus.subscribe(tick, () => {
      throw new Error('boom');
    }, 100);
    bus.subscribe(tick, () => calls.push('b'), 0);
    const result = bus.publish({ type: tick, payload: { tick: 42 } });
    expect(result.ok).toBe(true);
    expect(calls).toEqual(['b']);
  });
});

describe('TKT-M1-014: RecordingEventBus', () => {
  it('записывает события и ошибки публикации', () => {
    const bus = makeBus();
    const recorder = new RecordingEventBus(bus);
    const publish = bus.publish({ type: tick, payload: {} });
    if (!publish.ok) throw new Error('publish must succeed');
    // Ручная запись через хук-провайдер (bus → recorder.record)
    const domainEvent: DomainEvent = {
      type: tick,
      payload: {},
      emittedAtTick: 0,
      emittedAtMs: 0,
      source: 'core',
    };
    recorder.record(domainEvent);
    const failed = recorder.publish({ type: makeEventType('not.registered.type') as typeof tick, payload: null });
    expect(failed.ok).toBe(false);
    expect(recorder.recorded).toHaveLength(1);
    expect(recorder.errors).toHaveLength(1);
  });
});
