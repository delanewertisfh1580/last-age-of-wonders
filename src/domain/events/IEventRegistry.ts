import type { Result } from '../result/Result.js';
import type { AppError } from '../app-error/AppError.js';
import type { EventDefinition } from './EventDefinition.js';
import type { EventType } from '../../shared/events/EventType.js';

/** TKT-M1-009: реестр определений событий. */
export interface IEventRegistry {
  register(definition: EventDefinition): Result<void, AppError>;
  has(type: EventType): boolean;
  get(type: EventType): Result<EventDefinition, AppError>;
  list(): readonly EventDefinition[];
}
