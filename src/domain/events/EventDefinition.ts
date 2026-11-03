import type { EventType } from '../../shared/events/EventType.js';

/** TKT-M1-008: определение события в Content Registry. */
export interface EventDefinition {
  readonly type: EventType;
  readonly source: 'core' | 'faction_extension' | 'mechanic';
  readonly description?: string;
  /** JSON Schema для payload; null — валидация не требуется. */
  readonly payloadSchema: object | null;
}

export function makeEventDefinition(raw: unknown): EventDefinition {
  const d = raw as Record<string, unknown>;
  if (!d || typeof d.type !== 'string') {
    throw new Error('EventDefinition requires a string `type` field');
  }
  const source = (d.source ?? 'core') as EventDefinition['source'];
  return {
    type: d.type as EventDefinition['type'],
    source,
    description: typeof d.description === 'string' ? d.description : undefined,
    payloadSchema: (d.payloadSchema ?? null) as object | null,
  };
}
