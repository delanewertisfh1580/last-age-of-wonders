import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type {
  IRngService,
} from '../../domain/rng/IRngService.js';
import type {
  RngStreamName,
} from '../../domain/rng/RngStreamName.js';
import type {
  RngStreamState,
} from '../../domain/rng/RngStreamState.js';
import { xorShift128Plus, unhex, hex } from './XorShift128Plus.js';
import { deriveStream } from './StreamDerivation.js';

const RAW_MAX = 4294967295;

/** TKT-M3-005: сидированный RNG с изолированными потоками. */
export class SeededRngService implements IRngService {
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
    const rawResult = this.rawWord(stream);
    if (!rawResult.ok) return rawResult as Result<number, AppError>;
    return ok(rawResult.value / (RAW_MAX + 1));
  }

  nextInt(stream: RngStreamName, min: number, max: number): Result<number, AppError> {
    if (min > max) {
      return err(makeAppError('RNG_INVALID_RANGE', `nextInt: min (${min}) > max (${max})`));
    }
    const floatResult = this.nextFloat(stream);
    if (!floatResult.ok) return floatResult as Result<number, AppError>;
    const span = max - min + 1;
    return ok(min + Math.floor(floatResult.value * span));
  }

  pickOne<T>(stream: RngStreamName, items: readonly T[]): Result<T, AppError> {
    if (items.length === 0) {
      return err(makeAppError('RNG_EMPTY_CHOICE_SET', 'pickOne: empty choice set'));
    }
    const floatResult = this.nextFloat(stream);
    if (!floatResult.ok) return floatResult as Result<T, AppError>;
    const index = Math.floor(floatResult.value * items.length);
    return ok(items[Math.min(index, items.length - 1)]);
  }

  shuffle<T>(stream: RngStreamName, items: readonly T[]): Result<readonly T[], AppError> {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const indexResult = this.nextInt(stream, 0, i);
      if (!indexResult.ok) return indexResult as Result<readonly T[], AppError>;
      const j = indexResult.value;
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
    const floatResult = this.nextFloat(stream);
    if (!floatResult.ok) return floatResult as Result<boolean, AppError>;
    return ok(floatResult.value < p);
  }

  getState(stream: RngStreamName): Result<RngStreamState, AppError> {
    const found = this.streams.get(stream);
    if (!found) {
      return err(
        makeAppError('RNG_STREAM_NOT_INITIALIZED', `Stream not initialized: ${stream}`, {
          stream,
        }),
      );
    }
    return ok(found);
  }

  restoreState(stream: RngStreamName, state: RngStreamState): Result<void, AppError> {
    // TKT-M3-006: restore не продвигает поток.
    const normalized: RngStreamState = {
      algorithm: 'xor-shift-128-plus',
      s0: hex(unhex(state.s0)),
      s1: hex(unhex(state.s1)),
      s2: hex(unhex(state.s2)),
      s3: hex(unhex(state.s3)),
      callCount: state.callCount,
    };
    this.streams.set(stream, normalized);
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
