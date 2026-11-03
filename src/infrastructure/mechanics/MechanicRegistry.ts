import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import { validateMechanicDefinition, type MechanicDefinition, type MechanicScope } from '../../domain/mechanics/MechanicDefinition.js';
import type { IMechanicRegistry } from '../../domain/mechanics/IMechanicRegistry.js';
import type { IMechanicPlugin } from '../../domain/mechanics/IMechanicPlugin.js';

export interface MechanicRegistryOptions {
  readonly eventRegistryHas?: (type: string) => boolean;
}

/** TKT-M2-013: реализация реестра механик. */
export class MechanicRegistry implements IMechanicRegistry {
  private readonly defs = new Map<string, MechanicDefinition>();
  private readonly plugins = new Map<string, IMechanicPlugin>();

  constructor(private readonly opts: MechanicRegistryOptions = {}) {}

  register(plugin: IMechanicPlugin, definition: MechanicDefinition): Result<void, AppError> {
    const valid = validateMechanicDefinition(definition, {
      eventRegistryHas: this.opts.eventRegistryHas,
    });
    if (!valid.ok) return valid;

    if (plugin.definitionId !== definition.id) {
      return err(
        makeAppError(
          'DOMAIN_INVARIANT_VIOLATION',
          `plugin.definitionId (${plugin.definitionId}) != definition.id (${definition.id})`,
        ),
      );
    }
    if (this.defs.has(definition.id)) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `Mechanic already registered: ${definition.id}`),
      );
    }
    this.defs.set(definition.id, definition);
    this.plugins.set(definition.id, plugin);
    return ok(undefined);
  }

  get(id: string): Result<MechanicDefinition, AppError> {
    const def = this.defs.get(id);
    if (!def) {
      return err(makeAppError('MECHANIC_NOT_FOUND', `Mechanic not found: ${id}`, { id }));
    }
    return ok(def);
  }

  getPlugin(id: string): Result<IMechanicPlugin, AppError> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      return err(makeAppError('MECHANIC_NOT_FOUND', `Plugin not found: ${id}`, { id }));
    }
    return ok(plugin);
  }

  list(): readonly MechanicDefinition[] {
    return [...this.defs.keys()].sort((a, b) => a.localeCompare(b)).map((id) => this.defs.get(id) as MechanicDefinition);
  }

  listByScope(scope: MechanicScope): readonly MechanicDefinition[] {
    return this.list().filter((d) => d.lifecycle.scope === scope);
  }
}
