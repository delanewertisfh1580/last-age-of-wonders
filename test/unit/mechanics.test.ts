import { describe, it, expect } from 'vitest';
import { validateMechanicDefinition } from '../../src/domain/mechanics/MechanicDefinition.js';
import { MechanicRegistry } from '../../src/infrastructure/mechanics/MechanicRegistry.js';
import { StateSchemaValidator } from '../../src/infrastructure/mechanics/StateSchemaValidator.js';
import { AbstractMechanicPlugin } from '../../src/domain/mechanics/IMechanicPlugin.js';
import { StubCounterTracker } from '../../src/infrastructure/mechanics/plugins/stub/StubCounterTracker.js';
import { InMemoryEventRegistry } from '../../src/infrastructure/events/InMemoryEventRegistry.js';
import { makeEventType } from '../../src/shared/events/EventType.js';
import { ok, type Result } from '../../src/domain/result/Result.js';
import type { AppError } from '../../src/domain/app-error/AppError.js';
import { bootstrap, type GameApp } from '../../src/bootstrap/GameBootstrap.js';
import type { MechanicDefinition } from '../../src/domain/mechanics/MechanicDefinition.js';
import type { MechanicContext } from '../../src/domain/mechanics/MechanicContext.js';
import type { DomainEvent } from '../../src/shared/events/DomainEvent.js';

const tickType = makeEventType('world.tick_advanced');
const combatType = makeEventType('combat.started');

function baseDef(overrides: Partial<MechanicDefinition>): MechanicDefinition {
  return {
    id: 'test-tracker',
    kind: 'tracker',
    factionTags: [],
    branchTags: [],
    shipClassTags: [],
    facetTags: [],
    roleTags: ['stub'],
    params: {},
    consumes: ['world.tick_advanced'],
    emits: [],
    stateSchema: { type: 'object', required: ['count'], properties: { count: { type: 'integer' } }, additionalProperties: false },
    counterplayTags: [],
    validationRules: { paramsSchema: { type: 'object' } },
    priority: 0,
    lifecycle: { scope: 'world', persisted: true },
    ...overrides,
  };
}

const counterSchema = {
  type: 'object',
  required: ['count'],
  properties: { count: { type: 'integer' } },
  additionalProperties: false,
};

describe('TKT-M2-010: validateMechanicDefinition (INV-01..05)', () => {
  it('валидная механика проходит', () => {
    const r = validateMechanicDefinition(baseDef({}));
    expect(r.ok).toBe(true);
  });

  it('AC01: resolver со stateSchema → Err', () => {
    const r = validateMechanicDefinition(
      baseDef({ id: 'r1', kind: 'resolver', stateSchema: { type: 'object' } } as Partial<MechanicDefinition> as MechanicDefinition),
    );
    expect(r.ok).toBe(false);
  });

  it('AC02: resolver с persisted:true → Err', () => {
    const r = validateMechanicDefinition(
      baseDef({ id: 'r2', kind: 'resolver', stateSchema: null, lifecycle: { scope: 'world', persisted: true } }),
    );
    expect(r.ok).toBe(false);
  });

  it('AC03: tracker без stateSchema → Err', () => {
    const r = validateMechanicDefinition(
      baseDef({ id: 't1', kind: 'tracker', stateSchema: null }),
    );
    expect(r.ok).toBe(false);
  });

  it('INV-04: незарегистрированное событие → Err при eventRegistryHas', () => {
    const r = validateMechanicDefinition(baseDef({}), {
      eventRegistryHas: () => false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DOMAIN_EVENT_NOT_REGISTERED');
  });

  it('INV-03: пустые roleTags → Err', () => {
    const r = validateMechanicDefinition(baseDef({ roleTags: [] }));
    expect(r.ok).toBe(false);
  });
});

describe('TKT-M2-013: MechanicRegistry', () => {
  function makeRegistry() {
    const reg = new InMemoryEventRegistry();
    reg.register({ type: tickType, source: 'core', payloadSchema: null });
    reg.register({ type: combatType, source: 'core', payloadSchema: null });
    return new MechanicRegistry({ eventRegistryHas: (t) => reg.has(t as never) });
  }

  it('AC03: валидная регистрация → Ok, get/list работают', () => {
    const registry = makeRegistry();
    const plugin = new StubCounterTracker();
    const def = baseDef({ id: 'stub-counter-tracker' });
    expect(registry.register(plugin, def).ok).toBe(true);
    expect(registry.get('stub-counter-tracker').ok).toBe(true);
    expect(registry.list()).toHaveLength(1);
    expect(registry.listByScope('world')).toHaveLength(1);
  });

  it('AC02: mismatch definitionId → Err', () => {
    const registry = makeRegistry();
    const wrongPlugin = new (class extends AbstractMechanicPlugin {
      constructor() {
        super('wrong-id');
      }
      onEvent(): Result<void, AppError> {
        return ok(undefined);
      }
    })();
    const r = registry.register(wrongPlugin, baseDef({}));
    expect(r.ok).toBe(false);
  });

  it('дубликат id → Err', () => {
    const registry = makeRegistry();
    registry.register(new StubCounterTracker(), baseDef({ id: 'stub-counter-tracker' }));
    const r = registry.register(new StubCounterTracker(), baseDef({ id: 'stub-counter-tracker' }));
    expect(r.ok).toBe(false);
  });
});

describe('TKT-M2-014: StateSchemaValidator', () => {
  it('AC08: валидный state → Ok; AC09: невалидный → Err', () => {
    const v = new StateSchemaValidator();
    v.register('m1', counterSchema);
    expect(v.validate('m1', { count: 5 }).ok).toBe(true);
    const bad = v.validate('m1', { count: 'five' });
    expect(bad.ok).toBe(false);
  });
});

describe('TKT-M2-015/016: MechanicRuntime', () => {
  it('AC04: priority 100 первой; AC05: tie-break по id', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app: GameApp = boot.value;

    const calls: string[] = [];
    const pluginA = new (class extends AbstractMechanicPlugin {
      constructor() {
        super('aa-lower-priority');
      }
      onEvent(_e: DomainEvent, _c: MechanicContext): Result<void, AppError> {
        calls.push('aa');
        return ok(undefined);
      }
    })();
    const pluginB = new (class extends AbstractMechanicPlugin {
      constructor() {
        super('bb-higher-priority');
      }
      onEvent(_e: DomainEvent, _c: MechanicContext): Result<void, AppError> {
        calls.push('bb');
        return ok(undefined);
      }
    })();

    expect(app.mechanicRegistry.register(pluginA, baseDef({ id: 'aa-lower-priority', priority: 10 })).ok).toBe(true);
    expect(app.mechanicRegistry.register(pluginB, baseDef({ id: 'bb-higher-priority', priority: 100 })).ok).toBe(true);

    // Только активные механики получают события.
    expect(app.runtime.activate('aa-lower-priority').ok).toBe(true);
    expect(app.runtime.activate('bb-higher-priority').ok).toBe(true);

    app.runtime.dispatchEvent({ type: tickType, payload: { tick: 1 }, emittedAtTick: 1, emittedAtMs: 0, source: 'core' });
    expect(calls).toEqual(['bb', 'aa']);
  });

  it('M2 демо в миниатюре: dispatchEvent → counter +1, getState видит state, runOneTick вызывает onTick', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    expect(app.runtime.activate('stub-counter-tracker').ok).toBe(true);

    app.runtime.dispatchEvent({ type: tickType, payload: {}, emittedAtTick: 0, emittedAtMs: 0, source: 'core' });
    const afterDispatch = app.runtime.getState('stub-counter-tracker');
    expect(afterDispatch.ok).toBe(true);
    if (afterDispatch.ok) {
      expect((afterDispatch.value as { count: number }).count).toBe(1);
    }

    // невалидный initialState → Err, state не изменён
    const invalidActivate = app.runtime.activate('stub-counter-tracker', { count: 'no' });
    expect(invalidActivate.ok).toBe(false);
    const stateAfterInvalid = app.runtime.getState('stub-counter-tracker');
    expect(stateAfterInvalid.ok).toBe(true);
    if (stateAfterInvalid.ok) {
      expect((stateAfterInvalid.value as { count: number }).count).toBe(1);
    }

    await app.scheduler.runOneTick();
    const afterTick = app.runtime.getState('stub-counter-tracker');
    expect(afterTick.ok).toBe(true);
    if (afterTick.ok) {
      expect((afterTick.value as { count: number }).count).toBe(2);
    }
  });

  it('TKT-M3-019: capture/restore runtime state', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    app.runtime.activate('stub-counter-tracker');
    for (let i = 0; i < 3; i++) {
      app.runtime.dispatchEvent({ type: tickType, payload: {}, emittedAtTick: i, emittedAtMs: 0, source: 'core' });
    }
    const captured = app.runtime.captureRuntimeState();
    expect((captured as { states: Record<string, { count: number }> }).states['stub-counter-tracker'].count).toBe(3);

    // Новая сессия: restore
    const freshBoot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!freshBoot.ok) throw new Error('bootstrap failed');
    const fresh = freshBoot.value;
    expect(fresh.runtime.restoreRuntimeState(captured).ok).toBe(true);
    const restored = fresh.runtime.getState('stub-counter-tracker');
    expect(restored.ok).toBe(true);
    if (restored.ok) {
      expect((restored.value as { count: number }).count).toBe(3);
    }
  });

  it('деактивация механики — onTick больше не вызывается, но state остаётся', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const app = boot.value;
    app.runtime.activate('stub-counter-tracker');
    expect(app.runtime.deactivate('stub-counter-tracker').ok).toBe(true);
    const before = app.runtime.getState('stub-counter-tracker');
    expect(before.ok).toBe(true);
    await app.scheduler.runOneTick();
    const after = app.runtime.getState('stub-counter-tracker');
    expect(after.ok).toBe(true);
    if (after.ok && before.ok) {
      expect(JSON.stringify(after.value)).toBe(JSON.stringify(before.value));
    }
  });

  it('getState неизвестной механики → Err(MECHANIC_NOT_FOUND)', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const result = boot.value.runtime.getState('no-such-mechanic');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MECHANIC_NOT_FOUND');
  });
});
