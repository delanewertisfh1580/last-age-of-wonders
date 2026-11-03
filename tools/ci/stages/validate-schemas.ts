import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StageResult, ValidationIssue } from '../types.js';
import type { AjvSchemaValidator } from '../../../src/infrastructure/content/AjvSchemaValidator.js';
import { loadSchemasFromContentRoot } from '../../../src/bootstrap/LoadSchemas.js';
import { readContentFiles } from './common.js';

const KIND_SCHEMAS: Record<string, string> = {
  event: 'event-definition',
  mechanic: 'mechanic-definition',
};

/** TKT-M4-004: стадия schemas — AJV-валидация всех файлов контента. */
export function validateSchemas(contentRoot: string, validator: AjvSchemaValidator): StageResult {
  const issues: ValidationIssue[] = [];
  const start = Date.now();

  if (!existsSync(contentRoot)) {
    return { stage: 'schemas', passed: false, issues: [{ ruleId: 'schema/content-root', severity: 'error', message: `content root not found: ${contentRoot}` }], durationMs: Date.now() - start };
  }
  const schemas = loadSchemasFromContentRoot(contentRoot);
  if (!schemas.ok) {
    return { stage: 'schemas', passed: false, issues: [{ ruleId: 'schema/load', severity: 'error', message: schemas.error.message }], durationMs: Date.now() - start };
  }
  for (const [name, schema] of Object.entries(schemas.value)) {
    validator.registerSchema(name, schema);
  }

  const bundles = readContentFiles(contentRoot);
  for (const [kind, files] of Object.entries(bundles)) {
    const schemaName = KIND_SCHEMAS[kind] ?? 'generic-content';
    for (const [file, entries] of Object.entries(files)) {
      entries.forEach((entry, index) => {
        const result = validator.validate(schemaName, entry);
        if (!result.ok) {
          issues.push({
            ruleId: `schema/${kind}`,
            severity: 'error',
            message: `${join(kind, file)}[${index}]: ${result.error.message}`,
            path: `${kind}/${file}#${index}`,
            meta: (result.error.cause as Record<string, unknown> | undefined) ?? null,
          });
        }
      });
    }
  }
  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'schemas', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
