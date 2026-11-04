# DEV-SPEC-024 v1.0 — «World Events & Location Changes»

**Тип документа:** Спецификация к разработке  
**Дата:** 2026-11-04  
**Статус:** draft  
**Волна:** Wave 4 (World & Cataclysms, вторая — после DEV-SPEC-023, параллельно 025/026)  
**Зависит от:** `DEV-SPEC-023` (PoliticalMapState, механики scope world, поток `rng.world.events`), `DEV-SPEC-001…007`, `DEV-SPEC-020` (торговые узлы как носители «локаций»), `DEV-SPEC-022` (шок-состояния узлов и легальность как контекст событий)  
**Блокирует:** `DEV-SPEC-025` (сценарные катаклизмы используют trigger-политики мира), `DEV-SPEC-034/035` (story beacons и лорные откровения срывают событийный календарь), `DEV-SPEC-039`  
**Основана на:** `INTENT v1.0` (INT-13, INT-29 — «события мира, слухи и квесты»), `GENERAL DESIGN v1.0` (GD-05, GD-06, GD-07/08, GD-17), `DESIGN v1.0 — «Катаклизмы»` (SPEC-CATA-002: источник `procedural` по таймеру/условию; SPEC-CATA-028: шаблоны квестов)  
**Связанные DEV-SPEC:** `DEV-SPEC-023` (исследование мира как состояния карты), `DEV-SPEC-031` (штурм города — боевое разрешение), `DEV-SPEC-029` (перевоз транспорта), `DEV-SPEC-033` (hidden-branch hooks по событиям).

---

## 1. Назначение и границы

### 1.1. Что спецификация делает
Определяет подсистему мировых событий и изменений локаций: `WorldEventDefinition` (схема из каталога), `ScheduledWorldEvent` (runtime), календарь событий (policy-driven планировщик на потоке `rng.world.events`), изменения локаций узлов/городов (карантины, ярмарки, карантин-зоны, затопления подходов, блокады accesses) и bridge на события тактовой симуляции:

- генерация события: `procedural` (таймер/условие), `scripted` (триггеры мира/сюжета), `player_or_faction_driven` (порождаемые);
- зона действия события: `point | regional | global` (совместимо с моделью SPEC-CATA-003);
- «изменения локаций» — временные состояния узла: `access_policy` (как попасть/можно ли), `visibility_policy` (виден ли), `event_overlay_tags` (ярмарка, карантин, мятеж).

### 1.2. Что спецификация НЕ делает
- Не описывает катаклизмы (→ `DEV-SPEC-025/026`): события по аннотированным `cataclysm`-тегам только «готовят» их сценарному планировщику.
- Не рисует UI календаря/ленты событий (→ 013).
- Не пишет тексты событий (контент-пакеты, локализация).
- Не меняет политическую карту напрямую: контроль/войны остаются у 023; событие публикует требование, применение — механика 023.
- Не реализует основной боевой шаг перехода (порт `BattlePort` 021/022-контракт; impl 029).

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `INT-13` | Календарь событий: случайные + сценарные нарастающие угрозы | угрозы — в 025 |
| `INT-29` | События как канал доставки нарратива (тексты, слухи) | нет |
| `SPEC-CATA-002` | 3 источника события; соотношение с катаклизмом | нет |
| `SPEC-CATA-003` | 3 уровня зоны действия (те же перечни) | нет |
| `SPEC-CATA-028` | `CataclysmQuestTemplateDefinition` порождается из события | нет |

---

## 2. Зависимости

### 2.1. Обязательные
- `DEV-SPEC-001/002` — Result, EventRegistry (2 новые записи в ядре + 1 событие-фильтр).
- `DEV-SPEC-003` — ContentKind `world-event` (схема §6.1), `location-modifier-policy`.
- `DEV-SPEC-004` — 2 механики scope `world` (§7.1).
- `DEV-SPEC-005` — `rng.world.events` (объявлен в 023 §4.3).
- `DEV-SPEC-006` — memento `world_events_state` (§6.4).
- `DEV-SPEC-023` — состояния городов/узлов и контроль; механики 024 занимают приоритеты 350/340 — ниже marque-tracker (360) из 023.

### 2.2. Мягкие
- `DEV-SPEC-025` — сценар planner потребляет события с тегом `cataclysm-omen`;
- `DEV-SPEC-034` — story beacons связаны с событиями календаря;
- `DEV-SPEC-031` — исходы «осада сваливается в бой» — через `IAssaultResolutionPort` (023).

### 2.3. Внешние
Новых внешних зависимостей нет.

---

## 3. Термины

| Термин | Смысл |
|---|---|
| **Мировое событие** | Единица календаря: появляется по политике, живёт, завершается; не катаклизм |
| **Календарь событий** | Планировщик генераций + активные события + история (powered by `rng.world.events`) |
| **Изменение локации** | Временное состояние узла/города (карантин/ярмарка/мёртвая вода), применяемое событием |
| **Нарастающая угроза** | Сценарная серия событий с эскалацией (мост в 025; здесь — только тег-публикация) |
| **Overlay-тег** | иные только декларативный модификатор узла, читаемый другими доменами через порт |

---

## 4. Архитектурное размещение

```
src/domain/worldEvents/
  entities/
    ScheduledWorldEvent.ts   # runtime-сущность календаря
  aggregates/
    WorldEventCalendar.ts
  mechanics/
    world-event-scheduler-tracker.ts    # планировщик: таймеры/условия генерации
    world-event-overlay-tracker.ts      # применение overlay-состояний узлов
    definitions/
  index.ts
src/application/useCases/
  RollWorldEvents.ts       # вызывается на фазе scope:world (после политических трекеров)
src/content/world-events/  # контент первой волны (schema + пакеты)
src/domain/ports/
  IWorldEventContextPort.ts  # read-only access: getActiveOverlays(nodeId), getHistory()
```

ContentKind: `world-event`, `location-modifier-policy`. Пакет вехи: `world-events-1`.

Фазовая привязка: механики scope `world`, priorities 350/340 — после world-marque-tracker (360) из 023, до `scope:economy`.

RNG: поток `rng.world.events` (каталог расширен в 023 — единственный поток 024).

---

## 5. Domain-модель

### 5.1. Определение события

```ts
export type WorldEventScale = 'point' | 'regional' | 'global';
export type WorldEventSource = 'procedural' | 'scripted' | 'player_or_faction_driven';

export interface WorldEventDefinition {
  readonly kind: 'world-event';
  readonly id: string;                       // kebab-case
  readonly display_name_key: string;         // world-event.{id}.name
  readonly source_type: WorldEventSource;    // SPEC-CATA-002-совместимо
  readonly scale: WorldEventScale;           // SPEC-CATA-003-совместимо
  readonly tags: readonly string[];          // 'plague-omen' | 'fair' | 'mutiny' | 'cataclysm-omen' | ...
  readonly trigger_policy_id: string;        // как возникает (для scripted — обязательно)
  readonly generation_policy_id: string | null; // для player/faction-driven
  readonly duration_policy_id: string;
  readonly target_selector_policy_id: string;   // которые узлы/города затронуты
  readonly overlay_policy_ids: readonly string[]; // какие изменения локаций применить
  readonly quest_template_ids: readonly string[]; // стык SPEC-CATA-028
  readonly narrative_template_ids: readonly string[]; // текстовый канал (013/034)
}
```

### 5.2. Runtime

```ts
export interface ScheduledWorldEvent {
  readonly instance_id: string;
  readonly definition_id: string;
  readonly started_tick: number;
  readonly affected: { readonly node_ids: readonly string[]; readonly city_ids: readonly string[] };
  readonly current_overlay_ids: readonly string[];
}

export interface LocationOverlay {
  readonly overlay_id: string;             // 'overlay-quarantine', 'overlay-fair' ...
  readonly applied_to: string;              // node/city id
  readonly expires_tick: number | null;
  readonly effects_tags: readonly string[]; // 'no-docking' | 'price-surge-luxury' | ...
}
```

Правила: одна и та же накладка не дублируется на узле (`uniqueness` в схеме); срок действия — data-driven; overlays читаются через порт (§8) экономикой/флотом/борьбой.

---

## 6. Data-контракты и схемы

- `content/world-event/world-event.schema.json` — `WorldEventDefinition`;
- `content/location-modifier-policy/policy.schema.json` — `LocationOverlayPolicy`;
- `state/world-events-state.schema.json` — memento: активные события + журнал истории `world_events_history` (для 036/037).

Пример контента:

```json
{
  "id": "harbor-quarantine",
  "display_name_key": "world-event.harbor-quarantine.name",
  "source_type": "procedural",
  "scale": "point",
  "tags": ["plague-omen"],
  "trigger_policy_id": "quarantine-plague-pressure",
  "duration_policy_id": "quarantine-weeks",
  "target_selector_policy_id": "ports-with-plague-scar",
  "overlay_policy_ids": ["overlay-policy-dock-closed"],
  "quest_template_ids": ["quest-run-quarantine-blockade"],
  "narrative_template_ids": ["quarantine-tavern-rumor"]
}
```

Ядро событий: `world.event_occurred` `{ instance_id, definition_id, started_tick, affected }`; `world.event_ended` `{ instance_id, resolution }`; payload-схемы зарегистрированы; delivery — `NextTick` (после политических трекеров, до экономики).

---

## 7. Рантайм-поведение

### 7.1. Механики

| ID | kind | priority | persist | Назначение |
|---|---|---|---|---|
| `world-event-scheduler-tracker` | tracker | 350 | да | Таймеры/условия запуска; резолвится через `trigger_policy`/`generation_policy` |
| `world-event-overlay-tracker` | tracker | 340 | да | Применение overlays к узлам; истечение сроков; публикация `event_ended` |

### 7.2. Поток такта
`scope:world` → PoliticalTrackers (023) → scheduler (350) → overlay (340) → delivery очередей → `scope:economy` читает overlays через порт.

### 7.3. Последовательность: карантин в порту
```
scheduler: pressure-порог превышен (predict: plague-scar от 026)
→ создан ScheduledWorldEvent (point, узел)
→ overlay 'dock-closed' применён к trade_node
→ economy 020: supply/supply-chain очередь отпускных цен; legality 022: досмотры чаще
→ срок истёк → event_ended → overlays сняты
```

---

## 8. Порты и адаптеры

```ts
export interface IWorldEventContextPort {
  getActiveOverlays(nodeOrCityId: string): readonly LocationOverlay[];
  hasOverlayTag(nodeOrCityId: string, tag: string): boolean;
  getHistory(): readonly { instance_id: string; definition_id: string; tick: number }[];
}
```

Потребители: 020 (цены), 022 (легальность), 017 (sailing conditions), 025 (omens), 034 (beacons).

---

## 9. Интеграционные точки
- **025:** события с тегом `cataclysm-omen` поднимают `cataclysm_pressure` (контракт 022 hooks) — планировщик сценарных катаклизмов;
- **034:** story beacon может требовать активного события (`beacon.require_event_tag`);
- **029/031:** combat scene читает overlays (туман/шторм как overlay);
- **036/037:** журналы событий — факты эпилога.

---

## 10. Обработка ошибок

`Result<T, WorldEventError>`; `WorldEventError = 'DEFINITION_NOT_FOUND' | 'POLICY_NOT_FOUND' | 'INVALID_OVERLAY' | 'SCHEDULER_OVERFLOW'`. Никаких исключений; переполнение календаря (too many active events) обрабатывается политикой `max_active_events` (отказ поколения — валидный результат).

---

## 11. Критерии приёмки

- **AC01:** календарь детерминирован от seed: 20 k тактов × 2 прогона — идентичный календарь.
- **AC02:** 3 источника работают: procedural (таймер/условие), scripted (триггер), player_or_faction_driven (условия); все на данных.
- **AC03:** overlay применяется и снимается: экономика видит точку начала и конца в пределах 1 такта (доставка `NextTick`).
- **AC04:** дубликат overlay на узле невозможен (CI angular: schema `unique`, runtime guard).
- **AC05:** scripted-событие срабатывает ровно по триггеру мира (например, `city_control_changed` 023).
- **AC06:** масштаб зон: point/regional/global поднимают корректные списки affected (selector policies).
- **AC07:** журнал истории накапливается и попадает в memento; валидация по схеме.
- **AC08 (GD-07):** новое событие добавляется JSON-контентом; CI lg lint резолв policy/template ID.
- **AC09:** производитель календаря не напрямую не меняет контроль/войны (публикует только событие, изменения делает 023) — lint.
- **AC10:** `cataclysm-omen` события увеличивают `cataclysm_pressure` (мягкий мост в 022/025).

---

## 12. Тест-план
unit: `world-event-scheduler-tracker.test.ts`, `world-event-overlay-tracker.test.ts`, selector policy tests.
integration: `overlay-economy-reaction.test.ts` (020 цены), `event-cataclysm-pressure.test.ts` (025 мягкий мост), `event-narrative-beacon.test.ts` (034).
contract: `world-event.schema.test.ts`, события-схемы.
determinism: сценарий «провокация ошибки: 20 k тиков» — golden snapshot; save/load → то же продолжение.

---

## 13. Производительность
Стоимость такта O(DActive + TNodes) — десятки; планировщик — priority queue для таймеров вместо полного опроса; бюджет < 0.5 мс.

---

## 14. Миграции
Снимок `world_events_state` версии 1; история — только append-only. Расширение `rng.world.events` уже зафиксировано в 023 §4.3.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокер? | Решение / статус |
|---|---|---|---|
| `Q-01` | Слухи как отдельная подсистема? | нет | Слухи = narrative-template события (013/034); механической подсистемы тут не создаём (INT-29: текст-канал) |
| `Q-02` | Лимит активных событий | нет | `max_active_events` — параметр календаря, data-driven |
| `Q-03` | Player-driven: как объявляет игрок | нет | Через `use cases` (BOTTOM), реализация в 039 vertical slice |

---

## 16. Что остаётся вне scope
UI календаря/лент; тексты событий и слухи (пакеты контента); вар-машин нарастающих угроз (025); рендер overlays (010); баланс вероятностей.

Скелет первой волны контента: ≥ 8 `WorldEventDefinition` — по одному процедурному на каждый из трёх масштабов + 2 scripted (привязаны к триггерам 023) + 1 player-driven + 1QtCore «fair» + 1 «quarantine» с мостом в 026 (plague-scar selector).

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест |
|---|---|---|---|
| `INT-13` | R01: случайные события | AC01/AC02 |.scheduler tests |
| `INT-29` | R02: события как нарративный канал | AC05 | narrative template tests |
| `SPEC-CATA-002` | 3 источника | AC02 | all-sources integration |
| `SPEC-CATA-003` | 3 масштаба | AC06 | selector tests |
| `SPEC-CATA-028` | квест-шаблоны из событий | AC08 | quest template lint |
| `GD-09` | memento календаря | AC07 | schema tests |
