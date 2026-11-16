import { describe, expect, it } from 'vitest';
import { VfxRuntimeService, planVfx, type VfxDefinition } from '../../src/domain/vfx/Vfx.js';

const definitions: readonly VfxDefinition[] = [
  { id: 'big', trigger: 'hit', tags: [], budgetCost: 50, durationMs: 100, maxInstances: 1 },
  { id: 'small', trigger: 'hit', tags: ['cheap'], budgetCost: 10, durationMs: 100, maxInstances: 1 },
];

describe('TKT-M13-002: VfxPlanner', () => {
  it('укладывается в бюджет и уважает disabled tags', () => {
    const plan = planVfx(definitions, 'hit', { particleBudget: 30 });
    expect(plan.ok && plan.value.map((d) => d.id)).toEqual(['small']);
    const none = planVfx(definitions, 'hit', { particleBudget: 100, disabledTags: ['cheap'] });
    expect(none.ok && none.value.map((d) => d.id)).toEqual(['big']);
  });
});

describe('TKT-M13-003/005: VfxRuntimeService', () => {
  it('лимиты, истечение и restore', () => {
    const runtime = new VfxRuntimeService();
    runtime.register(definitions[1]);
    expect(runtime.spawn('small', 0, 30).ok).toBe(true);
    expect(runtime.spawn('small', 0, 30).ok).toBe(false);
    const snapshot = runtime.capture();
    expect(runtime.tick(150)).toHaveLength(1);
    expect(runtime.activeList()).toHaveLength(0);
    runtime.restore(snapshot);
    expect(runtime.activeList()).toHaveLength(1);
  });
});
