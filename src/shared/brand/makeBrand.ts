import type { Brand } from '../../domain/brand/Brand.js';

export function makeBrand<const K extends string>(key: K): Brand<K> {
  if (!key) throw new Error('Brand key must not be empty.');
  return key as Brand<K>;
}

export function asBrand<const K extends string>(value: unknown, key: K): Brand<K> {
  if (value !== key) throw new Error('Value does not match brand key.');
  return value as Brand<K>;
}
