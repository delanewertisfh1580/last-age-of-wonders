import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';
import { LocalStorageSaveRepository } from '../../infrastructure/save/LocalStorageSaveRepository.js';
import { GameSession, type SessionSnapshot } from './GameSession.js';

const SLOT_ID = 'campaign';
const CONTENT_HASH = 'nvm-web-demo-v1';

function repository(storage: Storage): LocalStorageSaveRepository {
  return new LocalStorageSaveRepository(storage);
}

/** Сохраняет кампанию в localStorage через существующий SaveRepository (SaveSnapshot v1). */
export function saveSession(storage: Storage, session: GameSession): Result<void, AppError> {
  const snapshot: SaveSnapshot = {
    formatVersion: 1,
    savedAtMs: Date.now(),
    contentHash: CONTENT_HASH,
    rngState: session.rngState(),
    mechanicRuntimeState: {},
    domainStates: { webSession: session.snapshot() },
    eventQueueState: { nextTick: [], afterScene: [], warning: [] },
    completedCombatsJournal: [],
    completedCataclysmsJournal: [],
    epilogueEventsJournal: [],
    transformationEventsJournal: [],
    narrativeEventsJournal: [],
    partyEventsJournal: [],
  };
  return repository(storage).save(SLOT_ID, snapshot);
}

export function hasSave(storage: Storage): boolean {
  const exists = repository(storage).exists(SLOT_ID);
  return exists.ok && exists.value;
}

export function clearSave(storage: Storage): Result<void, AppError> {
  return repository(storage).delete(SLOT_ID);
}

export function loadSession(storage: Storage): Result<GameSession, AppError> {
  const loaded = repository(storage).load(SLOT_ID);
  if (!loaded.ok) return loaded as Result<GameSession, AppError>;
  const raw = loaded.value.domainStates['webSession'];
  if (typeof raw !== 'object' || raw === null) {
    return err(makeAppError('SAVE_INVALID_SNAPSHOT', 'В сохранении нет состояния кампании.'));
  }
  const sessionSnapshot = raw as SessionSnapshot;
  if (sessionSnapshot.version !== 1) {
    return err(makeAppError('SAVE_INVALID_SNAPSHOT', 'Неизвестная версия сохранения.'));
  }
  return ok(GameSession.fromSnapshot(sessionSnapshot, loaded.value.rngState));
}
