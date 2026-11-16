import { describe, expect, it } from 'vitest';
import { SliceRunner, runSlice, validateStepOrder } from '../../src/app/slice/SliceRunner.js';
import { SLICE_SEAMS, adaptSeamTopic, validateSeamTopics } from '../../src/app/slice/Seams.js';

describe('TKT-M34-001: швы', () => {
  it('все 6 канонических топиков принимаются', () => {
    expect(SLICE_SEAMS).toHaveLength(6);
    for (const seam of SLICE_SEAMS) {
      expect(adaptSeamTopic(seam.canonical)).toBe(seam.canonical);
    }
  });

  it('устаревшее имя cataclysm.activated → SLICE_SEAM_MISSING', () => {
    const issues = validateSeamTopics(['cataclysm.activated']);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('SLICE_SEAM_MISSING');
    expect(adaptSeamTopic('cataclysm.activated')).toBe('cataclysm.started');
  });
});

describe('TKT-M34-002: порядок шагов', () => {
  it('отчёт содержит все 10 шагов', () => {
    const result = runSlice({ seed: 'slice-seed', mode: 'desktop' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps).toHaveLength(10);
    expect(result.value.steps.map((step) => step.id)).toEqual([
      'prologue', 'trade', 'sea-battle', 'party-duel', 'cataclysm',
      'transformation', 'narrative', 'captain', 'epilogue', 'meta',
    ]);
    expect(result.value.passed).toBe(true);
  });

  it('нарушенный порядок → SLICE_ORDER_VIOLATION', () => {
    const result = validateStepOrder(['trade', 'prologue']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('SLICE_ORDER_VIOLATION');
  });
});

describe('TKT-M34-004: контрольные точки', () => {
  it('cp-3 save → load → продолжение даёт тот же финальный хеш', () => {
    const first = new SliceRunner({ seed: 'slice-seed', mode: 'desktop' });
    while (first.currentStepIndex() < 5) expect(first.runNext().ok).toBe(true);
    const checkpoint = first.registry.get('cp-3');
    expect(checkpoint).toBeDefined();
    if (!checkpoint) return;
    expect(first.runAll().ok).toBe(true);
    const continuousHash = first.currentHash();

    const second = new SliceRunner({ seed: 'slice-seed', mode: 'desktop' });
    second.registry.save('cp-3', checkpoint.stepIndex, checkpoint.state, checkpoint.rng);
    expect(second.restoreCheckpoint('cp-3').ok).toBe(true);
    expect(second.runAll().ok).toBe(true);
    expect(second.currentHash()).toBe(continuousHash);
  });

  it('повреждённый снимок → SLICE_HASH_MISMATCH', () => {
    const runner = new SliceRunner({ seed: 'slice-seed', mode: 'desktop' });
    while (runner.currentStepIndex() < 5) runner.runNext();
    const checkpoint = runner.registry.get('cp-3');
    if (!checkpoint) throw new Error('missing cp-3');
    const saved = runner.registry.save('cp-3', checkpoint.stepIndex, checkpoint.state, checkpoint.rng);
    (saved.state as { captain: { age: number } }).captain.age = 99;
    const restored = runner.restoreCheckpoint('cp-3');
    expect(restored.ok).toBe(false);
    if (!restored.ok) expect(restored.error.code).toBe('SLICE_HASH_MISMATCH');
  });
});

describe('TKT-M34-006/007: бюджет и golden run', () => {
  it('mobile-бюджет проходит, degraded и non-degraded хеши совпадают', () => {
    const desktop = runSlice({ seed: 'budget-seed', mode: 'desktop' });
    const mobile = runSlice({ seed: 'budget-seed', mode: 'mobile', maxTickMs: 25, maxSaveBytes: 2 * 1024 * 1024 });
    expect(desktop.ok && mobile.ok).toBe(true);
    if (!desktop.ok || !mobile.ok) return;
    expect(mobile.value.metrics.maxTickMs).toBeLessThanOrEqual(25);
    expect(mobile.value.metrics.saveBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(mobile.value.hashes).toEqual(desktop.value.hashes);
    expect(mobile.value.passed).toBe(true);
  });

  it('два прогона с одним seed → одинаковые хеши и события', () => {
    const a = runSlice({ seed: 'golden-seed', mode: 'desktop' });
    const b = runSlice({ seed: 'golden-seed', mode: 'desktop' });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.hashes).toEqual(b.value.hashes);
    expect(a.value.events).toEqual(b.value.events);
  });
});
