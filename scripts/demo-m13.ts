/**
 * TKT-M13-006: демо M13 — триггер → план → жизненный цикл → restore.
 * Запуск: bun scripts/demo-m13.ts
 */
import { VfxRuntimeService, planVfx, type VfxDefinition } from '../src/domain/vfx/Vfx.js';

const definitions: readonly VfxDefinition[] = [
  { id: 'cannon-smoke', trigger: 'combat.hit', tags: ['smoke'], budgetCost: 10, durationMs: 400, maxInstances: 2 },
  { id: 'cannon-flash', trigger: 'combat.hit', tags: ['flash'], budgetCost: 30, durationMs: 250, maxInstances: 1 },
  { id: 'splash', trigger: 'combat.hit', tags: ['water'], budgetCost: 20, durationMs: 600, maxInstances: 1 },
];

const plan = planVfx(definitions, 'combat.hit', { particleBudget: 40, disabledTags: ['flash'] });
const runtime = new VfxRuntimeService();
for (const definition of definitions) runtime.register(definition);
const spawned = plan.ok ? plan.value.map((definition, index) => runtime.spawn(definition.id, index, 40)) : [];
const snapshot = runtime.capture();
const expiredAt = runtime.tick(700);
const fresh = new VfxRuntimeService();
for (const definition of definitions) fresh.register(definition);
fresh.restore(snapshot);

process.stdout.write(`→ план: ${plan.ok ? plan.value.map((d) => d.id).join(', ') : 'none'}\n`);
process.stdout.write(`→ spawn: ${spawned.filter((r) => r.ok).length}, active=${snapshot.length}\n`);
process.stdout.write(`→ истекло за 700мс: ${expiredAt.length}\n`);
process.stdout.write(`→ restore: ${JSON.stringify(fresh.capture()) === JSON.stringify(snapshot)}\n`);

if (!plan.ok || plan.value.length !== 2 || expiredAt.length !== snapshot.length || JSON.stringify(fresh.capture()) !== JSON.stringify(snapshot)) {
  process.stderr.write('DEMO M13 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M13 OK — триггер → бюджетный план → жизненный цикл → restore\n');
