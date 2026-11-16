/**
 * TKT-M31: демо M31 — факты → нити → текст → выбор.
 * Запуск: bun scripts/demo-m31.ts
 */
import {
  createFactPort,
  generateEpilogue,
  pickChoice,
  type EpilogueFact,
} from '../src/domain/epilogue/Epilogue.js';

const facts: readonly EpilogueFact[] = [
  { id: 'e1', domain: 'economy', text: 'The harbor markets stayed open through the storm.', weight: 7, tags: ['trade'] },
  { id: 'e2', domain: 'economy', text: 'A new guild charter was signed in the ashes.', weight: 5, tags: ['guild'] },
  { id: 'e3', domain: 'combat', text: 'The crew buried two friends and saved the rest.', weight: 9, tags: ['loss'] },
  { id: 'e4', domain: 'narrative', text: 'Mara finally read the drowned calendar aloud.', weight: 8, tags: ['lore'] },
  { id: 'e5', domain: 'captain', text: 'Captain Voss retired with a quiet reputation.', weight: 6, tags: ['legacy'] },
];
const required = ['economy', 'combat', 'narrative', 'captain'];
const choices = [
  { id: 'keep', text: 'The sea keeps its secrets.', tag: 'mystery' },
  { id: 'tell', text: 'The truth is written into the new charts.', tag: 'truth' },
];

const choice = pickChoice(choices, 'tell');
if (!choice.ok) throw new Error(choice.error.message);
const result = generateEpilogue(createFactPort(facts), required, choice.value);

process.stdout.write(`→ нитей: ${result.ok ? result.value.threads.length : 'err'}, порядок: ${result.ok ? result.value.threads.map((t) => t.domain).join(' → ') : ''}\n`);
process.stdout.write(`→ пропущенные домены: ${result.ok ? result.value.missingDomains.join(',') || 'нет' : 'err'}\n`);
process.stdout.write(`→ сцен: ${result.ok ? result.value.scenes.length : 0}, выбор=${result.ok ? result.value.choice?.tag : ''}\n`);
process.stdout.write(`→ текст содержит финал: ${result.ok ? result.value.text.includes('new charts') : false}\n`);

if (!result.ok || result.value.missingDomains.length > 0 || result.value.threads[0].domain !== 'economy' || !result.value.text.includes('new charts')) {
  process.stderr.write('DEMO M31 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M31 OK — факты → нити → сцены → текст → выбор\n');
