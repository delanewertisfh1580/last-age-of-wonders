import type { StageResult, ValidationIssue } from '../types.js';
import { CrossReferenceValidator } from '../../../src/infrastructure/content/CrossReferenceValidator.js';
import type { IContentRegistry } from '../../../src/domain/content/IContentRegistry.js';

/** TKT-M4-005: стадия graph — валидация перекрёстных ссылок. */
export function validateGraph(contentRoot: string, registry: IContentRegistry): StageResult {
  const start = Date.now();
  const validator = new CrossReferenceValidator();
  validator.loadConfig(contentRoot);
  const result = validator.validate(registry);
  const issues: ValidationIssue[] = [];
  if (!result.ok) {
    const meta = result.error.cause as { issues?: string[] } | undefined;
    if (meta && Array.isArray(meta.issues)) {
      for (const entry of meta.issues) {
        issues.push({
          ruleId: `graph/broken-ref`,
          severity: 'error',
          message: String(entry),
        });
      }
      if (issues.length === 0) {
        issues.push({ ruleId: 'graph/load', severity: 'error', message: result.error.message });
      }
    } else {
      issues.push({ ruleId: 'graph/load', severity: 'error', message: result.error.message });
    }
  }
  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'graph', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
