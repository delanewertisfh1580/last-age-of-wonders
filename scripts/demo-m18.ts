/**
 * TKT-M18: демо M18 — города → отношения → война → тик мира → марки.
 * Запуск: bun scripts/demo-m18.ts
 */
import {
  adjustRelation,
  captureWorld,
  contestMark,
  createWorld,
  declareWar,
  relation,
  restoreWorld,
  tickWorld,
} from '../src/domain/world/World.js';

const world = createWorld([
  { id: 'aurum', name: 'Aurum', faction: 'merchants', population: 12000, wealth: 800, defense: 60, tradeRoutes: ['porto'] },
  { id: 'porto', name: 'Porto', faction: 'navigators', population: 9000, wealth: 500, defense: 90, tradeRoutes: ['aurum'] },
  { id: 'krak', name: 'Krak', faction: 'corsairs', population: 5000, wealth: 200, defense: 40, tradeRoutes: [] },
], { aurum: { porto: 20 }, porto: { aurum: 20 } });

const grew = adjustRelation(world, 'aurum', 'porto', 10);
declareWar(world, 'porto', 'krak');
const mark = contestMark(world, 'north-pass', 'navigators', 70);
const snapshot = captureWorld(world);
const report = tickWorld(world, (cityId) => (cityId === 'aurum' ? 1 : 0.5));
const after = captureWorld(world);
restoreWorld(world, snapshot);

process.stdout.write(`→ отношения aurum→porto: ${grew.ok ? grew.value : 'err'} (обратно ${relation(world, 'porto', 'aurum')})\n`);
process.stdout.write(`→ войны: ${world.wars.map(([a, b]) => `${a}×${b}`).join(', ')}\n`);
process.stdout.write(`→ марка north-pass: ${mark}\n`);
process.stdout.write(`→ тик: рост ${JSON.stringify(report.growth)}, бои=${report.battles.length}\n`);
process.stdout.write(`→ restore: ${JSON.stringify(captureWorld(world)) === JSON.stringify(snapshot)}\n`);

if (!grew.ok || world.wars.length !== 1 || mark !== 'navigators' || report.battles.length !== 1 || JSON.stringify(captureWorld(world)) !== JSON.stringify(snapshot)) {
  process.stderr.write('DEMO M18 FAILED\n');
  process.exit(1);
}
void after;
process.stdout.write('DEMO M18 OK — города → отношения → войны → тик → марки → restore\n');
