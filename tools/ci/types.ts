/** TKT-M4-002: типы отчётности CI-валидации (§5 DEV-SPEC-008). */
export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly path?: string;
  readonly meta?: Record<string, unknown> | null;
}

export type ValidationStage =
  | 'schemas'
  | 'graph'
  | 'gameplay'
  | 'events'
  | 'mechanics'
  | 'rng-streams'
  | 'determinism'
  | 'contracts';

export const ALL_STAGES: readonly ValidationStage[] = [
  'schemas',
  'graph',
  'gameplay',
  'events',
  'mechanics',
  'rng-streams',
  'determinism',
  'contracts',
];

export interface StageResult {
  readonly stage: ValidationStage;
  readonly passed: boolean;
  readonly issues: readonly ValidationIssue[];
  readonly durationMs?: number | null;
}

export function hasBlockingErrors(results: readonly StageResult[]): boolean {
  return results.some((r) => r.issues.some((i) => i.severity === 'error'));
}

export function passed(results: readonly StageResult[]): boolean {
  return results.every((r) => r.passed) && !hasBlockingErrors(results);
}
