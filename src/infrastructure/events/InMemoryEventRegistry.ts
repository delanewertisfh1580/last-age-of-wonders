import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import { isEventType, type EventType } from '../../shared/events/EventType.js';
import type { IEventRegistry } from '../../domain/events/IEventRegistry.js';
import type { EventDefinition } from '../../domain/events/EventDefinition.js';

/** TKT-M1-009: in-memory реализация реестра событий. */
export class InMemoryEventRegistry implements IEventRegistry {
  private readonly byType = new Map<string, EventDefinition>();

  register(definition: EventDefinition): Result<void, AppError> {
    if (!isEventType(definition.type)) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `Invalid event type: ${String(definition.type)}`),
      );
    }
    if (this.byType.has(definition.type)) {
      return err(
        makeAppError('DOMAIN_INVARIANT_VIOLATION', `Event already registered: ${definition.type}`),
      );
    }
    this.byType.set(definition.type, definition);
    return ok(undefined);
  }

  has(type: EventType): boolean {
    return this.byType.has(type);
  }

  get(type: EventType): Result<EventDefinition, AppError> {
    const found = this.byType.get(type);
    if (!found) {
      return err(
        makeAppError('DOMAIN_EVENT_NOT_REGISTERED', `Event not registered: ${type}`, { type }),
      );
    }
    return ok(found);
  }

  list(): readonly EventDefinition[] {
    return [...this.byType.keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((t) => this.byType.get(t) as EventDefinition);
  }
}
