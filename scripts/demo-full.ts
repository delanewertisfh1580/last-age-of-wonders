/**
 * TKT-M4-020: полноценное демо walking skeleton.
 * bootstrap → контент → локализация → 20 тиков → save → load → 20 тиков → identical → ci:validate.
 * Запуск: bun scripts/demo-full.ts
 */
import { bootstrap, type GameApp } from '../src/bootstrap/GameBootstrap.js';
import { SaveGameUseCase } from '../src/application/save/SaveGameUseCase.js';
import { LoadGameUseCase } from '../src/application/save/LoadGameUseCase.js';
import { makeStreamName } from '../src/domain/rng/RngStreamName.js';
import { makeEventType } from '../src/shared/events/EventType.js';

const TICKS = 20;
const combat = makeStreamName('rng.combat.damage');

interface SimState {
  readonly rng: string;
  readonly runtime: string;
}

function simState(app: GameApp): SimState {
  return JSON.parse(JSON.stringify({
    rng: app.rng.serializeAll(),
    runtime: app.runtime.captureRuntimeState(),
  })) as SimState;
}

async function run(app: GameApp, ticks: number): Promise<SimState> {
  for (let i = 0; i < ticks; i++) {
    // RNG вызовы + механики реагируют на события такта.
    app.rng.nextFloat(combat);
    app.eventBus.publish({ type: makeEventType('combat.started'), payload: { tick: i } });
    await app.scheduler.runOneTick();
  }
  return simState(app);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main(): Promise<void> {
  process.stdout.write('→ bootstrap\n');
  const bootResult = await bootstrap({ env: 'development', contentMode: 'json', contentRoot: 'content' });
  if (!bootResult.ok) {
    process.stderr.write(`bootstrap failed: ${bootResult.error.code} ${bootResult.error.message}\n`);
    process.exit(1);
  }
  const app = bootResult.value;

  process.stdout.write('→ контент загружен (hash: ' + app.content.contentHash() + ')\n');

  // Локализация.
  const locName = app.localization.t('mechanic.stub-counter-tracker.name');
  process.stdout.write(`→ локализация: ${locName}\n`);
  const foreignLocale = app.localization.setLocale('en-US');
  if (!foreignLocale.ok) {
    process.stderr.write(`setLocale failed: ${foreignLocale.error.message}\n`);
    process.exit(1);
  }
  process.stdout.write(`→ локализация en: ${app.localization.t('mechanic.stub-counter-tracker.name')}\n`);
  app.localization.setLocale('ru-RU');

  app.runtime.activate('stub-counter-tracker');
  const beforeCheck = (app.runtime.getState('stub-counter-tracker').ok) ? 'ok' : 'fail';
  if (beforeCheck === 'fail') {
    process.stderr.write('activate/getState failed\n');
    process.exit(1);
  }

  await run(app, TICKS);
  process.stdout.write('→ прогон до точки сохранения (20 тиков)\n');

  const saveSession = await bootstrap({ env: 'development', contentMode: 'json', contentRoot: 'content' });
  if (!saveSession.ok) {
    process.stderr.write('save bootstrap failed\n');
    process.exit(1);
  }
  const saved = new SaveGameUseCase({
    mementos: app.mementos,
    validator: app.snapshotValidator,
    repository: saveSession.value.repository,
    rng: app.rng,
    runtime: app.runtime,
    content: app.content,
    eventBus: app.eventBus,
  }).execute('full-demo');
  if (!saved.ok) {
    process.stderr.write(`save failed: ${saved.error.message}\n`);
    process.exit(1);
  }
  process.stdout.write('→ сохранено в слот full-demo\n');

  const freshSession = await bootstrap({ env: 'development', contentMode: 'json', contentRoot: 'content' });
  if (!freshSession.ok) {
    process.stderr.write('fresh bootstrap failed\n');
    process.exit(1);
  }
  const fresh = freshSession.value;
  fresh.runtime.activate('stub-counter-tracker');
  fresh.eventBus.clear();

  const loaded = new LoadGameUseCase({
    repository: saveSession.value.repository,
    validator: fresh.snapshotValidator,
    mementos: fresh.mementos,
    rng: fresh.rng,
    runtime: fresh.runtime,
    content: fresh.content,
    env: 'development',
  }).execute('full-demo');
  if (!loaded.ok) {
    process.stderr.write(`load failed: ${loaded.error.message}\n`);
    process.exit(1);
  }
  process.stdout.write('→ загружено из full-demo\n');

  const expected = await run(app, TICKS);

  await run(fresh, TICKS);
  const afterLoadState = simState(fresh);

  const rngIdentical = sameJson(expected.rng, afterLoadState.rng);
  const runtimeIdentical = sameJson(expected.runtime, afterLoadState.runtime);
  process.stdout.write(`→ rng identical: ${String(rngIdentical)}\n`);
  process.stdout.write(`→ runtime identical: ${String(runtimeIdentical)}\n`);
  process.stdout.write(`→ total ticks: ${String(fresh.scheduler.currentTick())}\n`);

  if (!rngIdentical || !runtimeIdentical) {
    process.stderr.write('DEMO M4 FAILED: идентичность нарушена\n');
    process.exit(1);
  }
  process.stdout.write('DEMO FULL OK — bootstrap → content → 20 ticks → save → load → 20 ticks → identical\n');
  process.stdout.write('(шаг ci:validate запускается отдельно: bun run ci:validate)\n');
}

await main();
