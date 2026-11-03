import type { RngStreamState } from '../../domain/rng/RngStreamState.js';

/**
 * TKT-M3-003: чистый xorshift128+ на 32-битных словах.
 * Только целочисленная арифметика (BigUint-слова mod 2^32), никакого Math.random.
 */
export function xorShift128Plus(state: RngStreamState): {
  value: number;
  next: RngStreamState;
} {
  const s0 = unhex(state.s0);
  const s1 = unhex(state.s1);
  const s2 = unhex(state.s2);
  const s3 = unhex(state.s3);

  const t = (s0 ^ ((s0 << 11n) & 0xffffffffn)) & 0xffffffffn;
  const n0 = s1;
  const n1 = s2;
  const n2 = s3;
  const n3 = ((s3 ^ (s3 >> 19n) ^ t ^ (t >> 8n)) & 0xffffffffn);

  return {
    value: Number(n3),
    next: {
      algorithm: 'xor-shift-128-plus',
      s0: hex(n0),
      s1: hex(n1),
      s2: hex(n2),
      s3: hex(n3),
      callCount: state.callCount + 1,
    },
  };
}

export function hex(v: bigint): string {
  return (v & 0xffffffffn).toString(16);
}

export function unhex(s: string): bigint {
  return BigInt(`0x${s.replace(/^0x/, '')}`) & 0xffffffffn;
}

/** TKT-M3-003: построение состояния из seed-ов (hex-слова). */
export function fromSeeds(s0: bigint, s1: bigint, s2: bigint, s3: bigint): RngStreamState {
  return {
    algorithm: 'xor-shift-128-plus',
    s0: hex(s0),
    s1: hex(s1),
    s2: hex(s2),
    s3: hex(s3),
    callCount: 0,
  };
}

/** TKT-M3-003: сериализация state (bigints уже хранятся как hex-строки). */
export function serialize(state: RngStreamState): RngStreamState {
  return { ...state, s0: hex(unhex(state.s0)), s1: hex(unhex(state.s1)), s2: hex(unhex(state.s2)), s3: hex(unhex(state.s3)) };
}

/** TKT-M3-003: десериализация (hex-строки → bigints обратно в hex). */
export function deserialize(state: RngStreamState): RngStreamState {
  return serialize(state);
}
