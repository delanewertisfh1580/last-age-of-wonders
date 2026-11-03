/**
 * Диагностический код ошибки приложения.
 * Все коды — строковые литералы, уникальны в рамках кодовой базы и
 * используются в тикетах M1–M4 и в содержимом контракта.
 */
export type AppErrorCode =
  // Базовые инфраструктурные ошибки
  | 'INFRA_UNEXPECTED'
  | 'INFRA_CONTENT_NOT_FOUND'
  | 'INFRA_STORAGE_FAILED'
  | 'INFRA_SCHEMA_INVALID'
  // Ошибки событий
  | 'DOMAIN_EVENT_NOT_REGISTERED'
  | 'DOMAIN_INVALID_EVENT_PAYLOAD'
  | 'DOMAIN_DELIVERY_FAILED'
  // Общие доменные
  | 'DOMAIN_INVARIANT_VIOLATION'
  // Ошибки контента
  | 'CONTENT_REGISTRY_MALFORMED'
  | 'CONTENT_SCHEMA_VALIDATION_FAILED'
  | 'CONTENT_DUPLICATE_KIND'
  | 'CONTENT_TOPOLOGICAL_ORDER_FAILED'
  // Ошибки механик
  | 'MECHANIC_NOT_FOUND'
  | 'MECHANIC_STATE_TYPE_MISMATCH'
  | 'MECHANIC_ACTIVATION_FAILED'
  // Ошибки рандома
  | 'RNG_STREAM_NOT_INITIALIZED'
  | 'RNG_INVALID_RANGE'
  | 'RNG_INVALID_PROBABILITY'
  | 'RNG_EMPTY_CHOICE_SET'
  // Ошибки сохранений
  | 'SAVE_LOAD_FAILED'
  | 'SAVE_INVALID_SNAPSHOT'
  | 'SAVE_CONTENT_HASH_MISMATCH'
  | 'SAVE_SLOT_NOT_FOUND'  // Ошибки времени
  | 'CLOCK_PAUSED_WHILE_TICK_REQUESTED'
  | 'CLOCK_INVALID_PHASE'
  ;

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export function makeAppError(code: AppErrorCode, message: string, cause?: unknown): AppError {
  return { code, message, cause };
}

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    Array.isArray(AppErrorCodes) &&
    AppErrorCodes.includes(candidate.code as AppErrorCode) &&
    typeof candidate.message === 'string'
  );
}

export const AppErrorCodes: readonly AppErrorCode[] = [
  'INFRA_UNEXPECTED',
  'INFRA_CONTENT_NOT_FOUND',
  'INFRA_STORAGE_FAILED',
  'INFRA_SCHEMA_INVALID',
  'DOMAIN_EVENT_NOT_REGISTERED',
  'DOMAIN_INVALID_EVENT_PAYLOAD',
  'DOMAIN_DELIVERY_FAILED',
  'DOMAIN_INVARIANT_VIOLATION',
  'CONTENT_REGISTRY_MALFORMED',
  'CONTENT_SCHEMA_VALIDATION_FAILED',
  'CONTENT_DUPLICATE_KIND',
  'CONTENT_TOPOLOGICAL_ORDER_FAILED',
  'MECHANIC_NOT_FOUND',
  'MECHANIC_STATE_TYPE_MISMATCH',
  'MECHANIC_ACTIVATION_FAILED',
  'RNG_STREAM_NOT_INITIALIZED',
  'RNG_INVALID_RANGE',
  'RNG_INVALID_PROBABILITY',
  'RNG_EMPTY_CHOICE_SET',
  'SAVE_LOAD_FAILED',
  'SAVE_INVALID_SNAPSHOT',
  'SAVE_CONTENT_HASH_MISMATCH',
  'SAVE_SLOT_NOT_FOUND',
  'CLOCK_PAUSED_WHILE_TICK_REQUESTED',
  'CLOCK_INVALID_PHASE',
] as const;
