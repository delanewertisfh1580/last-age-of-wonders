import { createHash } from 'node:crypto';
import type { RngStreamState } from '../../domain/rng/RngStreamState.js';
import type { RngStreamName } from '../../domain/rng/RngStreamName.js';
import { fromSeeds } from './XorShift128Plus.js';

/**
 * TKT-M3-004: вывод начального состояния потока из masterSeed.
 * SHA-256(masterSeed + ':' + streamName) → первые 16 байт → 4 x uint32 → state.
 */
export function deriveStream(masterSeed: string, streamName: RngStreamName): RngStreamState {
  const digest = createHash('sha256')
    .update(`${masterSeed}:${streamName}`, 'utf8')
    .digest();

  const words: bigint[] = [];
  for (let i = 0; i < 4; i++) {
    let word = 0n;
    for (let b = 0; b < 4; b++) {
      word = (word << 8n) | BigInt(digest[i * 4 + b]);
    }
    words.push(word & 0xffffffffn);
  }
  return fromSeeds(words[0], words[1], words[2], words[3]);
}
