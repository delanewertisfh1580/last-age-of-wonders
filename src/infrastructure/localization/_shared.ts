import type { Logger } from '../../shared/logging/Logger.js';

/** Цепочка fallback: ru-RU → ru → en → en-US. */
export function fallbackChain(locale: string): readonly string[] {
  const chain: string[] = [locale];
  const base = locale.split('-')[0];
  if (base && !chain.includes(base)) chain.push(base);
  if (!chain.includes('en')) chain.push('en');
  if (!chain.includes('en-US')) chain.push('en-US');
  // Дедупликация с сохранением порядка.
  return [...new Set(chain)];
}

/** Интерполяция {param} — отсутствующие параметры остаются как {param}. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

/** Предупреждение при отсутствующем ключе (AC08). */
export function warnMissing(logger: Logger, key: string): void {
  logger.warn(`Localization key not found: ${key}`, { key });
}

/** Выбор формы плюрализации для ru (one/few/many при целых, other при дробных). */
export function selectRuForm(count: number): 'one' | 'few' | 'many' | 'other' {
  if (!Number.isInteger(count)) return 'other';
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

/** Выбор формы для en (AC05: count !== 1 → other). */
export function selectEnForm(count: number): 'one' | 'other' {
  return count === 1 ? 'one' : 'other';
}
