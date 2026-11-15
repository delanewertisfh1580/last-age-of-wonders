# DEV-SPEC-034 v1.0 — «Story Beacons, Narrative Arcs & Dialogue»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 6 (Captain, Narrative, Hidden Branches), третий блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-032`, `DEV-SPEC-033`
**Блокирует:** `DEV-SPEC-035`, `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Сюжет и лор»` (SPEC-LORE-001…007, 010, 011, 013…018, 020…024, 027…029, 031, 032, 040…042, 050/051, 060/061, 070…073, 080…086, 090)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (фракции, доктрины), `DEV-SPEC-023/024` (мир и события), `DEV-SPEC-025/026` (катаклизмы), `DEV-SPEC-027/028` (напарники, реакции), `DEV-SPEC-032` (капитан, предыстория), `DEV-SPEC-033` (трансформация), `DEV-SPEC-036` (эпилог)
**Порождает веху:** `TICKETS-M29`

---

## 0. Как читать эту спека

Спека задаёт **нарративный скелет**: обязательные вехи, свободные арки, фракционные арки, диалоги как механику, предысторию капитана, пролог и объявление финалов. Лор-слои, ключевые NPC и environmental storytelling — 035. Сборка эпилога — 036.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`StoryBeaconDefinition`**: обязательная сюжетная веха с порядком, активацией и завершением;
- **`NarrativeArcDefinition`**: свободно встраиваемая побочная арка;
- **`FactionNarrativeArcDefinition`**: фракционная арка, связанная с доктриной и катаклизмом;
- **`DialogueDefinition`**: диалог как механика (участники, теги, исходы, влияние на отношения/репутацию);
- **`BackgroundDefinition`**: предыстория капитана (стартовые условия, клятвы, зацепки) — исполнение контракта 032;
- **`PrologueDefinition`**: универсальный пролог + первый крупный выбор;
- **`EndingDefinition`**: объявление больших и малых финалов (генерация — 036);
- **`NarrativeStateInstance`**: рантайм — активные/завершённые вехи и арки, диалоги, выборы, журнал;
- **события** `narrative.*` (15 ядерных тем) + фракционные namespace'ы;
- **RNG**: 5 потоков `rng.narrative.*`;
- **сохранения**: снимок нарратива + журнал;
- **CI**: schema/graph/gameplay lint;
- **демо** `demo:m29`.

### 1.2. Что спецификация НЕ делает

- Не реализует лор-слои, ключевых NPC и environmental storytelling → `DEV-SPEC-035`.
- Не генерирует текст эпилога → `DEV-SPEC-036`.
- Не определяет капитана → `DEV-SPEC-032` (только потребляет фон и клятвы).
- Не определяет трансформацию → `DEV-SPEC-033`.
- Не порождает катаклизмы и мировые события → `DEV-SPEC-024/025`.
- Не содержит финальные тексты диалогов, арт/VFX/аудио.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-LORE-001` (модульный скелет) | §5.1, §5.2, R01 | нет |
| `SPEC-LORE-002` (предыстория капитана) | §5.4, R05 | нет |
| `SPEC-LORE-005` (гибридный пролог) | §5.5, R06 | нет |
| `SPEC-LORE-006` (гибридные финалы) | §5.6, R07 | генерация — 036 |
| `SPEC-LORE-007` (фракционные арки) | §5.3, R03 | нет |
| `SPEC-LORE-010` (диалоги как механика) | §6.1, R04 | нет |
| `SPEC-LORE-011` (равноправные источники) | §9.3, R09 | нет |
| `SPEC-LORE-013` (переиспользование механик) | §6.1 | нет |
| `SPEC-LORE-014` (события) | §6.4, R08 | нет |
| `SPEC-LORE-016` (снимки) | §5.7, R10 | нет |
| `SPEC-LORE-017` (CI) | §12.6, R11 | нет |
| `SPEC-LORE-018` (масштаб) | §6.5, R12 | нет |
| `SPEC-LORE-020…024/027…029` (контракты) | §5 | нет |
| `SPEC-LORE-031/032` (механики, рантайм) | §6.1, §5.7 | нет |
| `SPEC-LORE-040/042` (события, мосты) | §6.4, §9.3 | нет |
| `SPEC-LORE-050/051` (детерминизм) | §7.4 | нет |
| `SPEC-LORE-060/061` (снимки) | §5.7, §14 | нет |
| `SPEC-LORE-070…073` (валидация) | §12.6 | нет |
| `SPEC-LORE-080…086/090` (скелеты и срез) | §6.5, §11 R13 | нет |

**Расхождения:** DESIGN перечисляет `narrative.ending_reached` в ядре, но финалы генерируются в 036; здесь финал только объявляется и публикует факт (OQ-01). `DialogueDefinition` в DESIGN не имеет полей реплик — реплики вводятся как `dialogue_lines` с тегами (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-032` | `CaptainInstance`, `background_id`, клятвы |
| `DEV-SPEC-033` | `hidden_branch.*` (мосты активации/финала) |

### 2.2. Мягкие

`DEV-SPEC-017` (фракции/доктрины), `DEV-SPEC-023/024` (`world.*`), `DEV-SPEC-025/026` (`cataclysm.*`), `DEV-SPEC-027/028` (реакции напарников), `DEV-SPEC-035` (NPC, лор), `DEV-SPEC-036` (эпилог).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/narrative/**`, `src/application/narrative/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Story Beacon | Обязательная сюжетная веха, через которую проходит каждый забег |
| Narrative Arc | Свободно встраиваемая побочная арка |
| Faction Arc | Нарративная арка фракции, связанная с её доктриной и катаклизмом |
| Dialogue Mechanic | Диалог, реализованный как механика с тегами реплик и исходами |
| Background | Предыстория капитана: стартовые условия, клятвы, зацепки |
| Prologue Choice | Первый крупный выбор, задающий фракцию/регион/конфликт |
| Ending Declaration | Объявление финала; генерация текста — 036 |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/narrative/` — определения, рантайм, модели (`BeaconModel`, `ArcModel`, `DialogueModel`, `PrologueModel`), ошибки, порты.
- `src/application/narrative/` — use cases.
- `src/infrastructure/narrative/` — store, трекеры, event-handlers, memento.
- `content/{storyBeacon,narrativeArc,factionNarrativeArc,dialogue,background,prologue,ending,narrativePolicy}/`, `content/mechanics/narrative.json`.

### 4.2. Файлы

```text
src/domain/narrative/
  StoryBeaconDefinition.ts
  NarrativeArcDefinition.ts
  FactionNarrativeArcDefinition.ts
  DialogueDefinition.ts
  BackgroundDefinition.ts
  PrologueDefinition.ts
  EndingDefinition.ts
  NarrativeStateInstance.ts
  NarrativeErrors.ts
  BeaconModel.ts
  ArcModel.ts
  DialogueModel.ts
  PrologueModel.ts
  ICaptainBackgroundPort.ts
  IReputationPort.ts
src/application/narrative/
  StartPrologue.ts
  CompletePrologue.ts
  ActivateStoryBeacon.ts
  CompleteStoryBeacon.ts
  ActivateNarrativeArc.ts
  CompleteNarrativeArc.ts
  StartDialogue.ts
  RecordDialogueChoice.ts
  EndDialogue.ts
  ReachEnding.ts
  GetNarrativeState.ts
src/infrastructure/narrative/
  NarrativeStore.ts
  NarrativeTickHandlers.ts
  NarrativeEventHandler.ts
  NarrativeStateMementoProvider.ts
  NullCaptainBackgroundPort.ts
  NullReputationPort.ts
content/schemas/
  story-beacon.json
  narrative-arc.json
  faction-narrative-arc.json
  dialogue.json
  background.json
  prologue.json
  ending.json
  narrative-state.json
content/{storyBeacon,narrativeArc,factionNarrativeArc,dialogue,background,prologue,ending}/core.json
content/mechanics/narrative.json
tools/ci/stages/validate-narrative-graph.ts
tools/ci/stages/validate-narrative-lint.ts
test/narrative/…
scripts/demo-m29.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `INarrativeStore` | `NarrativeStore` | singleton | `domain-init` |
| `ICaptainBackgroundPort` | адаптер к 032 | singleton | `integration` |
| `IReputationPort` | адаптер к 032/023 | singleton | `integration` |
| `IMementoProvider('narrative')` | `NarrativeStateMementoProvider` | singleton | `save-composition` |
| `narrative-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. StoryBeaconDefinition

```ts
export interface StoryBeaconDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly ordering_policy_id: string;
  readonly activation_policy_id: string;
  readonly completion_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly epilogue_fact_policy_id: string;
}
```

Инварианты: `NARR-INV-01` — `ordering_policy_id`, `activation_policy_id`, `completion_policy_id` обязательны; `NARR-INV-02` — веха не хранит рантайм.

### 5.2. NarrativeArcDefinition

```ts
export interface NarrativeArcDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly activation_policy_id: string;
  readonly completion_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly epilogue_fact_policy_id: string;
  readonly optional: boolean;
}
```

Инварианты: `NARR-INV-03` — `activation_policy_id` обязателен; `NARR-INV-04` — арка не обязана быть пройдена (`optional=true` для побочных).

### 5.3. FactionNarrativeArcDefinition

```ts
export interface FactionNarrativeArcDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly faction_id: string;
  readonly doctrine_id: string;
  readonly culmination_policy_id: string;
  readonly cataclysm_link_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly epilogue_fact_policy_id: string;
}
```

Инварианты: `NARR-INV-05` — `faction_id` и `doctrine_id` разрешаются (017); `NARR-INV-06` — арка имеет кульминацию, связанную с катаклизмом.

### 5.4. BackgroundDefinition

```ts
export interface BackgroundDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly starting_conditions_policy_id: string;
  readonly starting_oath_ids: readonly string[];
  readonly starting_acquisition_hook_ids: readonly string[];
  readonly narrative_hook_ids: readonly string[];      // ≥1
  readonly starting_faction_affinity: Readonly<Record<string, number>>;
  readonly narrative_tone: string;
  readonly prologue_scene_id: string;
  readonly epilogue_fact_policy_id: string;
}
```

Инварианты: `NARR-INV-07` — `narrative_hook_ids.length ≥ 1`; `NARR-INV-08` — клятвы и зацепки разрешаются (028/032).

### 5.5. PrologueDefinition

```ts
export interface PrologueChoiceOutcome {
  readonly choice_id: string;
  readonly starting_faction: string;
  readonly starting_region: string;
  readonly narrative_hook_ids: readonly string[];
}

export interface PrologueDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly universal_scene_id: string;
  readonly first_choice_policy_id: string;
  readonly choice_outcomes: readonly PrologueChoiceOutcome[];   // ≥2
  readonly epilogue_fact_policy_id: string;
}
```

Инварианты: `NARR-INV-09` — `choice_outcomes.length ≥ 2`; выбор фиксируется один раз.

### 5.6. DialogueDefinition и EndingDefinition

```ts
export interface DialogueLine {
  readonly line_id: string;
  readonly speaker_id: string;
  readonly dialogue_tags: readonly string[];
  readonly next_line_ids: readonly string[];
  readonly outcome_effects?: readonly string[];
}

export interface DialogueDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly participants: readonly string[];      // ≥2
  readonly dialogue_tags: readonly string[];     // ≥1
  readonly mechanic_ids: readonly string[];
  readonly outcome_policy_id: string;
  readonly lines: readonly DialogueLine[];
}

export interface EndingDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly ending_type: 'major' | 'minor';
  readonly completion_policy_id: string;
  readonly epilogue_fact_policy_id: string;
}
```

Инварианты: `NARR-INV-10` — `participants.length ≥ 2`, `dialogue_tags.length ≥ 1`; `NARR-INV-11` — граф `next_line_ids` ацикличен и все ссылки существуют.

### 5.7. NarrativeStateInstance

```ts
export interface NarrativeStateInstance {
  readonly captain_id: string;
  readonly background_id: string;
  readonly prologue_completed: boolean;
  readonly prologue_choice_id?: string;
  readonly active_beacons: readonly string[];
  readonly completed_beacons: readonly string[];
  readonly active_arcs: readonly string[];
  readonly completed_arcs: readonly string[];
  readonly dialogue_history: readonly { readonly dialogue_id: string; readonly choice_ids: readonly string[]; readonly tick: number }[];
  readonly ending_reached?: string;
  readonly journal: readonly NarrativeJournalEntry[];
}
```

Инварианты: `NARR-INV-12` — веха не может быть активной и завершённой одновременно; `NARR-INV-13` — `ending_reached` терминален; `NARR-INV-14` — журнал монотонен по `(tick, seq)`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `narrative-beacon-tracker` | tracker | narrative | 260 | `cataclysm.triggered`, `cataclysm.ended`, `world.event_occurred` | `narrative.story_beacon_activated`, `narrative.story_beacon_completed` | `{ active_beacon_ids, completed_beacon_ids }` |
| `narrative-arc-tracker` | tracker | narrative | 250 | `companion.reaction_triggered_macro`, `economy.trade_executed`, `world.ruler_changed` | `narrative.arc_activated`, `narrative.arc_completed` | `{ active_arc_ids, completed_arc_ids }` |
| `narrative-faction-arc-tracker` | tracker | narrative | 245 | `cataclysm.triggered`, `world.ruler_changed` | `narrative.faction_arc_activated`, `narrative.faction_arc_completed` | `{ arc_ids, stage }` |
| `dialogue-steam-emperor-resolver` | resolver | narrative | 300 | `narrative.dialogue_choice_made` | `narrative.dialogue_ended`, `captain.reputation_changed` | `null` |
| `narrative-ending-resolver` | resolver | narrative | 70 | `hidden_branch.final_state_reached`, `narrative.faction_arc_completed` | `narrative.ending_reached` | `null` |

### 6.2. JSON Schema

- `story-beacon.json` — required ordering/activation/completion policy; `additionalProperties: false`.
- `narrative-arc.json` — `activation_policy_id` required; `optional` boolean.
- `faction-narrative-arc.json` — `faction_id`/`doctrine_id` required.
- `dialogue.json` — `participants` minItems 2; `dialogue_tags` minItems 1; `lines` items required [line_id, speaker_id].
- `background.json` — `narrative_hook_ids` minItems 1.
- `prologue.json` — `choice_outcomes` minItems 2.
- `ending.json` — `ending_type` enum ['major','minor'].
- `narrative-state.json` — массивы идемпотентны; `dialogue_history` items required [dialogue_id, tick]; `additionalProperties: false`.

### 6.3. Политики

`ordering_policy_id`, `activation_policy_id`, `completion_policy_id`, `culmination_policy_id`, `cataclysm_link_policy_id`, `outcome_policy_id`, `delivery_policy_id` (4 канала). Все числа — в контенте.

### 6.4. События

Ядро (15): `narrative.story_beacon_activated`, `narrative.story_beacon_completed`, `narrative.arc_activated`, `narrative.arc_completed`, `narrative.faction_arc_activated`, `narrative.faction_arc_completed`, `narrative.dialogue_started`, `narrative.dialogue_choice_made`, `narrative.dialogue_ended`, `narrative.npc_state_changed`, `narrative.npc_died`, `narrative.lore_layer_revealed`, `narrative.lore_fragment_discovered`, `narrative.prologue_completed`, `narrative.ending_reached`.

Фракционные: `narrative.industrial-steam.*`, `narrative.ancient-arcane.*`, `narrative.necromantic-corpse.*`, `narrative.living-artifact.*`.

### 6.5. Контент первой волны

3 предыстории, 5 вех, 4 фракционные арки, 6 диалогов, 1 пролог, 4 финала. Сценарий SPEC-LORE-090 воспроизводится в демо.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Веха**

```
[dormant] --activation_condition--> [active] + emit story_beacon_activated
[active] --completion_condition--> [completed] + emit story_beacon_completed + fact
[completed] --> [terminal]
```

**(b) Арка**

```
[dormant] --activation_policy--> [active] + emit arc_activated
[active] --completion_policy--> [completed] + emit arc_completed + fact
[active] --skip_policy--> [skipped] (без факта завершения)
```

**(c) Диалог**

```
[available] --start--> [in_progress] + emit dialogue_started
[in_progress] --choice--> [in_progress] + emit dialogue_choice_made
[in_progress] --end--> [ended] + emit dialogue_ended + outcome effects
```

**(d) Пролог**

```
[not_started] --start--> [in_progress]
[in_progress] --first_choice--> [choice_made] + fact
[choice_made] --complete--> [completed] + emit prologue_completed
```

### 7.2. Sequence: выбор предыстории и пролог

```
CreateCaptain{background_id} [032]
  → BackgroundDefinition → стартовые условия, клятвы, зацепки
  → StartPrologue{prologue_id} → universal_scene
  → RecordPrologueChoice{choice_id} → starting_faction/region
  → CompletePrologue → narrative.prologue_completed
  → IEpilogueFactPort.publish('epilogue.narrative.prologue_choice_made')
```

### 7.3. Tick-контракт

`scope:narrative` идёт после `scope:captain` и до `scope:party`, чтобы реакции напарников видели актуальные вехи того же такта. Пропуск фазы не допускается для активации вех; завершение арок может батчиться с догоном.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.narrative.beacon_activation`, `rng.narrative.arc_activation`, `rng.narrative.dialogue_outcome`, `rng.narrative.npc_state` (используется 035), `rng.narrative.lore_revelation` (035). Смешение запрещено. Повторная активация завершённой вехи игнорируется.

### 7.5. Порядок вех

```
nextBeacon(active, completed, policy):
  candidates = beacons where activation ok and ordering allows
  sort by policy.order(candidates)
  return first or Err if none and required remain
```

Сложность O(n log n) по числу вех.

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 034; impl: 032
export interface ICaptainBackgroundPort {
  backgroundId(captainId: string): Result<string, AppError>;
  applyStartingConditions(captainId: string, policyId: string): Result<void, AppError>;
}

// owner: 034; impl: 032/023
export interface IReputationPort {
  change(factionId: string, delta: number, source: string): Result<void, AppError>;
}
```

### 8.2. Адаптеры

`NullCaptainBackgroundPort` (`Ok('background-default')`), `NullReputationPort` (`Ok(undefined)`), `NarrativeStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_NARR_BEACON_UNKNOWN` | веха не найдена | да |
| `DOMAIN_NARR_BEACON_ORDER_VIOLATION` | нарушен порядок вех | да |
| `DOMAIN_NARR_ARC_UNKNOWN` | арка не найдена | да |
| `DOMAIN_NARR_DIALOGUE_INVALID` | граф реплик битый/цикл | нет |
| `DOMAIN_NARR_PROLOGUE_COMPLETED` | повторный пролог | да |
| `DOMAIN_NARR_ENDING_LOCKED` | финал недостижим | да |
| `INFRA_NARR_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`cataclysm.triggered`, `cataclysm.ended`, `world.ruler_changed`, `world.location_changed`, `companion.reaction_triggered_macro`, `companion.legacy_transform_unlocked`, `hidden_branch.activated`, `hidden_branch.final_state_reached`, `economy.scar_applied`.

### 9.2. Эмитируемые

Темы §6.4. Consumers: 027/028 (реакции), 032 (репутация), 033 (мосты), 035 (NPC/лор), 036 (факты), 037 (мета).

### 9.3. Мосты

`cataclysm.triggered → narrative.story_beacon_activated`; `companion.reaction_triggered_macro → narrative.arc_activated`; `hidden_branch.final_state_reached → narrative.ending_reached`; `world.ruler_changed → narrative.npc_state_changed` (035); факты `epilogue.narrative.*` → 036.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `StartPrologue` | `{captain_id, prologue_id}` | `{scene_id}` | CaptainBackground | — |
| `CompletePrologue` | `{captain_id, choice_id}` | `{faction, region}` | Background, Reputation | `prologue_completed` |
| `ActivateStoryBeacon` | `{captain_id, beacon_id}` | `{ok}` | — | `story_beacon_activated` |
| `CompleteStoryBeacon` | `{captain_id, beacon_id}` | `{facts}` | — | `story_beacon_completed` |
| `ActivateNarrativeArc` | `{captain_id, arc_id}` | `{ok}` | — | `arc_activated` |
| `CompleteNarrativeArc` | `{captain_id, arc_id}` | `{facts}` | — | `arc_completed` |
| `StartDialogue` | `{captain_id, dialogue_id}` | `{line_id}` | — | `dialogue_started` |
| `RecordDialogueChoice` | `{captain_id, dialogue_id, line_id, choice}` | `{next_line_id}` | Reputation | `dialogue_choice_made` |
| `EndDialogue` | `{captain_id, dialogue_id}` | `{outcome}` | Reputation | `dialogue_ended` |
| `ReachEnding` | `{captain_id, ending_id}` | `{facts}` | — | `ending_reached` |
| `GetNarrativeState` | `{captain_id}` | `NarrativeStateInstance` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_NARR_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | цикл в графе реплик | `DOMAIN_NARR_DIALOGUE_INVALID` | падение загрузки контента |
| domain | нарушен порядок вех | `DOMAIN_NARR_BEACON_ORDER_VIOLATION` | `Err`, веха не активируется |
| application | повторный пролог | `DOMAIN_NARR_PROLOGUE_COMPLETED` | `Err` |
| save | снимок невалиден | `INFRA_NARR_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-034-R01 — Вехи
Требование: веха проходит dormant → active → completed по условиям; порядок соблюдается.
Invariant: NARR-INV-01/02/12.

- AC01: Given `cataclysm.triggered` и активационное условие, When такт, Then `narrative.story_beacon_activated`.
- AC02: Given попытка активировать веху вне порядка, When вызов, Then `Err(DOMAIN_NARR_BEACON_ORDER_VIOLATION)`.

### DEV-SPEC-034-R02 — Арки
Требование: арка активируется/завершается по политике; побочная арка может быть пропущена.
Invariant: NARR-INV-03/04.

- AC03: Given `companion.reaction_triggered_macro`, When активация, Then `narrative.arc_activated`.
- AC04: Given `optional=true` и пропуск, When завершение забега, Then арка не блокирует финал.

### DEV-SPEC-034-R03 — Фракционные арки
Требование: арка связана с доктриной и кульминацией; 4 арки первой волны.
Invariant: NARR-INV-05/06.

- AC05: Given `faction-arc-industrial-steam`, When загрузка, Then `doctrine_id` разрешается.
- AC06: Given арка без кульминации, When `ci:validate --stage=graph`, Then ошибка.

### DEV-SPEC-034-R04 — Диалоги
Требование: диалог — механика с репликами и исходами; влияние на репутацию.
Invariant: NARR-INV-10/11.

- AC07: Given `StartDialogue`, When вызов, Then `narrative.dialogue_started` и `line_id` стартовой реплики.
- AC08: Given выбор реплики с эффектом, When `RecordDialogueChoice`, Then `dialogue_choice_made` и изменение репутации.
- AC09: Given цикл в `next_line_ids`, When загрузка контента, Then `DOMAIN_NARR_DIALOGUE_INVALID`.

### DEV-SPEC-034-R05 — Предыстория
Требование: фон задаёт стартовые условия, клятвы и зацепки; связь с 032.
Invariant: NARR-INV-07/08.

- AC10: Given `background-steam-engineer-apprentice`, When `CreateCaptain`, Then стартовые клятвы и зацепки применены.

### DEV-SPEC-034-R06 — Пролог
Требование: универсальная завязка + первый крупный выбор; выбор фиксируется.
Invariant: NARR-INV-09.

- AC11: Given `CompletePrologue{choice-steam-faction}`, When вызов, Then `starting_faction='industrial-steam'` и `prologue_completed`.
- AC12: Given пролог уже завершён, When повторный вызов, Then `Err(DOMAIN_NARR_PROLOGUE_COMPLETED)`.

### DEV-SPEC-034-R07 — Финалы
Требование: финалы объявляются (major/minor) и публикуют факт; генерация — 036.

- AC13: Given условие финала, When `ReachEnding`, Then `narrative.ending_reached` и факт в `IEpilogueFactPort`.

### DEV-SPEC-034-R08 — События
Требование: 15 ядерных тем; фракционные без коллизий.

- AC14: Given перечень §6.4, When `--stage=events`, Then все темы присутствуют.

### DEV-SPEC-034-R09 — Равноправные источники
Требование: вехи, арки, катаклизмы, действия игрока публикуют факты без приоритета.

- AC15: Given события из трёх источников, When факты, Then все три присутствуют в коллекторе.

### DEV-SPEC-034-R10 — RNG и сохранения
Требование: 5 потоков `rng.narrative.*`; снимок валидируется.

- AC16: Given save→load, When сравнение, Then deep-equal и идентичное продолжение 10 тактов.
- AC17: Given fixture-прогон, When `--stage=rng-streams`, Then используются только разрешённые потоки.

### DEV-SPEC-034-R11 — CI
Требование: schema + graph + lint.

- AC18: Given negative-fixtures (цикл реплик, веха без порядка, арка без кульминации, пролог с 1 выбором), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-034-R12 — Контент и срез
Требование: 3 фона, 5 вех, 4 фракционные арки, 6 диалогов, 1 пролог, 4 финала; сценарий SPEC-LORE-090 как `demo:m29`.

- AC19: Given `bun run demo:m29`, When завершение, Then `Ok`: фон → пролог → веха → арка → диалог → финал → save/load → идентичное состояние.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `BeaconModel` (порядок); T03 `ArcModel`; T04 `DialogueModel` (граф, исходы); T05 `PrologueModel`.
12.2 Integration: T06 use cases + recording bus; T07 мосты 025/027/028/033.
12.3 Contract: T08 определения против схем; T09 события.
12.4 Determinism: T10 save/load + RNG-изоляция.
12.5 E2E: T11 `demo:m29`.
12.6 CI: T12 graph; T13 lint.

---

## 13. Производительность

### 13.1. Бюджет
Активация — O(policies); порядок вех — O(n log n); диалог — O(lines). Фаза `scope:narrative`.

### 13.2. LOD
Побочные арки могут откладываться; вехи, пролог и финал — никогда.

### 13.3. Профилирование
Счётчики `narrative.*`; сценарий: 5 вех × 4 арки × 200 диалогов × 500 тактов.

---

## 14. Миграции

`narrative-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | `narrative.ending_reached` — ядро 034 или эмиссия 036 | R07 | arch | до M29 |
| OQ-02 | Поля реплик диалога (DESIGN их не фиксирует) | R04 | design | до M29 |
| OQ-03 | Могут ли вехи быть необязательными в отдельном режиме | R01 | design | до Wave 6 review |

---

## 16. Что остаётся вне scope

- Лор-слои, NPC, environmental storytelling → `DEV-SPEC-035`.
- Генерация текста эпилога → `DEV-SPEC-036`.
- Капитан → `DEV-SPEC-032`; трансформация → `DEV-SPEC-033`.
- Катаклизмы и мировые события → `DEV-SPEC-024/025`.
- Финальные тексты, арт/VFX/аудио, мобильный UX.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M29) |
|---|---|---|---|---|
| SPEC-LORE-001/022 | R01 | AC01,AC02 | T02,T06 | M29-001 |
| SPEC-LORE-001/023 | R02 | AC03,AC04 | T03,T06 | M29-002 |
| SPEC-LORE-007/024 | R03 | AC05,AC06 | T06,T12 | M29-003 |
| SPEC-LORE-010/027 | R04 | AC07…AC09 | T04,T06 | M29-004 |
| SPEC-LORE-002/021 | R05 | AC10 | T05,T06 | M29-005 |
| SPEC-LORE-005/028 | R06 | AC11,AC12 | T05,T06 | M29-006 |
| SPEC-LORE-006/029 | R07 | AC13 | T06 | M29-007 |
| SPEC-LORE-014/040/041 | R08 | AC14 | T09 | M29-008 |
| SPEC-LORE-011 | R09 | AC15 | T06 | M29-008 |
| SPEC-LORE-016/050/051/060/061 | R10 | AC16,AC17 | T10 | M29-009 |
| SPEC-LORE-017/070…073 | R11 | AC18 | T12,T13 | M29-010 |
| SPEC-LORE-018/080…086/090 | R12 | AC19 | T11 | M29-011 |

Итог декомпозиции: 11 тикетов `TKT-M29-001…011`, демо `demo:m29`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R12 → AC01…AC19; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
