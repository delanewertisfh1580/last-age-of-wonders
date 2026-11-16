import { describe, expect, it } from 'vitest';
import {
  SHADER_PROFILES,
  ShaderQualityController,
  VisualOverrideManager,
  VisualStateAggregate,
  startTransition,
  stepTransition,
} from '../../src/domain/visual/Visual.js';

describe('TKT-M9-003: ShaderQualityController', () => {
  it('профили уменьшают бюджет частиц от high к low', () => {
    expect(SHADER_PROFILES.high.particleBudget).toBeGreaterThan(SHADER_PROFILES.medium.particleBudget);
    expect(SHADER_PROFILES.medium.particleBudget).toBeGreaterThan(SHADER_PROFILES.low.particleBudget);
    const controller = new ShaderQualityController('high');
    expect(controller.setTier('low').shadows).toBe(false);
  });
});

describe('TKT-M9-004: TransitionInterpolator', () => {
  it('доходит до целевого значения и валидирует длительность', () => {
    const state = startTransition(0, 10, 100);
    expect(state.ok).toBe(true);
    if (!state.ok) return;
    expect(stepTransition(state.value, 50)).toBe(5);
    expect(stepTransition(state.value, 100)).toBe(10);
    const invalid = startTransition(0, 1, 0);
    expect(invalid.ok).toBe(false);
  });
});

describe('TKT-M9-005/006: оверрайды и агрегат', () => {
  it('доминирует наибольшая интенсивность, истечение удаляет', () => {
    const manager = new VisualOverrideManager();
    manager.apply({ id: 'a', source: 'x', tint: '#000', intensity: 0.2, remainingMs: 100 });
    manager.apply({ id: 'b', source: 'y', tint: '#fff', intensity: 0.9, remainingMs: 100 });
    expect(manager.dominant()?.id).toBe('b');
    manager.tick(150);
    expect(manager.active()).toHaveLength(0);
  });

  it('aggregate capture/restore сохраняет состояние', () => {
    const shaders = new ShaderQualityController('high');
    const aggregate = new VisualStateAggregate(shaders, new VisualOverrideManager());
    const state = aggregate.tick(10);
    const fresh = new VisualStateAggregate(new ShaderQualityController('low'), new VisualOverrideManager());
    fresh.restore(state);
    expect(fresh.capture().tier).toBe('high');
    expect(fresh.capture().tick).toBe(state.tick);
  });
});
