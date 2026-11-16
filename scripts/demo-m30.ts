/**
 * TKT-M30: демо M30 — локация → фрагменты → слои → NPC → смерть.
 * Запуск: bun scripts/demo-m30.ts
 */
import {
  createLore,
  inspectLocation,
  killNpc,
  registerNpc,
  revelationLevel,
  revealFragment,
  revealsAt,
  talkToNpc,
  type LoreFragment,
} from '../src/domain/lore/Lore.js';

const fragments: readonly LoreFragment[] = [
  { id: 'tide-1', locationId: 'aurum', layer: 1, text: 'Salt marks older than the city.' },
  { id: 'tide-1', locationId: 'aurum', layer: 2, text: 'The marks match a drowned calendar.', revealsSecret: 'drowned-calendar' },
  { id: 'tide-1', locationId: 'aurum', layer: 3, text: 'The calendar counts backward to today.' },
  { id: 'reef', locationId: 'aurum', layer: 1, text: 'A reef that is not on any chart.', requiresFlags: ['sailor-trusted'] },
];
const state = createLore();
registerNpc(state, { id: 'mara', name: 'Mara', locationId: 'aurum', secretId: 'mara-knows', alive: true, talked: false });

const first = revealsAt(state, fragments, 'aurum');
for (const fragment of first) revealFragment(state, fragment);
const lockedReef = revealsAt(state, fragments, 'aurum', ['sailor-trusted']);
const talked = talkToNpc(state, 'mara');
const killed = killNpc(state, 'mara');
const clues = inspectLocation(state, 'aurum', [{ id: 'clue-1', locationId: 'aurum' }, { id: 'clue-2', locationId: 'porto' }]);

process.stdout.write(`→ слой 1: ${first.map((f) => f.id).join(',')}; reef доступен=${lockedReef.length}\n`);
process.stdout.write(`→ секреты: ${state.secrets.join(', ')}\n`);
process.stdout.write(`→ NPC: talk=${talked.ok}, death=${killed.ok}, alive=${state.npcs[0].alive}\n`);
process.stdout.write(`→ подсказки: ${clues.join(',')}, уровень=${revelationLevel(state)}\n`);

if (first.length !== 1 || lockedReef.length !== 2 || state.secrets.length !== 1 || state.npcs[0].alive || clues.length !== 1) {
  process.stderr.write('DEMO M30 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M30 OK — локация → фрагменты → слои → NPC → смерть\n');
