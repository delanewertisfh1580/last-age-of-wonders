import type { Brand } from '../brand/Brand.js';

/** TKT-M4-013: branded ключ локализации. */
export type LocalizationKey = string & Brand<'LocalizationKey'> & { readonly __locKey?: true };

const KEY_RE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;

export function makeLocalizationKey(value: string): LocalizationKey {
  if (!KEY_RE.test(value)) {
    throw new Error(`Invalid localization key: '${value}'`);
  }
  return value as LocalizationKey;
}

export function isLocalizationKey(value: unknown): value is LocalizationKey {
  return typeof value === 'string' && KEY_RE.test(value);
}
