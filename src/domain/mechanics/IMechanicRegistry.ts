import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { MechanicDefinition, MechanicScope } from './MechanicDefinition.js';
import type { IMechanicPlugin } from './IMechanicPlugin.js';

/** TKT-M2-013: контракт реестра механик (§5.4 DEV-SPEC-004). */
export interface IMechanicRegistry {
  register(plugin: IMechanicPlugin, definition: MechanicDefinition): Result<void, AppError>;
  get(id: string): Result<MechanicDefinition, AppError>;
  getPlugin(id: string): Result<IMechanicPlugin, AppError>;
  list(): readonly MechanicDefinition[];
  listByScope(scope: MechanicScope): readonly MechanicDefinition[];
}
