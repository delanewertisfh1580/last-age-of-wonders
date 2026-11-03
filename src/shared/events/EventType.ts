import type { Brand } from '../../domain/brand/Brand.js';

/** TKT-M1-007: branded тип типа события. */
export type EventType = string & Brand<'EventType'> & { readonly __eventType?: true };

const EVENT_TYPE_RE = /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+$/;

export function makeEventType(value: string): EventType {
  if (!EVENT_TYPE_RE.test(value)) {
    throw new Error(`Invalid event type: '${value}'`);
  }
  return value as EventType;
}

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPE_RE.test(value);
}
