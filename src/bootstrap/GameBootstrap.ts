import { err, ok, type Result } from '../domain/result/Result.js';
import { makeAppError, type AppError } from '../domain/app-error/AppError.js';
import { validateAppConfig, type AppConfig } from '../domain/config/AppConfig.js';
import type { Logger } from '../shared/logging/Logger.js';
import { NoopLogger } from '../infrastructure/logging/NoopLogger.js';
import { InMemoryEventRegistry } from '../infrastructure/events/InMemoryEventRegistry.js';
import { EventPayloadValidator } from '../infrastructure/events/EventPayloadValidator.js';
import { InMemoryEventBus } from '../infrastructure/events/InMemoryEventBus.js';
import type { EventType } from '../shared/events/EventType.js';
import { makeEventType } from '../shared/events/EventType.js';
import { makeEventDefinition } from '../domain/events/EventDefinition.js';
import { AjvSchemaValidator } from '../infrastructure/content/AjvSchemaValidator.js';
import type { IContentRegistry } from '../domain/content/IContentRegistry.js';
import { InMemoryContentRegistry } from '../infrastructure/content/InMemoryContentRegistry.js';
import { JsonContentRegistry } from '../infrastructure/content/JsonContentRegistry.js';
import { MementoRegistry } from '../infrastructure/save/MementoRegistry.js';
import { InMemorySaveRepository } from '../infrastructure/save/InMemorySaveRepository.js';
import { SaveSnapshotValidator } from '../infrastructure/save/SaveSnapshotValidator.js';
import { SeededRngService } from '../infrastructure/rng/SeededRngService.js';
import { MechanicRegistry } from '../infrastructure/mechanics/MechanicRegistry.js';
import { StateSchemaValidator } from '../infrastructure/mechanics/StateSchemaValidator.js';
import { MechanicRuntime } from '../infrastructure/mechanics/MechanicRuntime.js';
import { StubTickLoggerResolver } from '../infrastructure/mechanics/plugins/stub/StubTickLoggerResolver.js';
import { StubCounterTracker } from '../infrastructure/mechanics/plugins/stub/StubCounterTracker.js';
import { StubEventCounterResolver } from '../infrastructure/mechanics/plugins/stub/StubEventCounterResolver.js';
import { RngMementoProvider } from '../infrastructure/save/providers/RngMementoProvider.js';
import { MechanicRuntimeMementoProvider } from '../infrastructure/save/providers/MechanicRuntimeMementoProvider.js';
import { TickScheduler } from '../infrastructure/clock/TickScheduler.js';
import { ManualGameClock } from '../infrastructure/clock/ManualGameClock.js';
import type { IGameClock } from '../domain/clock/IGameClock.js';
import type { ILocalizationService } from '../domain/localization/ILocalizationService.js';
import { InMemoryLocalizationService } from '../infrastructure/localization/InMemoryLocalizationService.js';
import { JsonLocalizationService } from '../infrastructure/localization/JsonLocalizationService.js';
import { loadSchemasFromContentRoot, type SchemasBag } from './LoadSchemas.js';
import type { MechanicDefinition, MechanicScope } from '../domain/mechanics/MechanicDefinition.js';

export interface GameBootstrapOptions {
  readonly config?: Partial<AppConfig> & Record<string, unknown>;
  readonly logger?: Logger;
  /** По умолчанию InMemory-режим (без диска). */
  readonly contentMode?: 'in-memory' | 'json';
  readonly contentRoot?: string;
  readonly env?: 'development' | 'production' | 'test';
}

export interface GameApp {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly eventRegistry: InMemoryEventRegistry;
  readonly eventBus: InMemoryEventBus;
  readonly validator: AjvSchemaValidator;
  readonly content: IContentRegistry;
  readonly rng: SeededRngService;
  readonly mechanicRegistry: MechanicRegistry;
  readonly runtime: MechanicRuntime;
  readonly mementos: MementoRegistry;
  readonly scheduler: TickScheduler;
  readonly clock: IGameClock;
  readonly localization: ILocalizationService;
}

/** Расширение GameApp: валидатор снапшота и in-memory репозиторий (используется в демо). */
export interface SavedGameApp extends GameApp {
  readonly snapshotValidator: SaveSnapshotValidator;
  readonly repository: InMemorySaveRepository;
}

function bootstrapError(message: string): AppError {
  return makeAppError('INFRA_UNEXPECTED', message);
}

/**
 * TKT-M4-019 (ранее TKT-M1-006): bootstrap всех foundation-сервисов.
 * Порядок: Logger → AppConfig → EventBus → Content → RNG → Mechanics → Memento → Save → Clock → Localization.
 * Ошибка на шаге N — шаги > N не выполняются.
 */
export async function bootstrap(options: GameBootstrapOptions = {}): Promise<Result<SavedGameApp, AppError>> {
  // 1. Logger
  const logger = options.logger ?? new NoopLogger();

  // 2. AppConfig
  const configResult = validateAppConfig({ env: options.env ?? 'development', ...options.config });
  if (!configResult.ok) return configResult as Result<SavedGameApp, AppError>;
  const config = configResult.value;

  // 3. Схемы в AjvSchemaValidator
  const schemas = loadSchemasFromContentRoot(options.contentRoot ?? config.contentRoot);
  if (!schemas.ok) return schemas as Result<SavedGameApp, AppError>;
  const validator = new AjvSchemaValidator();
  for (const [name, schema] of Object.entries(schemas.value)) {
    validator.registerSchema(name, schema);
  }

  // 3.1 EventRegistry + шина
  const eventRegistry = new InMemoryEventRegistry();
  const eventBus = new InMemoryEventBus(eventRegistry, new EventPayloadValidator(), logger);

  // 4. Content
  let content: IContentRegistry;
  if (options.contentMode === 'json') {
    const jsonRegistry = new JsonContentRegistry(config.contentRoot, validator, config.env);
    const loadResult = jsonRegistry.loadAll();
    if (!loadResult.ok) return loadResult as Result<SavedGameApp, AppError>;
    content = jsonRegistry;
  } else {
    content = new InMemoryContentRegistry({ event: {}, mechanic: {} }, validator);
  }

  // 4.1 Регистрация событий контента в реестре; в in-memory-режиме — встроенные core-события.
  const coreEvents: Record<string, unknown>[] = options.contentMode === 'json'
    ? []
    : [
        { type: 'world.tick_advanced', source: 'core' },
        { type: 'combat.started', source: 'core' },
      ];
  const eventSources = [...coreEvents, ...content.list<Record<string, unknown>>('event').map((e) => e.content)];
  for (const raw of eventSources) {
    try {
      const definition = makeEventDefinition(raw);
      const type = makeEventType(definition.type);
      const registered = eventRegistry.register({ ...definition, type });
      if (!registered.ok) return registered as Result<SavedGameApp, AppError>;
    } catch (e) {
      return err(bootstrapError(`Invalid event definition: ${String(e)}`));
    }
  }

  // 5. RNG
  const rng = new SeededRngService(config.masterSeed);

  // 6. Mechanics
  const mechanicRegistry = new MechanicRegistry({
    eventRegistryHas: (type: string) => eventRegistry.has(type as EventType),
  });
  const stateValidator = new StateSchemaValidator();
  const runtime = new MechanicRuntime({
    registry: mechanicRegistry,
    eventBus,
    rng,
    logger,
    stateValidator,
  });

  // 7. Memento + Save
  const mementos = new MementoRegistry();
  mementos.register(new RngMementoProvider(rng));
  mementos.register(new MechanicRuntimeMementoProvider(runtime));
  const snapshotSchema = schemas.value['save-snapshot'] ?? {};
  const snapshotValidator = new SaveSnapshotValidator(snapshotSchema);
  const saveRepository = new InMemorySaveRepository();

  // 8. Clock
  const scheduler = new TickScheduler({ eventBus, runtime, logger });
  const clock = new ManualGameClock({ runTick: () => void scheduler.runOneTick() });

  // Связка: события world.tick_advanced из шины обрабатывают механики через runtime.
  eventBus.subscribe(makeEventType('world.tick_advanced'), (e) => runtime.dispatchEvent(e as never));

  // 9. Localization: JSON-режим читает content/locales, in-memory — встроенные словари.
  const localization = options.contentMode === 'json'
    ? new JsonLocalizationService(
        { contentRoot: config.contentRoot, locale: config.language, logger, env: config.env },
      )
    : new InMemoryLocalizationService({ 'ru-RU': {}, 'en-US': {} }, config.language, logger);

  const app: GameApp = {
    config,
    logger,
    eventRegistry,
    eventBus,
    validator,
    content,
    rng,
    mechanicRegistry,
    runtime,
    mementos,
    scheduler,
    clock,
    localization,
  };

  // 10. initDomains — регистрация stub-механик из контента.
  const domainsResult = registerStubMechanics(app, schemas.value);
  if (!domainsResult.ok)  return domainsResult as Result<SavedGameApp, AppError>;

  const appWithSaves: SavedGameApp = { ...app, snapshotValidator, repository: saveRepository };

  return ok(appWithSaves);
}

/** TKT-M4-019: initDomains — регистрация stub-плагинов. */
export function registerStubMechanics(app: GameApp, _schemas: SchemasBag): Result<void, AppError> {
  const plugins = [
    new StubTickLoggerResolver(),
    new StubCounterTracker(),
    new StubEventCounterResolver(),
  ];
  const defsFromContent = app.content.list<Record<string, unknown>>('mechanic');
  for (const plugin of plugins) {
    const defRaw = defsFromContent.find((d) => d.content.id === plugin.definitionId)?.content
      ?? (inlineStubDefinitions().find((d) => d.id === plugin.definitionId) as Record<string, unknown> | undefined);
    if (!defRaw) {
      return err(bootstrapError(`No definition found for ${plugin.definitionId}`));
    }
    const definition = normalizeMechanicDefinition(defRaw);
    if (definition.stateSchema) {
      // Схему состояния регистрируем в отдельном валидаторе рантайма — валидация при setState.
      app.runtime.registerStateSchema(definition);
      app.validator.registerSchema(`mechanic-state:${definition.id}`, definition.stateSchema);
    }
    const registered = app.mechanicRegistry.register(plugin, definition);
    if (!registered.ok) return registered;
  }
  return ok(undefined);
}

export const STUB_STATE_COUNTER: object = {
  type: 'object',
  required: ['count'],
  properties: { count: { type: 'integer' } },
  additionalProperties: false,
};

/** Inline-определения stub-механик (для контента без диска). */
export function inlineStubDefinitions(): readonly Record<string, unknown>[] {
  return [
    {
      id: 'stub-tick-logger-resolver',
      kind: 'resolver',
      factionTags: [],
      branchTags: [],
      shipClassTags: [],
      facetTags: [],
      roleTags: ['epilogue'],
      params: {},
      consumes: ['world.tick_advanced'],
      emits: [],
      stateSchema: null,
      counterplayTags: [],
      validationRules: { paramsSchema: { type: 'object' } },
      priority: 10,
      lifecycle: { scope: 'world', persisted: false },
      display_name_key: 'mechanic.stub-tick-logger-resolver.name',
      description_key: 'mechanic.stub-tick-logger-resolver.desc',
    },
    {
      id: 'stub-counter-tracker',
      kind: 'tracker',
      factionTags: [],
      branchTags: [],
      shipClassTags: [],
      facetTags: [],
      roleTags: ['stub'],
      params: {},
      consumes: ['world.tick_advanced'],
      emits: [],
      stateSchema: STUB_STATE_COUNTER,
      counterplayTags: [],
      validationRules: { paramsSchema: { type: 'object' } },
      priority: 5,
      lifecycle: { scope: 'world', persisted: true },
      display_name_key: 'mechanic.stub-counter-tracker.name',
      description_key: 'mechanic.stub-counter-tracker.desc',
    },
    {
      id: 'stub-event-counter-resolver',
      kind: 'resolver',
      factionTags: [],
      branchTags: [],
      shipClassTags: [],
      facetTags: [],
      roleTags: ['stub'],
      params: {},
      consumes: ['combat.started'],
      emits: [],
      stateSchema: null,
      counterplayTags: [],
      validationRules: { paramsSchema: { type: 'object' } },
      priority: 1,
      lifecycle: { scope: 'combat', persisted: false },
      display_name_key: 'mechanic.stub-event-counter-resolver.name',
      description_key: 'mechanic.stub-event-counter-resolver.desc',
    },
  ];
}

/** Приведение контента к типу MechanicDefinition. */
export function normalizeMechanicDefinition(raw: Record<string, unknown>): MechanicDefinition {
  return {
    id: raw.id as string,
    kind: raw.kind as 'resolver' | 'tracker',
    factionTags: (raw.factionTags ?? []) as string[],
    branchTags: (raw.branchTags ?? []) as string[],
    shipClassTags: (raw.shipClassTags ?? []) as string[],
    facetTags: (raw.facetTags ?? []) as string[],
    roleTags: (raw.roleTags ?? []) as string[],
    params: (raw.params ?? {}) as Record<string, unknown>,
    consumes: (raw.consumes ?? []) as string[],
    emits: (raw.emits ?? []) as string[],
    stateSchema: (raw.stateSchema ?? null) as object | null,
    counterplayTags: (raw.counterplayTags ?? []) as string[],
    validationRules: (raw.validationRules ?? { paramsSchema: { type: 'object' } }) as {
      paramsSchema: object;
    },
    priority: raw.priority as number,
    lifecycle: raw.lifecycle as { scope: MechanicScope; persisted: boolean },
  };
}
