import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type { RngStreamName } from '../../domain/rng/RngStreamName.js';
import type { RngStreamState } from '../../domain/rng/RngStreamState.js';
import { fromSeeds, hex, unhex, xorShift128Plus } from './XorShift128Plus.js';

const RAW_MAX = 4294967295;

/**
 * FNV-1a: детерминированное выведение потока без node:crypto,
 * чтобы движок работал в браузере. Тот же алгоритм ядра xorshift128+.
 */
function hash32(input: string, salt: number): number {
  let h = (0x811c9dc5 ^ salt) >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function deriveStream(masterSeed: string, stream: RngStreamName): RngStreamState {
  const key = `${masterSeed}::${stream}`;
  const words = [0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f].map((salt) =>
    BigInt(hash32(key, salt)),
  );
  const empty = words.every((word) => word === 0n);
  return empty ? fromSeeds(1n, 2n, 3n, 4n) : fromSeeds(words[0], words[1], words[2], words[3]);
}

/**
 * Браузерная реализация IRngService: изолированные потоки, сериализуемое состояние.
 * Отличие от SeededRngService — только способ выведения сида (без sha256).
 */
export class WebRngService implements IRngService {
  private streams = new Map<string, RngStreamState>();

  constructor(private readonly masterSeed: string) {}

  private ensure(stream: RngStreamName): RngStreamState {
    const found = this.streams.get(stream);
    if (found) return found;
    const fresh = deriveStream(this.masterSeed, stream);
    this.streams.set(stream, fresh);
    return fresh;
  }

  private rawWord(stream: RngStreamName): Result<number, AppError> {
    const state = this.ensure(stream);
    const step = xorShift128Plus(state);
    this.streams.set(stream, step.next);
    return ok(step.value);
  }

  nextFloat(stream: RngStreamName): Result<number, AppError> {
    const raw = this.rawWord(stream);
    if (!raw.ok) return raw as Result<number, AppError>;
    return ok(raw.value / (RAW_MAX + 1));
  }

  nextInt(stream: RngStreamName, min: number, max: number): Result<number, AppError> {
    if (min > max) {
      return err(makeAppError('RNG_INVALID_RANGE', `nextInt: min (${min}) > max (${max})`));
    }
    const float = this.nextFloat(stream);
    if (!float.ok) return float as Result<number, AppError>;
    const span = max - min + 1;
    return ok(min + Math.floor(float.value * span));
  }

  pickOne<T>(stream: RngStreamName, items: readonly T[]): Result<T, AppError> {
    if (items.length === 0) {
      return err(makeAppError('RNG_EMPTY_CHOICE_SET', 'pickOne: empty choice set'));
    }
    const float = this.nextFloat(stream);
    if (!float.ok) return float as Result<T, AppError>;
    const index = Math.floor(float.value * items.length);
    return ok(items[Math.min(index, items.length - 1)]);
  }

  shuffle<T>(stream: RngStreamName, items: readonly T[]): Result<readonly T[], AppError> {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const index = this.nextInt(stream, 0, i);
      if (!index.ok) return index as Result<readonly T[], AppError>;
      const j = index.value;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return ok(arr);
  }

  chance(stream: RngStreamName, p: number): Result<boolean, AppError> {
    if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) {
      return err(makeAppError('RNG_INVALID_PROBABILITY', `chance: p must be in [0,1], got ${p}`));
    }
    if (p === 0) return ok(false);
    if (p === 1) return ok(true);
    const float = this.nextFloat(stream);
    if (!float.ok) return float as Result<boolean, AppError>;
    return ok(float.value < p);
  }

  getState(stream: RngStreamName): Result<RngStreamState, AppError> {
    const found = this.streams.get(stream);
    if (!found) {
      return err(
        makeAppError('RNG_STREAM_NOT_INITIALIZED', `Stream not initialized: ${stream}`, { stream }),
      );
    }
    return ok(found);
  }

  restoreState(stream: RngStreamName, state: RngStreamState): Result<void, AppError> {
    this.streams.set(stream, {
      algorithm: 'xor-shift-128-plus',
      s0: hex(unhex(state.s0)),
      s1: hex(unhex(state.s1)),
      s2: hex(unhex(state.s2)),
      s3: hex(unhex(state.s3)),
      callCount: state.callCount,
    });
    return ok(undefined);
  }

  listStreams(): readonly RngStreamName[] {
    return [...this.streams.keys()].sort((a, b) => a.localeCompare(b)) as readonly RngStreamName[];
  }

  serializeAll(): Record<string, RngStreamState> {
    const out: Record<string, RngStreamState> = {};
    for (const key of this.listStreams()) {
      const state = this.streams.get(key);
      if (state) out[key] = state;
    }
    return out;
  }
}
