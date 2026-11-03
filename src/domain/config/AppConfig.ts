import { err, ok, type Result } from '../result/Result.js';
import { makeAppError, type AppError } from '../app-error/AppError.js';

/** TKT-M1-005: конфигурация приложения (скелет). */
export interface AppConfig {
  readonly env: 'development' | 'production' | 'test';
  readonly language: string;
  /** Корень контента относительно проекта. */
  readonly contentRoot: string;
  readonly masterSeed: string;
  readonly tickIntervalMs: number;
  readonly saveSlotsMax: number;
}

export function validateAppConfig(raw: unknown): Result<AppConfig, AppError> {
  const c = raw as Record<string, unknown> | null;
  if (!c) return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'AppConfig must be an object'));

  const env = c.env ?? 'development';
  if (!['development', 'production', 'test'].includes(env as string)) {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', `Invalid env: ${String(env)}`));
  }
  const tickIntervalMs = (c.tickIntervalMs as number) ?? 1000;
  if (typeof tickIntervalMs !== 'number' || !Number.isFinite(tickIntervalMs) || tickIntervalMs <= 0) {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'tickIntervalMs must be a positive number'));
  }
  const saveSlotsMax = (c.saveSlotsMax as number) ?? 3;

  return ok({
    env: env as AppConfig['env'],
    language: (c.language as string) ?? 'en-US',
    contentRoot: (c.contentRoot as string) ?? 'content',
    masterSeed: (c.masterSeed as string) ?? 'nestjs-walking-skeleton',
    tickIntervalMs,
    saveSlotsMax,
  });
}
