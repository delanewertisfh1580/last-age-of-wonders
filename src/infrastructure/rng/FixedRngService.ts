import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type {
  RngStreamName,
} from '../../domain/rng/RngStreamName.js';
import type {
  RngStreamState,
} from '../../domain/rng/RngStreamState.js';

export type FixedValues = Record<string, readonly number[]>;

/** TKT-M3-007: тестовый адаптер с заранее заданными значениями. */
export class FixedRngService implements IRngService {
  private queues: Map<string, readonly number[]>;
  private pointers = new Map<string, number>();
  private readonly states = new Map<string, RngStreamState>();

  constructor(values: FixedValues) {
    this.queues = new Map(Object.entries(values));
  }

  private take(stream: string): Result<number, AppError> {
    const queue = this.queues.get(stream);
    const pointer = this.pointers.get(stream) ?? 0;
    if (!queue || pointer >= queue.length) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `Fixed stream exhausted: ${stream}`, {
          stream,
        }),
      );
    }
    this.pointers.set(stream, pointer + 1);
    return ok(queue[pointer]);
  }

  nextFloat(stream: RngStreamName): Result<number, AppError> {
    return this.take(stream);
  }

  nextInt(stream: RngStreamName, min: number, max: number): Result<number, AppError> {
    if (min > max) {
      return err(makeAppError('RNG_INVALID_RANGE', `nextInt: min (${min}) > max (${max})`));
    }
    const rawResult = this.take(stream);
    if (!rawResult.ok) return rawResult as Result<number, AppError>;
    const span = max - min + 1;
    return ok(min + Math.floor(rawResult.value * span));
  }

  pickOne<T>(stream: RngStreamName, items: readonly T[]): Result<T, AppError> {
    if (items.length === 0) {
      return err(makeAppError('RNG_EMPTY_CHOICE_SET', 'pickOne: empty choice set'));
    }
    const rawResult = this.take(stream);
    if (!rawResult.ok) return rawResult as Result<T, AppError>;
    const index = Math.floor(rawResult.value * items.length);
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
    const rawResult = this.take(stream);
    if (!rawResult.ok) return rawResult as Result<boolean, AppError>;
    return ok(rawResult.value < p);
  }

  getState(stream: RngStreamName): Result<RngStreamState, AppError> {
    const found = this.states.get(stream);
    if (!found) {
      return err(
        makeAppError('RNG_STREAM_NOT_INITIALIZED', `Stream not initialized: ${stream}`),
      );
    }
    return ok(found);
  }

  restoreState(stream: RngStreamName, state: RngStreamState): Result<void, AppError> {
    this.states.set(stream, state);
    return ok(undefined);
  }

  listStreams(): readonly RngStreamName[] {
    return [...this.states.keys()].sort() as readonly RngStreamName[];
  }

  serializeAll(): Record<string, RngStreamState> {
    const out: Record<string, RngStreamState> = {};
    for (const key of this.listStreams()) {
      const state = this.states.get(key);
      if (state) out[key] = state;
    }
    return out;
  }
}
