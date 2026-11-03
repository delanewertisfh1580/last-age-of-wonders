export type Result<T, E = unknown> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T, E = never>(value: T): Result<T, E> {
  return { ok: true, value };
}

/**
 * Создаёт значение Err. T выводится как never, чтобы результат был
 * совместим с любым Result<TX, E> (never присваиваем любому типу).
 */
export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return { ok: false, error };
}

export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return result as Result<U, E>;
}

export function flattenResult<T, E>(result: Result<T, E>): T | E {
  if (result.ok) return result.value;
  return result.error;
}
