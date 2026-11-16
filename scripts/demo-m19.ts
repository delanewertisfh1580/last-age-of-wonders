/**
 * TKT-M19: демо M19 — календарь → оверлеи → изменения локаций.
 * Запуск: bun scripts/demo-m19.ts
 */
import {
  applyDueEvents,
  createWorldEvents,
  scheduleEvent,
  tickOverlays,
  type LocationState,
} from '../src/domain/worldevents/WorldEvents.js';

const state = createWorldEvents();
scheduleEvent(state, { id: 'festival-1', type: 'festival', startTick: 2, durationTicks: 2, locationId: 'aurum', magnitude: 1 });
scheduleEvent(state, { id: 'plague-1', type: 'plague', startTick: 2, durationTicks: 1, locationId: 'porto', magnitude: 1 });
scheduleEvent(state, { id: 'storm-1', type: 'storm', startTick: 4, durationTicks: 1, locationId: 'aurum', magnitude: 1 });

const locations: Record<string, LocationState> = {
  aurum: { id: 'aurum', population: 10000, wealth: 1000, tags: ['port'] },
  porto: { id: 'porto', population: 5000, wealth: 500, tags: ['port'] },
};

const tick1 = applyDueEvents(state, 1, locations);
const tick2 = applyDueEvents(state, 2, locations);
const expiredAfter2 = tickOverlays(state);
const expiredAfter3 = tickOverlays(state);
const tick4 = applyDueEvents(state, 4, locations);

process.stdout.write(`→ tick1: ${tick1.ok ? tick1.value.started.length : 'err'}\n`);
process.stdout.write(`→ tick2: ${tick2.ok ? tick2.value.applied.map((a) => `${a.eventId}:${a.population}/${a.wealth}`).join(', ') : 'err'}\n`);
process.stdout.write(`→ истекли: ${expiredAfter2.length} + ${expiredAfter3.length}\n`);
process.stdout.write(`→ tick4: ${tick4.ok ? tick4.value.started.map((o) => o.id).join(', ') : 'err'}\n`);

if (!tick1.ok || tick1.value.started.length !== 0 || !tick2.ok || tick2.value.started.length !== 2 || expiredAfter3.length === 0 || !tick4.ok) {
  process.stderr.write('DEMO M19 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M19 OK — календарь → эффекты локаций → оверлеи → истечение\n');
