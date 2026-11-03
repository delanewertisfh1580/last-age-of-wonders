import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';

/** TKT-M4-013: контракт сервиса локализации (§5.3 DEV-SPEC-009). */
export interface ILocalizationService {
  readonly locale: string;
  /** Валидированные локали (например ru-RU, en-US). */
  supportedLocales(): readonly string[];

  t(key: string, params?: Record<string, string | number>): string;
  tPlural(key: string, count: number, params?: Record<string, string | number>): string;
  has(key: string): boolean;

  setLocale(locale: string): Result<void, AppError>;
  reload(): Result<void, AppError>;
}
