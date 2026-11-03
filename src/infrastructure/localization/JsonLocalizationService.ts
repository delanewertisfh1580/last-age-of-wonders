import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { ILocalizationService } from '../../domain/localization/ILocalizationService.js';
import type { Logger } from '../../shared/logging/Logger.js';
import { fallbackChain, interpolate, warnMissing, selectRuForm, selectEnForm } from './_shared.js';

export type LocaleEntries = Record<string, string>;

export interface JsonLocalizationOptions {
  readonly contentRoot: string;
  readonly locale?: string;
  readonly logger: Logger;
  readonly env?: 'development' | 'production' | 'test';
}

/**
 * TKT-M4-014/015: JSON-сервис локализации с fallback-цепочкой.
 * Загружает en.json/ru.json из content/locales/.
 */
export class JsonLocalizationService implements ILocalizationService {
  private readonly packs = new Map<string, LocaleEntries>();
  private localeValue: string;

  constructor(private readonly o: JsonLocalizationOptions) {
    this.localeValue = o.locale ?? 'ru-RU';
    this.loadAll();
  }

  get locale(): string {
    return this.localeValue;
  }

  supportedLocales(): readonly string[] {
    return [...this.packs.keys()]
      .filter((k) => k.includes('-'))
      .sort();
  }

  private loadAll(): void {
    for (const name of ['en-US', 'ru-RU', 'en', 'ru']) {
      const mapping: Record<string, string> = { 'en-US': 'en.json', 'ru-RU': 'ru.json', en: 'en.json', ru: 'ru.json' };
      const file = mapping[name];
      if (!file) continue;
      try {
        const raw = JSON.parse(readFileSync(join(this.o.contentRoot, 'locales', file), 'utf8')) as Record<string, unknown>;
        const translations = (raw.translations ?? {}) as Record<string, string>;
        const entries: LocaleEntries = {};
        for (const [k, v] of Object.entries(translations)) {
          if (typeof v === 'string') entries[k] = v;
        }
        this.packs.set(name, entries);
      } catch {
        // Отсутствующая локаль не является ошибкой — fallback доберёт.
      }
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    for (const loc of fallbackChain(this.localeValue)) {
      const pack = this.packs.get(loc);
      const found = pack?.[key];
      if (typeof found === 'string') return interpolate(found, params);
    }
    warnMissing(this.o.logger, key);
    return key;
  }

  tPlural(key: string, count: number, params?: Record<string, string | number>): string {
    const base = this.localeValue.split('-')[0] === 'ru' ? 'ru' : 'en';
    const form =
      base === 'ru'
        ? selectRuForm(count)
        : selectEnForm(count);
    const pluralKey = `${key}.${form}`;
    for (const loc of fallbackChain(this.localeValue)) {
      const pack = this.packs.get(loc);
      const found = pack?.[pluralKey];
      if (typeof found === 'string') return interpolate(found, { ...params, count });
    }
    // Fallback на плоский ключ.
    for (const loc of fallbackChain(this.localeValue)) {
      const pack = this.packs.get(loc);
      const found = pack?.[key];
      if (typeof found === 'string') return interpolate(found, { ...params, count });
    }
    warnMissing(this.o.logger, key);
    return key;
  }

  has(key: string): boolean {
    for (const loc of fallbackChain(this.localeValue)) {
      const pack = this.packs.get(loc);
      if (typeof pack?.[key] === 'string') return true;
    }
    return false;
  }

  setLocale(locale: string): Result<void, AppError> {
    const supported = this.packs.has(locale) || this.packs.has(locale.split('-')[0]);
    if (!supported) {
      return err(
        makeAppError('INFRA_CONTENT_NOT_FOUND', `Unsupported locale: ${locale}`, { locale }),
      );
    }
    this.localeValue = locale;
    return ok(undefined);
  }

  reload(): Result<void, AppError> {
    // TKT-M4-014: reload доступен только в dev.
    if ((this.o.env ?? 'development') === 'production') {
      return err(makeAppError('DOMAIN_INVARIANT_VIOLATION', 'Reload is dev only', { reason: 'dev_only' }));
    }
    this.packs.clear();
    this.loadAll();
    return ok(undefined);
  }
}
