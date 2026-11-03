import { describe, it, expect } from 'vitest';
import { bootstrap, type SavedGameApp } from '../../src/bootstrap/GameBootstrap.js';
import { SaveGameUseCase } from '../../src/application/save/SaveGameUseCase.js';
import { LoadGameUseCase } from '../../src/application/save/LoadGameUseCase.js';
import { makeStreamName } from '../../src/domain/rng/RngStreamName.js';
import { makeEventType } from '../../src/shared/events/EventType.js';

const N = 20;
const combat = makeStreamName('rng.combat.damage');
const worldTick = makeEventType('world.tick_advanced');

interface FinalState {
  readonly rng: string;
  readonly runtime: string;
}

/** Прогон шага: N вызовов RNG + N dispatchEvent. */
async function step(app: SavedGameApp): Promise<void> {
  for (let i = 0; i < N; i++) {
    const r = app.rng.nextFloat(combat);
    if (!r.ok) throw new Error('rng failed');
    app.runtime.dispatchEvent({
      type: worldTick,
      payload: { tick: i },
      emittedAtTick: i,
      emittedAtMs: 0,
      source: 'core',
    });
  }
}

function simState(app: SavedGameApp): FinalState {
  return JSON.parse(
    JSON.stringify({
      rng: app.rng.serializeAll(),
      runtime: app.runtime.captureRuntimeState(),
    }),
  ) as FinalState;
}

describe('TKT-M3-020: детерминизм roundtrip save/load', () => {
  it('AC01–AC03:(rng, домены, журналы) — идентичны после roundtrip', async () => {
    // 1. Прогон N шагов в исходной сессии.
    const referenceBoot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!referenceBoot.ok) throw new Error('bootstrap failed');
    const reference = referenceBoot.value;
    reference.runtime.activate('stub-counter-tracker');
    await step(reference);

    // 2. Сохранение снапшота середины прогона.
    const saved = new SaveGameUseCase({
      mementos: reference.mementos,
      validator: reference.snapshotValidator,
      repository: reference.repository,
      rng: reference.rng,
      runtime: reference.runtime,
      content: reference.content,
      eventBus: reference.eventBus,
    }).execute('determinism');
    expect(saved.ok).toBe(true);

    // 3. Эталон: продолжение исходной сессии ещё на N шагов (без save/load).
    await step(reference);
    const expected = simState(reference);

    // 4. Новая сессия → загрузка → продолжение на N шагов.
    const restoredBoot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!restoredBoot.ok) throw new Error('bootstrap failed');
    const restored = restoredBoot.value;
    restored.runtime.activate('stub-counter-tracker');

    const loaded = new LoadGameUseCase({
      repository: reference.repository,
      validator: restored.snapshotValidator,
      mementos: restored.mementos,
      rng: restored.rng,
      runtime: restored.runtime,
      content: restored.content,
      env: 'test',
    }).execute('determinism');
    expect(loaded.ok).toBe(true);

    await step(restored);
    const actual = simState(restored);

    // 5. Сравнение с эталоном.
    expect(JSON.stringify(actual.rng)).toBe(JSON.stringify(expected.rng));
    expect(JSON.stringify(actual.runtime)).toBe(JSON.stringify(expected.runtime));
  });
});
