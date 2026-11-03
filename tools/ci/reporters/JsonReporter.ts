import { canonicalJson } from '../../../src/domain/content/ContentHasher.js';
import { passed, type StageResult, type ValidationStage } from '../types.js';

/** TKT-M4-003: JSON-отчёт по схеме validation-report.json. */
export function reportJson(
  results: readonly StageResult[],
  stageFilter?: readonly ValidationStage[],
): string {
  return canonicalJson({
    stages: results,
    passed: passed(results),
    generatedAtMs: Date.now(),
    ...(stageFilter ? { stageFilter } : {}),
  });
}
