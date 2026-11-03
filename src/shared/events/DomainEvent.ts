import type { EventType } from './EventType.js';

/** TKT-M1-007: доменное событие с метаданными. */
export interface DomainEvent<TPayload = unknown> {
  readonly type: EventType;
  readonly payload: TPayload;
  readonly emittedAtTick: number;
  readonly emittedAtMs: number;
  readonly source: 'core' | 'faction_extension' | 'mechanic';
  readonly correlationId?: string;
}

export type EventPublishInput = {
  readonly type: EventType;
  readonly payload?: unknown;
  readonly source?: DomainEvent['source'];
  readonly correlationId?: string;
};
