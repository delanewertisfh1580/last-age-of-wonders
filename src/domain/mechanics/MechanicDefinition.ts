import { err, ok, type Result } from '../result/Result.js';
import { makeAppError, type AppError } from '../app-error/AppError.js';

export type MechanicScope =
  | 'ship'
  | 'companion'
  | 'party'
  | 'combat'
  | 'captain'
  | 'narrative'
  | 'visual'
  | 'cataclysm'
  | 'economy'
  | 'epilogue'
  | 'world';

/** TKT-M2-010: MechanicDefinition из §5.1 DEV-SPEC-004. */
export interface MechanicDefinition {
  readonly id: string;
  readonly kind: 'resolver' | 'tracker';
  readonly factionTags: readonly string[];
  readonly branchTags: readonly string[];
  readonly shipClassTags: readonly string[];
  readonly facetTags: readonly string[];
  readonly roleTags: readonly string[];
  readonly params: Record<string, unknown>;
  readonly consumes: readonly string[];
  readonly emits: readonly string[];
  readonly stateSchema: object | null;
  readonly counterplayTags: readonly string[];
  readonly validationRules: {
    readonly paramsSchema: object;
  };
  readonly priority: number;
  readonly lifecycle: {
    readonly scope: MechanicScope;
    readonly persisted: boolean;
  };
}

export interface MechanicInvariantOptions {
  readonly eventRegistryHas?: (type: string) => boolean;
}

/** TKT-M2-010: валидация инвариантов INV-01..INV-05. */
export function validateMechanicDefinition(
  def: unknown,
  opts?: MechanicInvariantOptions,
): Result<void, AppError> {
  const d = def as Record<string, unknown> | null;
  if (!d || typeof d.id !== 'string' || d.id === '') {
    return err(makeAppError('DOMAIN_INVARIANT_VIOLATION', 'MechanicDefinition requires `id`'));
  }
  if (d.kind !== 'resolver' && d.kind !== 'tracker') {
    return err(
      makeAppError('DOMAIN_INVARIANT_VIOLATION', `Mechanic ${d.id}: invalid kind ${String(d.kind)}`),
    );
  }
  // INV-01: resolver ⇒ stateSchema === null и persisted === false
  if (d.kind === 'resolver') {
    if (d.stateSchema !== null && d.stateSchema !== undefined) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `INV-01: resolver ${d.id} must have stateSchema === null`),
      );
    }
    const persisted = d.lifecycle as { persisted?: boolean } | undefined;
    if (persisted?.persisted === true) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `INV-01: resolver ${d.id} must not be persisted`),
      );
    }
  }
  // INV-02: tracker ⇒ stateSchema !== null
  if (d.kind === 'tracker' && (d.stateSchema === null || d.stateSchema === undefined)) {
    return err(
      makeAppError('DOMAIN_INVARIANT_VIOLATION', `INV-02: tracker ${d.id} must have stateSchema`),
    );
  }
  // INV-03: roleTags.length >= 1
  if (!Array.isArray(d.roleTags) || d.roleTags.length < 1) {
    return err(makeAppError('DOMAIN_INVARIANT_VIOLATION', `INV-03: ${d.id} requires roleTags >= 1`));
  }
  // INV-04: consumes/emits зарегистрированы в EventRegistry
  if (opts?.eventRegistryHas) {
    const consumesArr = Array.isArray(d.consumes) ? (d.consumes as string[]) : [];
    const emitsArr = Array.isArray(d.emits) ? (d.emits as string[]) : [];
    for (const t of [...consumesArr, ...emitsArr]) {
      if (!opts.eventRegistryHas(t)) {
        return err(
          makeAppError('DOMAIN_EVENT_NOT_REGISTERED', `INV-04: event not registered: ${t}`, {
            mechanicId: d.id,
            eventType: t,
          }),
        );
      }
    }
  }
  // INV-05: params валиден по validationRules.paramsSchema
  if (d.params && d.validationRules && typeof d.validationRules === 'object') {
    const paramsSchema = (d.validationRules as { paramsSchema?: object }).paramsSchema;
    if (!paramsSchema) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `INV-05: ${d.id} requires paramsSchema`),
      );
    }
  }
  if (typeof d.priority !== 'number' || !Number.isInteger(d.priority)) {
    return err(
      makeAppError('DOMAIN_INVARIANT_VIOLATION', `Mechanic ${d.id}: priority must be integer`),
    );
  }
  const life = d.lifecycle as { scope?: string; persisted?: boolean } | undefined;
  if (!life || typeof life.scope !== 'string') {
    return err(
      makeAppError('DOMAIN_INVARIANT_VIOLATION', `Mechanic ${d.id}: lifecycle.scope required`),
    );
  }
  return ok(undefined);
}
