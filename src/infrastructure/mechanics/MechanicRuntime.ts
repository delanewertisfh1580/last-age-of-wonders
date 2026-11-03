import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { IMechanicRuntime } from '../../domain/mechanics/IMechanicRuntime.js';
import type { MechanicDefinition, MechanicScope } from '../../domain/mechanics/MechanicDefinition.js';
import type { IMechanicRegistry } from '../../domain/mechanics/IMechanicRegistry.js';
import { createMechanicContext, type MechanicContext } from '../../domain/mechanics/MechanicContext.js';
import type { StateSchemaValidator } from './StateSchemaValidator.js';
import type { DomainEvent } from '../../shared/events/DomainEvent.js';
import type { IEventBus } from '../../domain/events/IEventBus.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type { Logger } from '../../shared/logging/Logger.js';

export interface MechanicRuntimeOptions {
  readonly registry: IMechanicRegistry;
  readonly eventBus: IEventBus;
  readonly rng: IRngService;
  readonly logger: Logger;
  readonly stateValidator: StateSchemaValidator;
  getTick?: () => number;
}

/**
 * TKT-M2-015/016: MechanicRuntime.
 * dispatchEvent: выбор механик по consumes, сортировка priority↓ + id, изоляция ошибок.
 * tickScope: активные tracker'ы scope; activate/deactivate/getState.
 */
export class MechanicRuntime implements IMechanicRuntime {
  private states = new Map<string, unknown>();
  private active = new Set<string>();

  constructor(private readonly o: MechanicRuntimeOptions) {}

  private createContext(def: MechanicDefinition): MechanicContext {
    return createMechanicContext({
      mechanic: def,
      eventBus: this.o.eventBus,
      rng: this.o.rng,
      logger: this.o.logger,
      tick: this.o.getTick?.() ?? 0,
      getState: () => this.states.get(def.id) ?? null,
      setState: (state: unknown) => this.applyState(def, state),
    });
  }

  private applyState(def: MechanicDefinition, state: unknown): Result<void, AppError> {
    const current = this.states.get(def.id);
    if (state === undefined) {
      return err(
        makeAppError('MECHANIC_STATE_TYPE_MISMATCH', `Mechanic ${def.id}: state is undefined`),
      );
    }
    if (def.stateSchema) {
      const validated = this.o.stateValidator.validate(def.id, state);
      if (!validated.ok) return validated;
    }
    this.states.set(def.id, state);
    void current;
    return ok(undefined);
  }

  dispatchEvent(event: DomainEvent): Result<void, AppError> {
    const consumers = this.o.registry
      .list()
      .filter((d) => d.consumes.includes(event.type) && this.active.has(d.id))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    for (const def of consumers) {
      const plugin = this.o.registry.getPlugin(def.id);
      if (!plugin.ok) continue;
      const ctx = this.createContext(def);
      try {
        const result = plugin.value.onEvent(event, ctx);
        if (!result.ok) {
          this.o.logger.error(`Plugin ${def.id} returned error on ${event.type}`, {
            mechanicId: def.id,
            code: result.error.code,
            message: result.error.message,
          });
        }
      } catch (e) {
        // TKT-M2-015: изоляция исключений — лог, продолжаем.
        this.o.logger.error(`Plugin ${def.id} threw on ${event.type}`, {
          mechanicId: def.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return ok(undefined);
  }

  tickScope(scope: MechanicScope): Result<void, AppError> {
    const trackers = this.o.registry
      .listByScope(scope)
      .filter((d) => d.kind === 'tracker' && this.active.has(d.id))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    for (const def of trackers) {
      const plugin = this.o.registry.getPlugin(def.id);
      if (!plugin.ok) continue;
      const ctx = this.createContext(def);
      try {
        const result = plugin.value.onTick(ctx);
        if (!result.ok) {
          this.o.logger.error(`Plugin ${def.id} returned error on tickScope(${scope})`, {
            mechanicId: def.id,
          });
        }
      } catch (e) {
        this.o.logger.error(`Plugin ${def.id} threw on tickScope(${scope})`, {
          mechanicId: def.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return ok(undefined);
  }

  activate(mechanicId: string, initialState?: unknown): Result<void, AppError> {
    const defResult = this.o.registry.get(mechanicId);
    if (!defResult.ok) return defResult as Result<void, AppError>;
    const def = defResult.value;

    if (initialState !== undefined) {
      if (def.stateSchema) {
        const validated = this.o.stateValidator.validate(mechanicId, initialState);
        if (!validated.ok) return validated as Result<void, AppError>;
      }
      this.states.set(mechanicId, initialState);
    }
    try {
      const plugin = this.o.registry.getPlugin(mechanicId);
      if (plugin.ok) {
        const ctx = this.createContext(def);
        const res = plugin.value.onActivate(ctx);
        if (!res.ok) {
          this.o.logger.error(`Plugin ${mechanicId} failed onActivate`, {
            mechanicId,
            code: res.error.code,
          });
        }
      }
    } catch (e) {
      this.o.logger.error(`Plugin ${mechanicId} threw onActivate`, {
        mechanicId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    this.active.add(mechanicId);
    return ok(undefined);
  }

  deactivate(mechanicId: string): Result<void, AppError> {
    const defResult = this.o.registry.get(mechanicId);
    if (!defResult.ok) return defResult as Result<void, AppError>;
    // Состояние остаётся в Map до явной очистки.
    try {
      const plugin = this.o.registry.getPlugin(mechanicId);
      if (plugin.ok) {
        const ctx = this.createContext(defResult.value);
        plugin.value.onDeactivate(ctx);
      }
    } catch (e) {
      this.o.logger.error(`Plugin ${mechanicId} threw onDeactivate`, {
        mechanicId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    this.active.delete(mechanicId);
    return ok(undefined);
  }

  getState(mechanicId: string): Result<unknown, AppError> {
    if (!this.o.registry.get(mechanicId).ok) {
      return err(makeAppError('MECHANIC_NOT_FOUND', `Mechanic not found: ${mechanicId}`, { mechanicId }));
    }
    return ok(this.states.get(mechanicId) ?? null);
  }

  /** TKT-M3-019: сериализация состояния рантайма. */
  captureRuntimeState(): Record<string, unknown> {
    const stateMap: Record<string, unknown> = {};
    for (const key of [...this.states.keys()].sort()) stateMap[key] = this.states.get(key);
    return { states: stateMap, active: [...this.active].sort() };
  }

  restoreRuntimeState(state: Record<string, unknown>): Result<void, AppError> {
    const raw = state as { states?: Record<string, unknown>; active?: string[] } | null;
    if (!raw || typeof raw !== 'object' || !raw.states) {
      return err(makeAppError('SAVE_INVALID_SNAPSHOT', 'mechanicRuntimeState must contain `states`'));
    }
    this.states = new Map(Object.entries(raw.states));
    this.active = new Set(raw.active ?? []);
    for (const [mechanicId, mechanicState] of this.states) {
      if (mechanicState === undefined || mechanicState === null) continue;
      const def = this.o.registry.get(mechanicId);
      if (!def.ok) continue;
      if (def.value.stateSchema) {
        this.o.stateValidator.register(mechanicId, def.value.stateSchema);
        const validated = this.o.stateValidator.validate(mechanicId, mechanicState);
        if (!validated.ok) return validated;
      }
    }
    return ok(undefined);
  }

  registerStateSchema(def: MechanicDefinition): void {
    if (def.stateSchema) this.o.stateValidator.register(def.id, def.stateSchema);
  }

  isActive(mechanicId: string): boolean {
    return this.active.has(mechanicId);
  }
}
