/**
 * TKT-M23: демо M23 — отношения → синергия → предательство → наследие.
 * Запуск: bun scripts/demo-m23.ts
 */
import {
  captureCompanions,
  checkBetrayal,
  createCompanion,
  dieWithLegacy,
  react,
  recruitCompanion,
  restoreCompanions,
  synergy,
} from '../src/domain/companion/Companions.js';

const roster = [];
const mara = createCompanion('mara', 'Mara', ['sea', 'loyal'], 50, 50);
const ivo = createCompanion('ivo', 'Ivo', ['sea', 'guns'], 50, 50);
recruitCompanion(roster, mara);
recruitCompanion(roster, ivo);

react(mara, 'gift');
react(mara, 'bravery');
const bond = synergy(mara, ivo);
react(ivo, 'betrayal');
react(ivo, 'neglect');
const betrayed = checkBetrayal(ivo);
const snapshot = captureCompanions(roster);
const dead = dieWithLegacy(ivo, 'brass-compass');
restoreCompanions(roster, snapshot);

process.stdout.write(`→ mara: loyalty=${mara.loyalty}, trust=${mara.trust}\n`);
process.stdout.write(`→ синергия mara+ivo: ${bond}\n`);
process.stdout.write(`→ предательство ivo: ${betrayed}\n`);
process.stdout.write(`→ наследие: ${dead.ok ? dead.value.legacy : 'err'}, restore alive=${roster[1].alive}\n`);

if (mara.loyalty !== 72 || bond !== 3 || !betrayed || !dead.ok || !roster[1].alive) {
  process.stderr.write('DEMO M23 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M23 OK — отношения → синергия → предательство → смерть с наследием\n');
