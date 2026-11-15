/**
 * TKT-M5-007: коды ошибок экономики из §8.3 DEV-SPEC-020.
 * Фабрика economyError повторяет контракт makeAppError (AppError) и возвращает frozen-объект.
 */

/** Union из 8 кодов ошибок экономики. */
export type ECON_E =
  | 'ECON_INVARIANT'
  | 'ECON_NODE_UNKNOWN'
  | 'ECON_GOOD_UNKNOWN'
  | 'ECON_RESERVE_CONFLICT'
  | 'ECON_PRICE_CLAMP_VIOLATION'
  | 'ECON_CHAIN_INVALID'
  | 'ECON_CAPACITY_EXCEEDED'
  | 'ECON_CONTRACT_EXPIRED';

export const ECON_E_CODES: readonly ECON_E[] = [
  'ECON_INVARIANT',
  'ECON_NODE_UNKNOWN',
  'ECON_GOOD_UNKNOWN',
  'ECON_RESERVE_CONFLICT',
  'ECON_PRICE_CLAMP_VIOLATION',
  'ECON_CHAIN_INVALID',
  'ECON_CAPACITY_EXCEEDED',
  'ECON_CONTRACT_EXPIRED',
] as const;

/** Объект ошибки экономики в стиле AppError. */
export interface EconomyError {
  readonly code: ECON_E;
  readonly message: string;
  readonly meta?: unknown;
}

/** Создаёт frozen-объект ошибки (как makeAppError, но с метаданными meta вместо cause). */
export function economyError(code: ECON_E, message?: string, meta?: unknown): EconomyError {
  return Object.freeze({ code, message: message ?? code, ...(meta !== undefined ? { meta } : {}) });
}

export function isEconomyError(value: unknown): value is EconomyError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    (ECON_E_CODES as readonly string[]).includes(candidate.code) &&
    typeof candidate.message === 'string'
  );
}
