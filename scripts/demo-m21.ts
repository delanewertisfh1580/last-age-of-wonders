/**
 * TKT-M21: демо M21 — эффект стадии → шрам → мост → проходимость.
 * Запуск: bun scripts/demo-m21.ts
 */
import {
  applyCataclysmEffect,
  buildBridge,
  routePassable,
  scarTravelCost,
  type CataclysmEffect,
  type ScarredNode,
} from '../src/domain/cataclysm/Effects.js';

const nodes: Record<string, ScarredNode> = {
  aurum: { nodeId: 'aurum', population: 10000, wealth: 1000, defense: 60, tags: ['port'] },
};
const scars = new Map();
const effect: CataclysmEffect = {
  id: 'storm-impact', type: 'storm', stage: 'impact', nodeId: 'aurum',
  populationLoss: 0.08, wealthLoss: 0.15, defenseLoss: 20, severity: 12,
};
const applied = applyCataclysmEffect(nodes, scars, effect);
if (!applied.ok) throw new Error(applied.error.message);
const scar = scars.get('aurum');
const blocked = routePassable(scar);
const bridge = buildBridge(scar, nodes.aurum, 300);
const repaired = buildBridge(scar, nodes.aurum, 300);
const passable = routePassable(scar);

process.stdout.write(`→ урон: pop ${applied.value.changes.population}, wealth ${applied.value.changes.wealth}, def ${applied.value.changes.defense}\n`);
process.stdout.write(`→ шрам: severity=${bridge.ok ? bridge.value.severity : '?'}, shock=${bridge.ok ? bridge.value.shock : '?'}\n`);
process.stdout.write(`→ маршрут до моста: ${blocked}, после: ${passable}\n`);
process.stdout.write(`→ стоимость прохода: ${scarTravelCost(scar)}\n`);

if (applied.value.changes.population >= 0 || !bridge.ok || !repaired.ok || blocked || !passable || scarTravelCost(scar) > 15) {
  process.stderr.write('DEMO M21 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M21 OK — эффект → шрам → мост → восстановление маршрута\n');
