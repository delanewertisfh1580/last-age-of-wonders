/**
 * TKT-M15-009: демо M15 — флот → урон → статусы → доктрина → получение.
 * Запуск: bun scripts/demo-m15.ts
 */
import {
  DoctrineRuntime,
  addShip,
  applyShipDamage,
  canAcquireShip,
  createFleet,
  fleetTotals,
  type ShipDefinition,
} from '../src/domain/fleet/Fleet.js';

const frigate: ShipDefinition = {
  id: 'frigate-merchants', faction: 'merchants', shipClass: 'frigate', maxHp: 100, armor: 4, speed: 8, slots: 3, signature: false,
};
const flagship: ShipDefinition = {
  id: 'manowar-crown', faction: 'crown', shipClass: 'manowar', maxHp: 260, armor: 12, speed: 4, slots: 6, signature: true,
};
const definitions = new Map([[frigate.id, frigate], [flagship.id, flagship]]);
const fleet = createFleet('merchants');
addShip(fleet, frigate, 'a');
const b = addShip(fleet, frigate, 'b');
if (!b.ok) throw new Error(b.error.message);
applyShipDamage(b.value, frigate, 80);

const doctrines = new DoctrineRuntime();
doctrines.bind({ doctrineId: 'broadside', phase: 'engagement', effect: '+15% damage' });
doctrines.bind({ doctrineId: 'grapple', phase: 'boarding', effect: '+2 boarders' });
doctrines.setPhase('boarding');

const totals = fleetTotals(fleet, definitions);
const rich = canAcquireShip(flagship, { reputation: 80, gold: 1000, unlockedBranches: ['naval'] }, 500, 'naval');
const poor = canAcquireShip(flagship, { reputation: 20, gold: 1000, unlockedBranches: [] }, 500);

process.stdout.write(`→ флот: ships=${totals.ships}, ready=${totals.ready}, hp=${totals.hp}/${totals.maxHp}\n`);
process.stdout.write(`→ статус b: ${b.value.status}\n`);
process.stdout.write(`→ доктрина: ${doctrines.activeEffects().join(', ')}\n`);
process.stdout.write(`→ acquisition: rich=${rich.ok && rich.value}, poor=${poor.ok && poor.value}\n`);

if (totals.hp !== 124 || b.value.status !== 'sinking' || doctrines.activeEffects()[0] !== '+2 boarders' || !(rich.ok && rich.value) || (poor.ok && poor.value)) {
  process.stderr.write('DEMO M15 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M15 OK — флот → урон → доктрины → signature-получение\n');
