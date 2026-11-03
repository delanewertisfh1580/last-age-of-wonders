import { ok, err, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { MementoRegistry } from '../../infrastructure/save/MementoRegistry.js';
import type { SaveSnapshotValidator } from '../../infrastructure/save/SaveSnapshotValidator.js';
import type { ISaveRepository } from '../../domain/save/ISaveRepository.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';
import type { IRngService } from '../../domain/rng/IRngService.js';
import type { IMechanicRuntime } from '../../domain/mechanics/IMechanicRuntime.js';
import type { IContentRegistry } from '../../domain/content/IContentRegistry.js';
import type { IEventBus } from '../../domain/events/IEventBus.js';

export interface SaveGameOptions {
  readonly mementos: MementoRegistry;
  readonly validator: SaveSnapshotValidator;
  readonly repository: ISaveRepository;
  readonly rng: IRngService;
  readonly runtime: IMechanicRuntime;
  readonly content: IContentRegistry;
  readonly eventBus: IEventBus;
  readonly now?: () => number;
}

/** TKT-M3-014: сборка и сохранение SaveSnapshot. */
export class SaveGameUseCase {
  constructor(private readonly o: SaveGameOptions) {}

  execute(slotId: string): Result<SaveSnapshot, AppError> {
    const domainStates: Record<string, unknown> = {};
    for (const provider of this.o.mementos.list()) {
      const captured = provider.captureState();
      if (!captured.ok) {
        return err(
          makeAppError('SAVE_LOAD_FAILED', `Provider ${provider.domainId} failed while capturing`, {
            domainId: provider.domainId,
            cause: captured.error.message,
          }),
        );
      }
      domainStates[provider.domainId] = captured.value;
    }

    const snapshot: SaveSnapshot = {
      formatVersion: 1,
      savedAtMs: (this.o.now ?? Date.now)(),
      contentHash: this.o.content.contentHash(),
      rngState: this.o.rng.serializeAll(),
      mechanicRuntimeState: this.o.runtime.captureRuntimeState(),
      domainStates,
      eventQueueState: {
        nextTick: [...this.o.eventBus.peekQueue('NextTick')],
        afterScene: [...this.o.eventBus.peekQueue('AfterScene')],
        warning: [...this.o.eventBus.peekQueue('WarningThenImpact')],
      },
      completedCombatsJournal: [],
      completedCataclysmsJournal: [],
      epilogueEventsJournal: [],
      transformationEventsJournal: [],
      narrativeEventsJournal: [],
      partyEventsJournal: [],
    };

    const validated = this.o.validator.validate(snapshot);
    if (!validated.ok) return validated;

    const saved = this.o.repository.save(slotId, validated.value);
    if (!saved.ok) return saved as Result<SaveSnapshot, AppError>;

    return ok(validated.value);
  }
}
