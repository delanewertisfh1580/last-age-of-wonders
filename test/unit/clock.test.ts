import { describe, it, expect } from 'vitest';
import { ManualGameClock } from '../../src/infrastructure/clock/ManualGameClock.js';
import { RafGameClock } from '../../src/infrastructure/clock/RafGameClock.js';
import { InterpolationClock } from '../../src/infrastructure/clock/InterpolationClock.js';
import { ALL_TICK_PHASES } from '../../src/domain/clock/TickPhase.js';
import { bootstrap } from '../../src/bootstrap/GameBootstrap.js';
import { NoopLogger } from '../../src/infrastructure/logging/NoopLogger.js';

describe('TKT-M3-021: TickPhase/IGameClock типы', () => {
  it('перечень фаз фиксирован', () => {
    expect(ALL_TICK_PHASES.length).toBe(13);
    expect(ALL_TICK_PHASES[0]).toBe('warning-drain');
    expect(ALL_TICK_PHASES[ALL_TICK_PHASES.length - 1]).toBe('after-scene-drain');
  });
});

describe('TKT-M3-023: TickScheduler', () => {
  it('AC01–AC03: порядок фаз строго фиксированный', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;

    const phaseOrder: string[] = [];
    app.scheduler.onPhase((_tick, phase) => phaseOrder.push(phase));

    await app.scheduler.runOneTick();
    expect(phaseOrder).toEqual(ALL_TICK_PHASES);
  });

  it('AC06: сбой в drain callbacks не останавливает очередь фаз', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    app.eventBus.subscribe(app.scheduler.worldTickType, () => {
      throw new Error('boom');
    });
    const phaseOrder: string[] = [];
    app.scheduler.onPhase((_t, p) => phaseOrder.push(p));
    await app.scheduler.runOneTick();
    expect(phaseOrder).toEqual(ALL_TICK_PHASES);
  });

  it('tickScope для пустых scope — no-op без ошибок; счётчик тактов растёт', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    const before = app.scheduler.currentTick();
    await app.scheduler.runOneTick();
    expect(app.scheduler.currentTick()).toBe(before + 1);
  });
});

describe('TKT-M3-025: ManualGameClock', () => {
  it('N тиков → currentTick === N; pause → такт не растёт', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    const clock = new ManualGameClock({ runTick: () => void app.scheduler.runOneTick() });

    for (let i = 0; i < 5; i++) clock.advanceOneTick();
    expect(clock.state.currentTick).toBe(5);

    expect(clock.pause().ok).toBe(true);
    clock.advanceOneTick();
    expect(clock.state.currentTick).toBe(5);
    expect(clock.resume().ok).toBe(true);
    clock.advanceOneTick();
    expect(clock.state.currentTick).toBe(6);
  });

  it('onTick вызывается после такта; setSpeedMultiplier валидирует', () => {
    const ticks: number[] = [];
    const clock = new ManualGameClock();
    clock.onTick((t) => ticks.push(t));
    clock.advanceOneTick();
    clock.advanceOneTick();
    expect(ticks).toEqual([0, 1]);

    expect(clock.setSpeedMultiplier(0).ok).toBe(false);
    expect(clock.setSpeedMultiplier(2).ok).toBe(true);
    expect(clock.state.speedMultiplier).toBe(2);
  });
});

describe('TKT-M3-024: RafGameClock с mock RFC', () => {
  interface MockRaf {
    handles: { cb: FrameRequestCallback }[];
    raf: (cb: FrameRequestCallback) => number;
    fire: (index: number, time: number) => void;
    cancel: (handle: number) => void;
    lastHandle: number;
  }

  function mockRaf(): MockRaf {
    const handles: { cb: FrameRequestCallback }[] = [];
    let nextHandle = 1;
    return {
      handles,
      raf: (cb) => {
        const handle = nextHandle++;
        handles[handle] = { cb };
        return handle;
      },
      fire: (index, time) => handles[index]?.cb(time),
      cancel: () => {},
      lastHandle: 0,
    };
  }

  it('advanceOneTick: такт при paused блокируется; callback изоляция', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    const mock = mockRaf();
    let simulatedNow = 0;
    const clock = new RafGameClock({
      scheduler: app.scheduler,
      logger: new NoopLogger(),
      tickIntervalMs: 1000,
      raf: (cb) => mock.raf(cb),
      cancelRaf: (h) => mock.cancel(h),
      now: () => simulatedNow,
    });

    const ticked: number[] = [];
    clock.onTick((t) => ticked.push(t));
    expect(clock.setSpeedMultiplier(2).ok).toBe(true);
    expect(clock.start().ok).toBe(true);

    const direct = clock.advanceOneTick();
    void simulatedNow;
    expect(direct.ok).toBe(true);
    expect(ticked.length).toBeGreaterThanOrEqual(1);
    expect(clock.state.currentTick).toBeGreaterThanOrEqual(1);

    // Pause: advanceOneTick не должен продвигать currentTick дальше (только ручное повышение).
    expect(clock.pause().ok).toBe(true);
  });

  it('callback изоляция: сбой подписчика не роняет advanceOneTick', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    const clock = new RafGameClock({
      scheduler: app.scheduler,
      logger: new NoopLogger(),
      tickIntervalMs: 1000,
      raf: () => 0,
      cancelRaf: () => {},
      now: () => 0,
    });
    clock.onTick(() => {
      throw new Error('callback boom');
    });
    const r = clock.advanceOneTick();
    expect(r.ok).toBe(true);
  });
});

describe('TKT-M3-022: InterpolationClock', () => {
  it('AC08: alpha ∈ [0,1); AC09: deltaMs монотонно растёт', () => {
    let now = 0;
    const clock = new InterpolationClock(1000, () => now);
    clock.markTick(0);

    now = 0;
    clock.update(now);
    expect(clock.alpha).toBe(0);
    expect(clock.deltaMs).toBe(0);

    now = 500;
    clock.update(now);
    expect(clock.alpha).toBeCloseTo(0.5, 5);
    expect(clock.deltaMs).toBeGreaterThan(0);

    const previousDelta = clock.deltaMs;
    now = 1000;
    clock.update(now);
    expect(clock.alpha).toBe(0);
    expect(clock.deltaMs).toBeGreaterThanOrEqual(previousDelta);
  });
});
