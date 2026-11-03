/**
 * TKT-M2-018: демо M2 — контент загружен, механики зарегистрированы, события идут.
 * Запуск: bun scripts/demo-m2.ts
 */
import { bootstrap } from '../src/bootstrap/GameBootstrap.js';
import { makeEventType } from '../src/shared/events/EventType.js';

async function main(): Promise<void> {
  process.stdout.write('→ bootstrap\n');
  const bootResult = await bootstrap({ env: 'development', contentMode: 'json', contentRoot: 'content' });
  if (!bootResult.ok) {
    process.stderr.write(`bootstrap failed: ${bootResult.error.code} ${bootResult.error.message}\n`);
    process.exit(1);
  }
  const app = bootResult.value;

  process.stdout.write('→ content loaded (hash: ' + app.content.contentHash() + ')\n');
  process.stdout.write('→ mechanics registered: ' + app.mechanicRegistry.list().map((d) => d.id).join(', ') + '\n');

  const activated = app.runtime.activate('stub-counter-tracker');
  if (!activated.ok) {
    process.stderr.write(`activate failed: ${activated.error.message}\n`);
    process.exit(1);
  }

  process.stdout.write('→ publish world.tick_advanced\n');
  const published = app.eventBus.publish({ type: makeEventType('world.tick_advanced'), payload: { tick: 0 } });
  if (!published.ok) {
    process.stderr.write(`publish failed: ${published.error.message}\n`);
    process.exit(1);
  }

  const stateResult = app.runtime.getState('stub-counter-tracker');
  if (!stateResult.ok) {
    process.stderr.write(`getState failed: ${stateResult.error.message}\n`);
    process.exit(1);
  }
  const count = (stateResult.value as { count?: number } | null)?.count ?? 0;
  process.stdout.write(`→ state: { count: ${count} }\n`);

  if (count !== 1) {
    process.stderr.write('DEMO M2 FAILED: expected count === 1\n');
    process.exit(1);
  }

  // Один тик через планировщик
  await app.scheduler.runOneTick();
  const stateAfterTick = app.runtime.getState('stub-counter-tracker');
  const afterCount = ((stateAfterTick.ok ? stateAfterTick.value : null) as { count?: number } | null)?.count ?? 0;
  process.stdout.write(`→ after scheduler tick: { count: ${afterCount} }\n`);
  process.stdout.write('DEMO M2 OK — content loaded → mechanics registered → event dispatched → state updated\n');
}

await main();
