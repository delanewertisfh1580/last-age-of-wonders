import { describe, expect, it } from 'vitest';
import {
  QualityTierController,
  RenderPipeline,
  SceneManager,
  detectInitialTier,
  type SceneKind,
  type SceneLike,
} from '../../src/domain/scene/SceneManager.js';

const makeScene = (kind: SceneKind, log: string[]): SceneLike => ({
  kind,
  enter: () => { log.push(`enter:${kind}`); return { ok: true, value: undefined }; },
  exit: () => { log.push(`exit:${kind}`); },
  update: () => { log.push(`update:${kind}`); },
});

function makeManager(log: string[]) {
  const manager = new SceneManager({ afterSceneEvents: () => log.push('drain') });
  manager.registerDefinition({ kind: 'world-map', allowedTransitions: ['city'], requiredParams: [] });
  manager.registerDefinition({ kind: 'city', allowedTransitions: ['world-map'], requiredParams: ['city'] });
  manager.registerScene(makeScene('world-map', log));
  manager.registerScene(makeScene('city', log));
  return manager;
}

describe('TKT-M8-003: SceneManager', () => {
  it('переход вызывает exit → enter → AfterScene drain', () => {
    const log: string[] = [];
    const manager = makeManager(log);
    expect(manager.transition('world-map').ok).toBe(true);
    expect(manager.transition('city', { city: 'aurum' }).ok).toBe(true);
    expect(log).toEqual(['enter:world-map', 'drain', 'exit:world-map', 'enter:city', 'drain']);
  });

  it('запрещённый переход и отсутствие параметров → ошибки', () => {
    const log: string[] = [];
    const manager = makeManager(log);
    manager.transition('world-map');
    const forbidden = manager.transition('world-map');
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) expect(forbidden.error.code).toBe('SCENE_TRANSITION_FORBIDDEN');
    const missing = manager.transition('city');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('SCENE_MISSING_PARAMS');
  });

  it('update без активной сцены → SCENE_NOT_ACTIVE', () => {
    const manager = makeManager([]);
    const result = manager.update(16);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SCENE_NOT_ACTIVE');
  });
});

describe('TKT-M8-004/005: RenderPipeline и качество', () => {
  it('фиксированный шаг и alpha', () => {
    const pipeline = new RenderPipeline(10, 4);
    let updates = 0;
    const frame = pipeline.tick(25, () => { updates += 1; });
    expect(updates).toBe(2);
    expect(frame.fixedSteps).toBe(2);
    expect(frame.alpha).toBeCloseTo(0.5);
  });

  it('пауза не продвигает симуляцию', () => {
    const pipeline = new RenderPipeline(10);
    pipeline.pause();
    let updates = 0;
    const frame = pipeline.tick(100, () => { updates += 1; });
    expect(updates).toBe(0);
    expect(frame.rendered).toBe(false);
  });

  it('детект тира и деградация', () => {
    expect(detectInitialTier({ kind: 'mobile', gpuScore: 20, maxTextureSize: 1024 })).toBe('low');
    expect(detectInitialTier({ kind: 'desktop', gpuScore: 90, maxTextureSize: 4096 })).toBe('high');
    const tier = new QualityTierController('high');
    expect(tier.adapt(60)).toBe('medium');
    expect(tier.adapt(60)).toBe('low');
  });
});
