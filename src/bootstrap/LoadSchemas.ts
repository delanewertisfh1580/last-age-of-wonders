import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { err, ok, type Result } from '../domain/result/Result.js';
import { makeAppError, type AppError } from '../domain/app-error/AppError.js';

/** Логические имена схем, регистрируемые в AjvSchemaValidator. */
const SCHEMA_FILES: readonly [string, string][] = [
  ['event-definition', 'schemas/event-definition.json'],
  ['mechanic-definition', 'schemas/mechanic-definition.json'],
  ['save-snapshot', 'schemas/save-snapshot.json'],
  ['rng-stream-state', 'schemas/rng-stream-state.json'],
  ['clock-config', 'schemas/clock-config.json'],
  ['locale-file', 'schemas/locale-file.json'],
  ['content-pack', 'schemas/content-pack.json'],
  ['generic-content', 'schemas/content-pack.json'],
];

export type SchemasBag = Record<string, object>;

/** Загрузка схем из content/schemas/. */
export function loadSchemasFromContentRoot(contentRoot: string, dryRun = false): Result<SchemasBag, AppError> {
  if (dryRun) return ok({});
  if (!existsSync(contentRoot)) {
    return err(
      makeAppError('INFRA_CONTENT_NOT_FOUND', `Content root not found: ${contentRoot}`),
    );
  }
  const bag: SchemasBag = {};
  for (const [name, rel] of SCHEMA_FILES) {
    const full = join(contentRoot, rel);
    if (!existsSync(full)) continue;
    try {
      bag[name] = JSON.parse(readFileSync(full, 'utf8')) as object;
    } catch (e) {
      return err(
        makeAppError('INFRA_SCHEMA_INVALID', `Cannot parse schema ${rel}: ${String(e)}`),
      );
    }
  }
  return ok(bag);
}
