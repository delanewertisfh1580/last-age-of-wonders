/**
 * TKT-M29: демо M29 — предыстория → пролог → маяк → арка → диалог → финал.
 * Запуск: bun scripts/demo-m29.ts
 */
import {
  activateBeacon,
  advanceArc,
  createNarrative,
  dialogue,
  makeFinaleReady,
  startPrologue,
  type DialogueChoice,
  type StoryArc,
  type StoryBeacon,
} from '../src/domain/narrative/Narrative.js';

const background = { id: 'scholar', title: 'Disgraced Scholar', flags: ['prologue-done', 'science'], bonusSkill: 'lore' };
const beacon: StoryBeacon = { id: 'beacon-1', locationId: 'aurum', arcId: 'arc-tide', requiresFlags: ['science'] };
const arc: StoryArc = {
  id: 'arc-tide',
  title: 'The Tide Remembers',
  beats: [
    { id: 'beat-1', flag: 'heard-rumor' },
    { id: 'beat-2', flag: 'saw-tide', requiresFlags: ['heard-rumor'] },
  ],
  finalFlag: 'arc-tide-done',
};
const choices: readonly DialogueChoice[] = [
  { id: 'listen', text: 'Listen to the sailor', flag: 'sailor-trusted', reputation: 5 },
  { id: 'dismiss', text: 'Dismiss the rumor', flag: 'rumor-dismissed', reputation: -3 },
];

function run() {
  const state = createNarrative();
  startPrologue(state, background);
  makeFinaleReady(state);
  activateBeacon(state, beacon, arc, 'aurum');
  advanceArc(state, arc, 'beat-1');
  dialogue(state, choices, 'listen');
  advanceArc(state, arc, 'beat-2');
  return state;
}

const a = run();
const b = run();
process.stdout.write(`→ флаги: ${a.flags.join(', ')}\n`);
process.stdout.write(`→ арки: active=${a.activeArcs.length}, completed=${a.completedArcs.join(',')}\n`);
process.stdout.write(`→ репутация: ${a.reputation}, финал=${a.finaleReached}\n`);
process.stdout.write(`→ детерминизм: ${String(JSON.stringify(a) === JSON.stringify(b))}\n`);

if (!a.prologueSeen || !a.completedArcs.includes('arc-tide') || !a.finaleReached || JSON.stringify(a) !== JSON.stringify(b)) {
  process.stderr.write('DEMO M29 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M29 OK — предыстория → пролог → маяк → арка → диалог → финал\n');
