import { describe, it, expect } from 'vitest';
import { bootstrap, type SavedGameApp } from '../../src/bootstrap/GameBootstrap.js';
import { SaveGameUseCase } from '../../src/application/save/SaveGameUseCase.js';
import { LoadGameUseCase } from '../../src/application/save/LoadGameUseCase.js';
import { ListSavesUseCase } from '../../src/application/save/ListSavesUseCase.js';
import { DeleteSaveUseCase } from '../../src/application/save/DeleteSaveUseCase.js';
import { checkContentHash } from '../../src/application/save/CheckContentHash.js';
import { InMemorySaveRepository } from '../../src/infrastructure/save/InMemorySaveRepository.js';
import { LocalStorageSaveRepository } from '../../src/infrastructure/save/LocalStorageSaveRepository.js';
import { makeEventType } from '../../src/shared/events/EventType.js';
import { makeStreamName } from '../../src/domain/rng/RngStreamName.js';

const combat = makeStreamName('rng.combat.damage');
const worldTick = makeEventType('world.tick_advanced');

async function appWithUsage(): Promise<SavedGameApp> {
  const boot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
  if (!boot.ok) throw new Error('bootstrap failed');
  const app = boot.value;
  app.runtime.activate('stub-counter-tracker');
  for (let i = 0; i < 5; i++) {
    const call = app.rng.nextFloat(combat);
    if (!call.ok) throw new Error('rng failed');
    app.runtime.dispatchEvent({ type: worldTick, payload: {}, emittedAtTick: i, emittedAtMs: 0, source: 'core' });
  }
  return app;
}

describe('TKT-M3-011: MementoRegistry', () => {
  it('регистрация, дубликат, list, get', async () => {
    const app = await appWithUsage();
    const extra = {
      domainId: 'test-domain',
      captureState: () => ({ ok: true as const, value: 1 }),
      restoreState: () => ({ ok: true as const, value: undefined }),
    };
    expect(app.mementos.register(extra).ok).toBe(true);
    expect(app.mementos.register(extra).ok).toBe(false);
    const ids = app.mementos.list().map((p) => p.domainId);
    expect(ids).toEqual([...ids].sort());
    expect(app.mementos.get('rng').ok).toBe(true);
    expect(app.mementos.get('missing').ok).toBe(false);
  });
});

describe('TKT-M3-013/012: репозитории', () => {
  it('InMemory: save/load/list/delete/exists', async () => {
    const app = await appWithUsage();
    const repo = new InMemorySaveRepository();
    const save = new SaveGameUseCase({
      mementos: app.mementos,
      validator: app.snapshotValidator,
      repository: repo,
      rng: app.rng,
      runtime: app.runtime,
      content: app.content,
      eventBus: app.eventBus,
    });
    expect(save.execute('slot-a').ok).toBe(true);

    const exists = repo.exists('slot-a');
    expect(exists.ok && exists.value).toBe(true);
    expect(repo.load('missing').ok).toBe(false);
    const listed = repo.list();
    expect(listed.ok && listed.value.some((m) => m.slotId === 'slot-a')).toBe(true);

    expect(repo.delete('slot-a').ok).toBe(true);
    const gone = repo.exists('slot-a');
    expect(gone.ok && !gone.value).toBe(true);
  });

  it('LocalStorage-мок: save → load roundtrip идентичен', async () => {
    const app = await appWithUsage();
    const storage = new Map<string, string>();
    const repo = new LocalStorageSaveRepository({
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    } as never);
    const save = new SaveGameUseCase({
      mementos: app.mementos,
      validator: app.snapshotValidator,
      repository: repo,
      rng: app.rng,
      runtime: app.runtime,
      content: app.content,
      eventBus: app.eventBus,
    });
    expect(save.execute('ls-slot').ok).toBe(true);
    const loaded = repo.load('ls-slot');
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.rngState).toEqual(app.rng.serializeAll());
    }
  });
});

describe('TKT-M3-014/015: Save/Load use cases', () => {
  it('save → load: RNG и runtime восстанавливаются точно', async () => {
    const original = await appWithUsage();
    const repo = new InMemorySaveRepository();
    const saved = new SaveGameUseCase({
      mementos: original.mementos,
      validator: original.snapshotValidator,
      repository: repo,
      rng: original.rng,
      runtime: original.runtime,
      content: original.content,
      eventBus: original.eventBus,
    }).execute('slot-x');
    expect(saved.ok).toBe(true);

    // Новая сессия
    const freshBoot = await bootstrap({ env: 'test', contentMode: 'in-memory' });
    if (!freshBoot.ok) throw new Error('bootstrap failed');
    const fresh = freshBoot.value;
    fresh.runtime.activate('stub-counter-tracker');
    fresh.eventBus.clear();

    const loaded = new LoadGameUseCase({
      repository: repo,
      validator: fresh.snapshotValidator,
      mementos: fresh.mementos,
      rng: fresh.rng,
      runtime: fresh.runtime,
      content: fresh.content,
      env: 'test',
    }).execute('slot-x');
    expect(loaded.ok).toBe(true);

    // RNG идентичен сохранённым потокам, runtime state восстановлен.
    expect(JSON.stringify(fresh.rng.serializeAll())).toBe(JSON.stringify(original.rng.serializeAll()));
    expect(JSON.stringify(fresh.runtime.captureRuntimeState())).toBe(
      JSON.stringify(original.runtime.captureRuntimeState()),
    );
  });

  it('AC04: mismatch contentHash в production → Err; в dev → Ok', async () => {
    const app = await appWithUsage();
    const fakeSnapshot = {
      formatVersion: 1 as const,
      savedAtMs: 0,
      contentHash: 'a'.repeat(64),
      rngState: app.rng.serializeAll(),
      mechanicRuntimeState: app.runtime.captureRuntimeState(),
      domainStates: {},
      eventQueueState: { nextTick: [], afterScene: [], warning: [] },
      completedCombatsJournal: [],
      completedCataclysmsJournal: [],
      epilogueEventsJournal: [],
      transformationEventsJournal: [],
      narrativeEventsJournal: [],
      partyEventsJournal: [],
    };
    const blocked = checkContentHash({ snapshot: fakeSnapshot, registry: app.content, env: 'production' });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe('SAVE_CONTENT_HASH_MISMATCH');

    expect(checkContentHash({ snapshot: fakeSnapshot, registry: app.content, env: 'development' }).ok).toBe(true);
    expect(
      checkContentHash({
        snapshot: { ...fakeSnapshot, contentHash: 'in-memory-stub' },
        registry: app.content,
        env: 'production',
      }).ok,
    ).toBe(true);
  });

  it('AC05: невалидный snapshot → Err валидатора', async () => {
    const app = await appWithUsage();
    const result = app.snapshotValidator.validate({ formatVersion: 1 });
    expect(result.ok).toBe(false);
  });

  it('AC06: formatVersion 2 → Err', async () => {
    const app = await appWithUsage();
    const result = app.snapshotValidator.validate({
      formatVersion: 2,
      savedAtMs: 0,
      contentHash: 'in-memory-stub',
      rngState: {},
      mechanicRuntimeState: {},
      domainStates: {},
      eventQueueState: { nextTick: [], afterScene: [], warning: [] },
      completedCombatsJournal: [],
      completedCataclysmsJournal: [],
      epilogueEventsJournal: [],
      transformationEventsJournal: [],
      narrativeEventsJournal: [],
      partyEventsJournal: [],
    });
    expect(result.ok).toBe(false);
  });

  it('AC07: ошибка провайдера → общий Err(SAVE_LOAD_FAILED)', async () => {
    const app = await appWithUsage();
    const failing = {
      domainId: 'boom-domain',
      captureState: () => ({ ok: false as const, error: { code: 'SAVE_LOAD_FAILED' as const, message: 'boom' } }),
      restoreState: () => ({ ok: true as const, value: undefined }),
    };
    expect(app.mementos.register(failing).ok).toBe(true);

    const saved = new SaveGameUseCase({
      mementos: app.mementos,
      validator: app.snapshotValidator,
      repository: new InMemorySaveRepository(),
      rng: app.rng,
      runtime: app.runtime,
      content: app.content,
      eventBus: app.eventBus,
    }).execute('slot-boom');
    expect(saved.ok).toBe(false);
    if (!saved.ok) expect(saved.error.code).toBe('SAVE_LOAD_FAILED');
  });
});

describe('TKT-M3-018: List/Delete use cases', () => {
  it('list возвращает слоты; delete идемпотентен', async () => {
    const app = await appWithUsage();
    const repo = new InMemorySaveRepository();
    const saveUseCase = new SaveGameUseCase({
      mementos: app.mementos,
      validator: app.snapshotValidator,
      repository: repo,
      rng: app.rng,
      runtime: app.runtime,
      content: app.content,
      eventBus: app.eventBus,
    });
    expect(saveUseCase.execute('slot-1').ok).toBe(true);

    const listed = new ListSavesUseCase(repo).execute();
    expect(listed.ok).toBe(true);
    if (listed.ok) expect(listed.value.some((m) => m.slotId === 'slot-1')).toBe(true);

    expect(new DeleteSaveUseCase(repo).execute('slot-1').ok).toBe(true);
    expect(new DeleteSaveUseCase(repo).execute('slot-1').ok).toBe(true);
  });
});

describe('TKT-M3-019: провайдеры', () => {
  it('Rng и MechanicRuntime провайдеры зарегистрированы', async () => {
    const app = await appWithUsage();
    const ids = app.mementos.list().map((p) => p.domainId);
    expect(ids).toContain('rng');
    expect(ids).toContain('mechanicRuntime');

    const rngProvider = app.mementos.get('rng');
    expect(rngProvider.ok).toBe(true);
    if (rngProvider.ok) {
      const captured = rngProvider.value.captureState();
      expect(captured.ok).toBe(true);
    }
  });
});
