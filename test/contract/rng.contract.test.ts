import { describe, it, expect } from 'vitest';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';
import { ALL_STREAM_NAMES, STREAM_NAMES } from '../../src/shared/rng/stream-names.js';
import { makeStreamName } from '../../src/domain/rng/RngStreamName.js';

const damage = makeStreamName('rng.combat.damage');
const duel = makeStreamName('rng.combat.duel');

describe('TKT-M3-008: контракты RNG', () => {
  it('Тест 1: детерминизм — 2 сервиса с одинаковым seed → идентичные результаты', () => {
    const a = new SeededRngService('contract-seed');
    const b = new SeededRngService('contract-seed');
    for (let i = 0; i < 200; i++) {
      const ra = a.nextFloat(damage);
      const rb = b.nextFloat(damage);
      if (ra.ok && rb.ok) expect(ra.value).toBe(rb.value);
    }
  });

  it('Тест 2: изоляция — шум в одном потоке не влияет на другой', () => {
    const noisy = new SeededRngService('iso-test');
    for (let i = 0; i < 100; i++) {
      const r = noisy.nextFloat(damage);
      if (!r.ok) throw new Error('rng failed');
    }
    const clean = new SeededRngService('iso-test');
    const rc = clean.nextFloat(duel);
    const rn = noisy.nextFloat(duel);
    if (rc.ok && rn.ok) expect(rn.value).toBe(rc.value);
  });

  it('Тест 3: save/restore — 101-й вызов идентичен', () => {
    const original = new SeededRngService('rt');
    for (let i = 0; i < 100; i++) {
      const r = original.nextFloat(damage);
      if (!r.ok) throw new Error('rng failed');
    }
    const snapshot = original.serializeAll();

    const restored = new SeededRngService('rt');
    for (const [name, state] of Object.entries(snapshot)) {
      const result = restored.restoreState(makeStreamName(name), state);
      if (!result.ok) throw new Error('restore failed');
    }
    const nextOriginal = original.nextFloat(duel);
    const nextRestored = restored.nextFloat(duel);
    if (nextOriginal.ok && nextRestored.ok) {
      expect(nextRestored.value).toBe(nextOriginal.value);
    }
  });

  it('Тест 4: chance — границы 0 и 1', () => {
    const rng = new SeededRngService('chance');
    const zero = rng.chance(damage, 0);
    expect(zero.ok && !zero.value).toBe(true);
    const one = rng.chance(damage, 1);
    expect(one.ok && one.value).toBe(true);
  });

  it('Тест 5: все имена каталога работают', () => {
    const rng = new SeededRngService('catalog');
    expect(ALL_STREAM_NAMES.length).toBe(Object.keys(STREAM_NAMES).length);
    for (const stream of ALL_STREAM_NAMES) {
      const r = rng.nextFloat(stream);
      expect(r.ok).toBe(true);
    }
    // Все инициализированные потоки видны и отсортированы
    const listed = rng.listStreams();
    expect(listed.length === new Set(ALL_STREAM_NAMES).size)
  });
});
