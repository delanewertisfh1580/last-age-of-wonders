/**
 * TKT-M9-010: демо M9 — tier switching → переход → оверрайды → restore.
 * Запуск: bun scripts/demo-m9.ts
 */
import {
  ShaderQualityController,
  VisualOverrideManager,
  VisualStateAggregate,
  startTransition,
  stepTransition,
} from '../src/domain/visual/Visual.js';

const shaders = new ShaderQualityController('high');
const overrides = new VisualOverrideManager();
const aggregate = new VisualStateAggregate(shaders, overrides);

const transition = startTransition(0, 1, 1000);
if (!transition.ok) throw new Error(transition.error.message);
const values = [0, 250, 500, 1000].map((dt) => stepTransition(transition.value, dt).toFixed(2));

const highBudget = shaders.current().particleBudget;
shaders.setTier('low');
overrides.apply({ id: 'cataclysm-storm', source: 'cataclysm', tint: '#2a4d6e', intensity: 0.8, remainingMs: 500 });
overrides.apply({ id: 'fire', source: 'combat', tint: '#c2410c', intensity: 0.5, remainingMs: 200 });
const mid = aggregate.tick(250);

const snapshot = JSON.parse(JSON.stringify(aggregate.capture())) as ReturnType<typeof aggregate.capture>;
const fresh = new VisualStateAggregate(new ShaderQualityController('high'), new VisualOverrideManager());
fresh.restore(snapshot);

process.stdout.write(`→ transition: ${values.join(' → ')}\n`);
process.stdout.write(`→ budget high=${highBudget} low=${shaders.current().particleBudget}\n`);
process.stdout.write(`→ dominant: ${mid.overrides[0]?.id ?? 'none'}\n`);
process.stdout.write(`→ restore: ${JSON.stringify(fresh.capture()) === JSON.stringify(snapshot)}\n`);

if (values[values.length - 1] !== '1.00' || mid.overrides.length !== 1 || JSON.stringify(fresh.capture()) !== JSON.stringify(snapshot)) {
  process.stderr.write('DEMO M9 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M9 OK — tier → переход → приоритет оверрайдов → restore\n');
