/**
 * TKT-M3-026: демо M3 — N тиков → save → load → идентичное продолжение.
 * Запуск: bun scripts/demo-m3.ts
 */
import { bootstrap, type GameApp } from '../src/bootstrap/GameBootstrap.js';
import { SaveGameUseCase } from '../src/application/save/SaveGameUseCase.js';
import { LoadGameUseCase } from '../src/application/save/LoadGameUseCase.js';
import { makeStreamName } from '../src/domain/rng/RngStreamName.js';

const TICKS = 50;
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
    app.rng.nextFloat(combat);
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
    process.stderr.write(`bootstrap failed: ${bootResult.error.message}\n`);
    process.exit(1);
  }
  const app = bootResult.value;
  app.runtime.activate('stub-counter-tracker');

  await run(app, TICKS);
  process.stdout.write('→ прогон до точки сохранения (50 тиков)\n');

  // 1. Save — отдельная сессия, чтобы репозиторий пережил «сброс».
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
  }).execute('demo');
  if (!saved.ok) {
    process.stderr.write(`save failed: ${saved.error.message}\n`);
    process.exit(1);
  }
  process.stdout.write('→ сохранено в слот demo\n');

  // 2. Новая «сессия» + загрузка из общего репозитория.
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
  }).execute('demo');
  if (!loaded.ok) {
    process.stderr.write(`load failed: ${loaded.error.message}\n`);
    process.exit(1);
  }
  process.stdout.write('→ загружено из слота demo\n');

  // 3. Эталон: продолжаем исходное приложение ещё 50 тиков (без save/load).
  const expected = await run(app, TICKS);
  const afterLoadState = await run(fresh, TICKS);

  process.stdout.write(`→ rng identical: ${String(sameJson(expected.rng, afterLoadState.rng))}\n`);
  process.stdout.write(`→ runtime identical: ${String(sameJson(expected.runtime, afterLoadState.runtime))}\n`);
  process.stdout.write(`→ total ticks: ${String(fresh.scheduler.currentTick())}\n`);

  const identical = sameJson(expected.rng, afterLoadState.rng) && sameJson(expected.runtime, afterLoadState.runtime);
  if (!identical) {
    process.stderr.write('DEMO M3 FAILED: состояние после save/load не совпало с эталоном\n');
    process.exit(1);
  }
  process.stdout.write('DEMO M3 OK — 50 тиков → save → load → 50 тиков → идентично\n');
}

await main();
