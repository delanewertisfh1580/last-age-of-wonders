import { describe, expect, it } from 'vitest';
import {
  applyDueEvents,
  createWorldEvents,
  scheduleEvent,
  tickOverlays,
  type LocationState,
} from '../../src/domain/worldevents/WorldEvents.js';

const locations = (): Record<string, LocationState> => ({
  a: { id: 'a', population: 1000, wealth: 100, tags: [] },
});

describe('TKT-M19: календарь и оверлеи', () => {
  it('событие меняет локацию и живёт duration тиков', () => {
    const state = createWorldEvents();
    scheduleEvent(state, { id: 'e', type: 'plague', startTick: 3, durationTicks: 2, locationId: 'a', magnitude: 1 });
    const world = locations();
    expect(applyDueEvents(state, 2, world).ok && applyDueEvents(state, 2, world).ok).toBeTruthy();
    const applied = applyDueEvents(state, 3, world);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(world.a.population).toBe(880);
    expect(tickOverlays(state)).toEqual([]);
    expect(tickOverlays(state)).toEqual(['e@3']);
  });

  it('дубль и неизвестная локация отклоняются', () => {
    const state = createWorldEvents();
    const event = { id: 'e', type: 'storm' as const, startTick: 1, durationTicks: 1, locationId: 'a', magnitude: 1 };
    expect(scheduleEvent(state, event).ok).toBe(true);
    expect(scheduleEvent(state, event).ok).toBe(false);
    const missing = applyDueEvents(state, 1, {});
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe('WORLD_EVENT_UNKNOWN_LOCATION');
  });
});
