import { describe, it, expect } from 'vitest';
import { xorShift128Plus, fromSeeds, hex, unhex } from '../../src/infrastructure/rng/XorShift128Plus.js';
import { deriveStream } from '../../src/infrastructure/rng/StreamDerivation.js';
import { SeededRngService } from '../../src/infrastructure/rng/SeededRngService.js';
import { FixedRngService } from '../../src/infrastructure/rng/FixedRngService.js';
import { makeStreamName, isStreamName } from '../../src/domain/rng/RngStreamName.js';
import { ALL_STREAM_NAMES } from '../../src/shared/rng/stream-names.js';

const damage = makeStreamName('rng.combat.damage');
const duel = makeStreamName('rng.combat.duel');
const market = makeStreamName('rng.economy.market');

describe('TKT-M3-001: RngStreamName', () => {
  it('валидация имён потоков', () => {
    expect(makeStreamName('rng.combat.damage')).toBe('rng.combat.damage');
    expect(() => makeStreamName('combat.damage')).toThrow();
    expect(() => makeStreamName('rng.Combat.Damage')).toThrow();
    expect(() => makeStreamName('rng.combat')).toThrow();
    expect(isStreamName('rng.party.morale')).toBe(true);
    expect(isStreamName('not.a.stream')).toBe(false);
  });

  it('каталог ≥ 40 потоков без дублей', () => {
    expect(ALL_STREAM_NAMES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(ALL_STREAM_NAMES).size).toBe(ALL_STREAM_NAMES.length);
  });
});

describe('TKT-M3-004: StreamDerivation', () => {
  it('детерминизм и независимость потоков', () => {
    const a1 = deriveStream('abc', damage);
    const a2 = deriveStream('abc', damage);
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2));

    const b = deriveStream('abc', duel);
    expect(JSON.stringify(a1)).not.toBe(JSON.stringify(b));

    // Меняется и от masterSeed.
    const c = deriveStream('other-seed', damage);
    expect(JSON.stringify(a1)).not.toBe(JSON.stringify(c));
  });
});

describe('TKT-M3-003: XorShift128Plus', () => {
  it('операция детерминирована, callCount растёт', () => {
    const state = fromSeeds(1n, 2n, 3n, 4n);
    const stepA = xorShift128Plus(state);
    const stepB = xorShift128Plus(state);
    expect(stepA.value).toBe(stepB.value);
    expect(stepA.value).toBeGreaterThanOrEqual(0);
    expect(stepA.value).toBeLessThanOrEqual(4294967295);
    expect(stepA.next.callCount).toBe(state.callCount + 1);
  });

  it('hex/unhex roundtrip', () => {
    expect(unhex(hex(0xdeadbeefn))).toBe(0xdeadbeefn);
  });

  it('плейбек первого шага нестабилен только при отличии state', () => {
    const first = xorShift128Plus(fromSeeds(0x1n, 0x2n, 0x3n, 0x4n));
    const replay = xorShift128Plus(fromSeeds(0x1n, 0x2n, 0x3n, 0x4n));
    expect(replay.value).toBe(first.value);
  });
});

describe('TKT-M3-005/006: SeededRngService', () => {
  it('AC01: одинаковый seed → одинаковая последовательность', () => {
    const a = new SeededRngService('seed-a');
    const b = new SeededRngService('seed-a');
    for (let i = 0; i < 100; i++) {
      const va = a.nextFloat(damage);
      const vb = b.nextFloat(damage);
      if (va.ok && vb.ok) expect(va.value).toBe(vb.value);
      else expect(va.ok).toBe(vb.ok);
    }
  });

  it('AC02: изоляция потоков', () => {
    const a = new SeededRngService('iso');
    for (let i = 0; i < 100; i++) {
      const r = a.nextFloat(damage);
      if (!r.ok) throw new Error('rng failed');
    }
    const clean = new SeededRngService('iso');
    const cleanResult = clean.nextFloat(duel);
    const afterResult = a.nextFloat(duel);
    expect(afterResult.ok && cleanResult.ok ? afterResult.value : NaN).toBe(
      cleanResult.ok ? cleanResult.value : NaN,
    );
  });

  it('AC03: min > max → Err', () => {
    const rng = new SeededRngService('s');
    const r = rng.nextInt(damage, 10, 5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('RNG_INVALID_RANGE');
  });

  it('AC04/AC08: недопустимая вероятность → Err; p=1 → true; p=0 → false', () => {
    const rng = new SeededRngService('s');
    expect(rng.chance(damage, -0.1).ok).toBe(false);
    expect(rng.chance(damage, 1.5).ok).toBe(false);
    expect(rng.chance(damage, 1)).toEqual({ ok: true, value: true });
    expect(rng.chance(damage, 0)).toEqual({ ok: true, value: false });
  });

  it('AC05: pickOne([]) → Err(RNG_EMPTY_CHOICE_SET)', () => {
    const rng = new SeededRngService('s');
    const r = rng.pickOne(damage, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('RNG_EMPTY_CHOICE_SET');
  });

  it('nextInt включает границы; shuffle — перестановка без мутации', () => {
    const rng = new SeededRngService('bounds');
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const r = rng.nextInt(damage, 1, 6);
      if (r.ok) values.add(r.value);
    }
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }

    const items = [1, 2, 3, 4, 5];
    const shuffled = rng.shuffle(market, items);
    expect(shuffled.ok).toBe(true);
    if (shuffled.ok) {
      expect([...shuffled.value].sort((a, b) => a - b)).toEqual(items);
      expect(items).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it('AC06/AC07: serializeAll → restoreState → идентичное продолжение', () => {
    const rng = new SeededRngService('persist');
    for (let i = 0; i < 10; i++) {
      const r = rng.nextFloat(damage);
      if (!r.ok) throw new Error('rng failed');
    }
    const dumped = rng.serializeAll();

    const restored = new SeededRngService('other-seed');
    expect(restored.getState(damage).ok).toBe(false);
    for (const [name, state] of Object.entries(dumped)) {
      expect(restored.restoreState(makeStreamName(name), state).ok).toBe(true);
    }
    const restoredState = restored.getState(damage);
    expect(restoredState.ok).toBe(true);
    if (restoredState.ok) {
      expect(JSON.stringify(restoredState.value)).toBe(JSON.stringify(dumped[damage]));
    }
    expect(JSON.stringify(restored.serializeAll())).toBe(JSON.stringify(dumped));
  });

  it('getState неинициализированного потока → Err', () => {
    const rng = new SeededRngService('q');
    const r = rng.getState(damage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('RNG_STREAM_NOT_INITIALIZED');
  });

  it('listStreams отсортирован', () => {
    const rng = new SeededRngService('list');
    rng.nextFloat(damage);
    rng.nextFloat(duel);
    const listed = rng.listStreams();
    expect(listed).toEqual([...listed].sort((a, b) => String(a).localeCompare(String(b))));
  });
});

describe('TKT-M3-007: FixedRngService', () => {
  it('выдаёт заданные значения; исчерпание → Err(DOMAIN_INVARIANT_VIOLATION)', () => {
    const rng = new FixedRngService({ [damage]: [0, 0.25, 0.5] });
    expect(rng.nextFloat(damage)).toEqual({ ok: true, value: 0 });
    expect(rng.nextFloat(damage)).toEqual({ ok: true, value: 0.25 });
    expect(rng.nextFloat(damage)).toEqual({ ok: true, value: 0.5 });
    const exhausted = rng.nextFloat(damage);
    expect(exhausted.ok).toBe(false);
    if (!exhausted.ok) expect(exhausted.error.code).toBe('DOMAIN_INVARIANT_VIOLATION');
  });

  it('nextInt/pickOne/shuffle на fixed-значениях', () => {
    const rng = new FixedRngService({ [damage]: [0.999, 0.999, 0.1, 0.1, 0.2, 0.3, 0.4, 0.5] });
    expect(rng.nextInt(damage, 1, 6)).toEqual({ ok: true, value: 6 });
    expect(rng.pickOne(damage, ['a', 'b'])).toEqual({ ok: true, value: 'b' });
    const shuffled = rng.shuffle(damage, [1, 2, 3]);
    expect(shuffled.ok).toBe(true);
    if (shuffled.ok) {
      expect([...shuffled.value].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    }
  });
});
