import type { StageResult, ValidationIssue } from '../types.js';
import { validateMechanicDefinition } from '../../../src/domain/mechanics/MechanicDefinition.js';
import { readContentFiles } from './common.js';

/** TKT-M4-008: стадия mechanics — инварианты и уникальные id. */
export function validateMechanics(contentRoot: string): StageResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];
  const bundles = readContentFiles(contentRoot);
  const seenIds = new Set<string>();

  for (const [file, entries] of Object.entries(bundles.mechanic ?? {})) {
    entries.forEach((raw) => {
      const def = raw as { id?: string; priority?: number; stateSchema?: object | null; lifecycle?: { scope?: string; persisted?: boolean }; kind?: string; roleTags?: string[]; validationRules?: { paramsSchema?: object }; params?: unknown };
      const id = def.id ?? `<missing:${file}>`;

      if (seenIds.has(id)) {
        issues.push({ ruleId: 'mechanics/unique-id', severity: 'error', message: `Duplicate mechanic id: ${id}` });
      }
      seenIds.add(id);

      // resolver → stateSchema === null, persisted === false
      if (def.kind === 'resolver' && def.stateSchema !== null && def.stateSchema !== undefined) {
        issues.push({ ruleId: 'mechanics/resolver-state', severity: 'error', message: `${id}: resolver must have stateSchema === null` });
      }
      if (def.kind === 'resolver' && def.lifecycle?.persisted === true) {
        issues.push({ ruleId: 'mechanics/resolver-persisted', severity: 'error', message: `${id}: resolver must not be persisted` });
      }
      // tracker → stateSchema !== null
      if (def.kind === 'tracker' && (def.stateSchema === null || def.stateSchema === undefined)) {
        issues.push({ ruleId: 'mechanics/tracker-state', severity: 'error', message: `${id}: tracker must have stateSchema` });
      }
      // roleTags ≥ 1 доменный тег
      if (!Array.isArray(def.roleTags) || def.roleTags.length < 1) {
        issues.push({ ruleId: 'mechanics/role-tags', severity: 'error', message: `${id}: roleTags must contain at least one tag` });
      }
      // priority — целое
      if (typeof def.priority !== 'number' || !Number.isInteger(def.priority)) {
        issues.push({ ruleId: 'mechanics/priority-integer', severity: 'error', message: `${id}: priority must be an integer` });
      }
      // params валиден по paramsSchema
      const invariants = validateMechanicDefinition(raw);
      if (!invariants.ok) {
        issues.push({ ruleId: 'mechanics/invariants', severity: 'error', message: `${id}: ${invariants.error.message}` });
      }
    });
  }

  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'mechanics', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
