import { err, ok, type Result } from '../result/Result.js';

/** TKT-M13-002/003/005: планирование, жизненный цикл и восстановление VFX. */
export interface VfxDefinition {
  readonly id: string;
  readonly trigger: string;
  readonly tags: readonly string[];
  readonly budgetCost: number;
  readonly durationMs: number;
  readonly maxInstances: number;
}

export interface ActiveVfx {
  readonly id: string;
  readonly definitionId: string;
  remainingMs: number;
  readonly startedAtTick: number;
}

export type VfxErrorCode = 'VFX_BUDGET_EXCEEDED' | 'VFX_UNKNOWN';

export interface VfxError {
  readonly code: VfxErrorCode;
  readonly message: string;
}

function fail(code: VfxErrorCode, message: string): Result<never, VfxError> {
  return err({ code, message });
}

export interface VfxPlanOptions {
  readonly particleBudget: number;
  readonly disabledTags?: readonly string[];
  readonly usedBudget?: number;
}

/** TKT-M13-002: фильтрация по тегам и бюджету, приоритет дешёвых эффектов. */
export function planVfx(
  definitions: readonly VfxDefinition[],
  trigger: string,
  options: VfxPlanOptions,
): Result<readonly VfxDefinition[], VfxError> {
  const disabled = new Set(options.disabledTags ?? []);
  let budget = options.particleBudget - (options.usedBudget ?? 0);
  const candidates = definitions
    .filter((definition) => definition.trigger === trigger)
    .filter((definition) => !definition.tags.some((tag) => disabled.has(tag)))
    .sort((a, b) => a.budgetCost - b.budgetCost || a.id.localeCompare(b.id));
  const planned: VfxDefinition[] = [];
  for (const candidate of candidates) {
    if (candidate.budgetCost > budget) continue;
    budget -= candidate.budgetCost;
    planned.push(candidate);
  }
  return ok(planned);
}

/** TKT-M13-003/005: активные эффекты с лимитами и снимком. */
export class VfxRuntimeService {
  private readonly definitions = new Map<string, VfxDefinition>();
  private readonly active: ActiveVfx[] = [];

  register(definition: VfxDefinition): Result<void, VfxError> {
    if (this.definitions.has(definition.id)) return fail('VFX_UNKNOWN', `Duplicate VFX: ${definition.id}`);
    this.definitions.set(definition.id, definition);
    return ok(undefined);
  }

  spawn(definitionId: string, tick: number, budget: number): Result<ActiveVfx, VfxError> {
    const definition = this.definitions.get(definitionId);
    if (!definition) return fail('VFX_UNKNOWN', `Unknown VFX: ${definitionId}`);
    const same = this.active.filter((entry) => entry.definitionId === definitionId).length;
    if (same >= definition.maxInstances) return fail('VFX_BUDGET_EXCEEDED', `Max instances of ${definitionId}`);
    const used = this.active.reduce((sum, entry) => sum + (this.definitions.get(entry.definitionId)?.budgetCost ?? 0), 0);
    if (used + definition.budgetCost > budget) return fail('VFX_BUDGET_EXCEEDED', 'Particle budget exceeded');
    const instance: ActiveVfx = { id: `${definitionId}#${this.active.length + tick}`, definitionId, remainingMs: definition.durationMs, startedAtTick: tick };
    this.active.push(instance);
    return ok(instance);
  }

  tick(dtMs: number): readonly ActiveVfx[] {
    const expired: ActiveVfx[] = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remainingMs -= dtMs;
      if (this.active[i].remainingMs <= 0) expired.push(...this.active.splice(i, 1));
    }
    return expired;
  }

  activeList(): readonly ActiveVfx[] {
    return [...this.active];
  }

  capture(): readonly ActiveVfx[] {
    return this.active.map((entry) => ({ ...entry }));
  }

  restore(state: readonly ActiveVfx[]): void {
    this.active.splice(0, this.active.length, ...state.map((entry) => ({ ...entry })));
  }
}
