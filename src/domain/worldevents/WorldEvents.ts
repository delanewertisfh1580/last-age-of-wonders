import { err, ok, type Result } from '../result/Result.js';

/** TKT-M19: календарь событий и изменения локаций. */
export type WorldEventType = 'festival' | 'plague' | 'storm' | 'war_declaration' | 'trade_boom' | 'earthquake';

export interface WorldEventDefinition {
  readonly id: string;
  readonly type: WorldEventType;
  readonly startTick: number;
  readonly durationTicks: number;
  readonly locationId: string;
  readonly magnitude: number;
}

export interface WorldOverlay {
  readonly id: string;
  readonly type: WorldEventType;
  readonly locationId: string;
  remainingTicks: number;
  readonly modifiers: Readonly<Record<string, number>>;
}

export interface LocationState {
  readonly id: string;
  population: number;
  wealth: number;
  readonly tags: string[];
}

export interface WorldEventsState {
  readonly scheduled: WorldEventDefinition[];
  readonly active: WorldOverlay[];
  readonly history: string[];
}

export interface WorldEventError {
  readonly code: 'WORLD_EVENT_UNKNOWN_LOCATION' | 'WORLD_EVENT_DUPLICATE';
  readonly message: string;
}
function fail(code: WorldEventError['code'], message: string): Result<never, WorldEventError> {
  return err({ code, message });
}

const MODIFIERS: Readonly<Record<WorldEventType, Readonly<Record<string, number>>>> = {
  festival: { wealth: 0.05, morale: 5 },
  plague: { population: -0.12, wealth: -0.03 },
  storm: { wealth: -0.07, travel: -0.4 },
  war_declaration: { wealth: -0.1, danger: 30 },
  trade_boom: { wealth: 0.12, prices: -0.08 },
  earthquake: { population: -0.05, wealth: -0.15, defense: -10 },
};

export function createWorldEvents(): WorldEventsState {
  return { scheduled: [], active: [], history: [] };
}

export function scheduleEvent(state: WorldEventsState, definition: WorldEventDefinition): Result<void, WorldEventError> {
  if (state.scheduled.some((event) => event.id === definition.id)) {
    return fail('WORLD_EVENT_DUPLICATE', `Duplicate event: ${definition.id}`);
  }
  state.scheduled.push({ ...definition });
  state.scheduled.sort((a, b) => a.startTick - b.startTick || a.id.localeCompare(b.id));
  return ok(undefined);
}

export interface EventApplyResult {
  readonly started: readonly WorldOverlay[];
  readonly applied: readonly { eventId: string; locationId: string; population: number; wealth: number }[];
}

/** TKT-M19: события стартуют по календарю и меняют локации. */
export function applyDueEvents(
  state: WorldEventsState,
  tick: number,
  locations: Record<string, LocationState>,
): Result<EventApplyResult, WorldEventError> {
  const started: WorldOverlay[] = [];
  const applied: { eventId: string; locationId: string; population: number; wealth: number }[] = [];
  const due = state.scheduled.filter((event) => event.startTick === tick);
  for (const event of due) {
    const location = locations[event.locationId];
    if (!location) return fail('WORLD_EVENT_UNKNOWN_LOCATION', `Unknown location: ${event.locationId}`);
    const modifiers = { ...MODIFIERS[event.type] };
    const populationDelta = Math.round(location.population * (modifiers.population ?? 0) * event.magnitude);
    const wealthDelta = Math.round(location.wealth * (modifiers.wealth ?? 0) * event.magnitude);
    location.population = Math.max(0, location.population + populationDelta);
    location.wealth = Math.max(0, location.wealth + wealthDelta);
    state.active.push({ id: `${event.id}@${tick}`, type: event.type, locationId: event.locationId, remainingTicks: event.durationTicks, modifiers });
    state.scheduled.splice(state.scheduled.indexOf(event), 1);
    state.history.push(`${tick}:${event.id}`);
    started.push(state.active[state.active.length - 1]);
    applied.push({ eventId: event.id, locationId: event.locationId, population: populationDelta, wealth: wealthDelta });
  }
  return ok({ started, applied });
}

/** TKT-M19: тик оверлеев и снятие по истечении. */
export function tickOverlays(state: WorldEventsState): readonly string[] {
  const expired: string[] = [];
  for (let i = state.active.length - 1; i >= 0; i--) {
    state.active[i].remainingTicks -= 1;
    if (state.active[i].remainingTicks <= 0) expired.push(...state.active.splice(i, 1).map((overlay) => overlay.id));
  }
  return expired;
}

export function activeOverlaysAt(state: WorldEventsState, locationId: string): readonly WorldOverlay[] {
  return state.active.filter((overlay) => overlay.locationId === locationId);
}

export function applyLocationChange(location: LocationState, patch: Partial<Pick<LocationState, 'population' | 'wealth'>>): LocationState {
  if (patch.population !== undefined) location.population = Math.max(0, patch.population);
  if (patch.wealth !== undefined) location.wealth = Math.max(0, patch.wealth);
  return location;
}
