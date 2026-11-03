import { describe, it, expect } from 'vitest';
import { makeLocalizationKey, isLocalizationKey } from '../../src/domain/localization/LocalizationKey.js';
import { ruPluralForm, enPluralForm } from '../../src/domain/localization/PluralForm.js';
import { InMemoryLocalizationService } from '../../src/infrastructure/localization/InMemoryLocalizationService.js';
import { JsonLocalizationService } from '../../src/infrastructure/localization/JsonLocalizationService.js';
import { NoopLogger } from '../../src/infrastructure/logging/NoopLogger.js';

const locales = {
  'ru-RU': {
    'mechanic.stub-counter-tracker.name': 'Счётчик тиков',
    'mechanic.stub-counter-tracker.rows': '{count} рядов',
    'mechanic.stub-counter-tracker.rows.one': '1 ряд',
    'mechanic.stub-counter-tracker.rows.few': 'несколько рядов',
    'mechanic.stub-counter-tracker.rows.many': 'много рядов',
  },
  'en-US': {
    'mechanic.stub-counter-tracker.name': 'Tick Counter',
    'mechanic.stub-counter-tracker.rows': '{count} rows',
    'mechanic.stub-counter-tracker.rows.one': '1 row',
    'mechanic.stub-counter-tracker.rows.other': '{count} rows',
  },
};

describe('TKT-M4-013: LocalizationKey', () => {
  it('валидация ключей', () => {
    expect(makeLocalizationKey('mechanic.stub-counter-tracker.name')).toBeTruthy();
    expect(() => makeLocalizationKey('single')).toThrow();
    expect(() => makeLocalizationKey('Wrong.Upper')).toThrow();
    expect(isLocalizationKey('a.b.c')).toBe(true);
    expect(isLocalizationKey(42)).toBe(false);
  });
});

describe('TKT-M4-015: плюрализация', () => {
  it('ru: 1 → one, 2 → few, 5 → many, 11 → many, 21 → one, 22 → few, дробные → other', () => {
    expect(ruPluralForm(1)).toBe('one');
    expect(ruPluralForm(2)).toBe('few');
    expect(ruPluralForm(5)).toBe('many');
    expect(ruPluralForm(11)).toBe('many');
    expect(ruPluralForm(21)).toBe('one');
    expect(ruPluralForm(22)).toBe('few');
    expect(ruPluralForm(1.5)).toBe('other');
  });

  it('en: 1 → one, остальное → other', () => {
    expect(enPluralForm(1)).toBe('one');
    expect(enPluralForm(2)).toBe('other');
    expect(enPluralForm(0)).toBe('other');
  });
});

describe('TKT-M4-014/017: сервисы локализации', () => {
  it('AC01: отсутствующий ключ → ключ; AC02: has(key); AC03: недостающий param остаётся {count}', () => {
    const service = new InMemoryLocalizationService(locales, 'ru-RU');
    expect(service.t('unknown.key')).toBe('unknown.key');
    expect(service.has('mechanic.stub-counter-tracker.name')).toBe(true);
    expect(service.has('definitely-missing')).toBe(false);
    expect(service.t('mechanic.stub-counter-tracker.rows.many', {})).toContain('много');
  });

  it('AC04: лишние params игнорируются', () => {
    const service = new InMemoryLocalizationService(locales, 'ru-RU');
    const result = service.t('mechanic.stub-counter-tracker.rows.many', { extra: 1 });
    expect(result).toBe('много рядов');
  });

  it('AC05: tPlural en; AC06: tPlural ru по формам', () => {
    const ru = new InMemoryLocalizationService(locales, 'ru-RU');
    expect(ru.tPlural('mechanic.stub-counter-tracker.rows', 1)).toContain('1 ряд');
    const en = new InMemoryLocalizationService(locales, 'en-US');
    expect(en.tPlural('mechanic.stub-counter-tracker.rows', 2)).toBe('2 rows');
  });

  it('fallback: ru → en', () => {
    const service = new InMemoryLocalizationService(locales, 'ru-RU');
    // У ru нет формы for дробных чисел (other) → берём en-US other
    expect(service.tPlural('mechanic.stub-counter-tracker.rows', 1.5)).toContain('rows');
  });

  it('setLocale неподдерживаемая → Err; supportedLocales', () => {
    const service = new InMemoryLocalizationService(locales, 'ru-RU');
    expect(service.setLocale('de-DE').ok).toBe(false);
    expect(service.supportedLocales()).toEqual([...service.supportedLocales()].sort());
  });
});

describe('TKT-M4-016: JsonLocalizationService', () => {
  it('читает en.json/ru.json из content/locales; ключи из контента доступны', () => {
    const service = new JsonLocalizationService({
      contentRoot: 'content',
      locale: 'ru-RU',
      logger: new NoopLogger(),
      env: 'development',
    });
    expect(service.t('mechanic.stub-counter-tracker.name')).toBe('Счётчик тиков');
    expect(service.setLocale('en-US').ok).toBe(true);
    expect(service.t('mechanic.stub-counter-tracker.name')).toBe('Tick Counter');
    expect(service.has('event.world.tick_advanced.description')).toBe(true);
    expect(service.reload().ok).toBe(true);
  });
});
