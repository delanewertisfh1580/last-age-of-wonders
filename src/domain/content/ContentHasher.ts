import { createHash } from 'node:crypto';
import type { ContentEntry } from './IContentRegistry.js';

/**
 * TKT-M2-007: канонизация и SHA-256 хеш контента.
 * Детерминированный JSON (рекурсивная сортировка ключей), сортировка по (kind, id).
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export function hashEntries(entries: readonly ContentEntry[]): string {
  const sorted = [...entries].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );
  const payload = sorted.map((e) => ({
    kind: e.kind,
    id: e.id,
    packId: e.packId,
    content: e.content,
  }));
  return sha256Hex(canonicalJson(payload));
}

export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}
