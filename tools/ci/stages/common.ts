import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isContentKind, type ContentKind } from '../../../src/domain/content/ContentKind.js';

const SKIP_DIRS = new Set(['schemas', 'locales', 'cross-refs.json']);

/** Читает контент-файлы keyed по kind, пропуская schemas/locales/cross-refs. */
export function readContentFiles(contentRoot: string): Record<ContentKind, Record<string, unknown[]>> {
  const byKind: Partial<Record<ContentKind, Record<string, unknown[]>>> = {};
  for (const dirName of readdirSync(contentRoot)) {
    const full = join(contentRoot, dirName);
    if (SKIP_DIRS.has(dirName) || !statSync(full).isDirectory()) continue;
    const kind = dirName === 'events' ? 'event' : dirName === 'mechanics' ? 'mechanic' : dirName;
    if (!isContentKind(kind)) continue;
    const mapping: Record<string, unknown[]> = {};
    for (const fileName of readdirSync(full)) {
      if (!fileName.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(readFileSync(join(full, fileName), 'utf8')) as unknown;
        mapping[fileName] = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        mapping[fileName] = [];
      }
    }
    byKind[kind as ContentKind] = mapping;
  }
  return byKind as Record<ContentKind, Record<string, unknown[]>>;
}
