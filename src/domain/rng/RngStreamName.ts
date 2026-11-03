import type { Brand } from '../brand/Brand.js';

/** TKT-M3-001: branded имя RNG-потока. */
export type RngStreamName = string & Brand<'RngStreamName'> & { readonly __rngStream?: true };

const STREAM_RE = /^rng\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function makeStreamName(value: string): RngStreamName {
  if (!STREAM_RE.test(value)) {
    throw new Error(
      `Invalid RNG stream name: '${value}' (must look like rng.combat.damage)`,
    );
  }
  return value as RngStreamName;
}

export function isStreamName(value: unknown): value is RngStreamName {
  return typeof value === 'string' && STREAM_RE.test(value);
}
