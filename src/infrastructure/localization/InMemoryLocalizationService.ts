import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { ILocalizationService } from '../../domain/localization/ILocalizationService.js';
import type { Logger } from '../../shared/logging/Logger.js';
import { fallbackChain, interpolate, warnMissing, selectRuForm, selectEnForm } from './_shared.js';

export type LocaleMap = Record<string, Record<string, string>>;

/** TKT-M4-017: in-memory сервис локализации для тестов. */
export class InMemoryLocalizationService implements ILocalizationService {
  private localeValue: string;
  private readonly logger: Logger;

  constructor(
    private readonly locales: LocaleMap,
    locale = 'ru-RU',
    logger?: Logger,
  ) {
    this.localeValue = locale;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
  }

  get locale(): string {
    return this.localeValue;
  }

  supportedLocales(): readonly string[] {
    return Object.keys(this.locales).sort();
  }

  t(key: string, params?: Record<string, string | number>): string {
    for (const loc of fallbackChain(this.localeValue)) {
      const found = this.locales[loc]?.[key];
      if (typeof found === 'string') return interpolate(found, params);
    }
    warnMissing(this.logger, key);
    return key;
  }

  tPlural(key: string, count: number, params?: Record<string, string | number>): string {
    const base = this.localeValue.split('-')[0] === 'ru' ? 'ru' : 'en';
    const form = base === 'ru' ? selectRuForm(count) : selectEnForm(count);
    const pluralKey = `${key}.${form}`;
    for (const loc of fallbackChain(this.localeValue)) {
      const found = this.locales[loc]?.[pluralKey];
      if (typeof found === 'string') return interpolate(found, { ...params, count });
    }
    for (const loc of fallbackChain(this.localeValue)) {
      const found = this.locales[loc]?.[key];
      if (typeof found === 'string') return interpolate(found, { ...params, count });
    }
    warnMissing(this.logger, key);
    return key;
  }

  has(key: string): boolean {
    for (const loc of fallbackChain(this.localeValue)) {
      if (typeof this.locales[loc]?.[key] === 'string') return true;
    }
    return false;
  }

  setLocale(locale: string): Result<void, AppError> {
    if (!Object.keys(this.locales).includes(locale)) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Unsupported locale: ${locale}`, { locale }),
      );
    }
    this.localeValue = locale;
    return ok(undefined);
  }

  reload(): Result<void, AppError> {
    return ok(undefined);
  }
}
