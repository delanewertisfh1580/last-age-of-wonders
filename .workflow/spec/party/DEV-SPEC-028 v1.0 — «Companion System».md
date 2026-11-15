# DEV-SPEC-028 v1.0 — «Companion System (relationships, synergy, permadeath legacy)»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 5 (Party, Companions & Combat), второй блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-027`
**Блокирует:** `DEV-SPEC-029`, `DEV-SPEC-031`, `DEV-SPEC-032`, `DEV-SPEC-033`, `DEV-SPEC-034`, `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Система напарников»` (SPEC-COMP-001…011, 020…028, 030…032, 040/041, 050/051, 060…063, 070…072, 080), `DESIGN v1.0 — «Менеджмент отряда»` (SPEC-PARTY-005, 011), `GENERAL DESIGN v1.0` (GD-07, GD-09)
**Связанные DEV-SPEC:** `DEV-SPEC-027` (PartyInstance, PartyStore, party.* ядро), `DEV-SPEC-020/021/022` (реакции на экономику), `DEV-SPEC-023/024` (world-события, локации), `DEV-SPEC-025/026` (катаклизмы), `DEV-SPEC-029/031` (боевые приказы и потери), `DEV-SPEC-033` (хуки трансформации), `DEV-SPEC-036` (`IEpilogueFactPort` — владелец контракта)
**Порождает веху:** `TICKETS-M23`

---

## 0. Как читать эту спеку

Секции 1–17 фиксированы `DEV-SPEC-TEMPLATE v1.0`. Требования — `DEV-SPEC-028-R{NN}`, критерии — `DEV-SPEC-028-AC{NN}`, тесты — `DEV-SPEC-028-T{NN}`. Балансовых чисел нет: все пороги, шансы и значения эффектов вынесены в политики контента (§6.3).

Спека **расширяет** `DEV-SPEC-027`, не переопределяя его: `PartyInstance`, `PartyStore`, `party.*`-ядро и механики отряда остаются как в 027. Всё новое — отдельные сущности `companion.*` и расширяющие поля снимка.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

Переводит нарративный слой напарников из DESIGN в реализационный контракт:

- **процедурные зацепки найма** (`AcquisitionHookDefinition`): слухи, события, записки, квесты → событие готовности напарника к найму; исполнение — 021/034, здесь контракт и резолвер;
- **многоуровневая шкала отношений** с механическими порогами (`RelationshipThresholdsDefinition`): пороги → бонусы морали, шанс ослушания, шанс саботажа, гарантированное предательство;
- **синергии и конфликты** между напарниками (`CompanionSynergyDefinition`): активация/деактивация по составу отряда, декларативные механические эффекты, событие-ссора;
- **гранулярность реакций** на три категории триггеров: макро-события мира, действия игрока, повседневные события (`ReactionGranularityDefinition`);
- **наследие перманентной смерти** (`PermadeathLegacyDefinition`): смерть напарника → враг-нежить либо разблокировка скрытой ветки капитана;
- **рантайм-расширение `PartyInstance`**: активные синергии/конфликты, пересечённые пороги, разрешённое наследие, журнал `companion.*` фактов;
- **событийное ядро** `companion.*` (17 ядерных тем) + фракционные namespace'ы;
- **RNG**: пять изолированных потоков `rng.companion.*`;
- **сохранения**: расширение `party-state.json` секцией companion-narrative + валидация;
- **CI**: schema/graph/gameplay lint для синергий, наследия и порогов;
- **контент первой волны**: 6 напарников, 4 синергии/конфликта, 3 сценария наследия, демо `demo:m23`.

### 1.2. Что спецификация НЕ делает

- Не определяет структуру отряда, экипировку, мораль, зарплату и прокачку → `DEV-SPEC-027` (здесь только чтение `PartyStore` и расширение снимка).
- Не реализует бой, раны, травмы, дуэли, поле боя → `DEV-SPEC-029…031` (здесь — контракты приказов и потерь).
- Не реализует скрытые ветки трансформации → `DEV-SPEC-033` (здесь — порт `ITransformationUnlockPort` и событие-сигнал).
- Не реализует диалоги, story beacons и тексты личных арок → `DEV-SPEC-034` (здесь — контракт реакции и срабатывание).
- Не реализует генерацию эпилога → `DEV-SPEC-036` (здесь — только публикация фактов через `IEpilogueFactPort`).
- Не создаёт врагов и не управляет их спавном → `DEV-SPEC-029/031` (здесь — декларация `enemy_template_id` и событие).
- Не задаёт капитанские статы, репутацию, возраст → `DEV-SPEC-032`.
- Не содержит числовой баланс, финальные тексты, арт/VFX/аудио, мобильный UX, миграции сохранений.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-COMP-001` (процедурные зацепки) | §5.1, §7.1, R01 | нет |
| `SPEC-COMP-002` (шкала отношений с порогами) | §5.2, §7.1, R02 | нет |
| `SPEC-COMP-003` (синергия и конфликты) | §5.3, §7.1, R03 | нет |
| `SPEC-COMP-004` (гранулярность реакций) | §5.4, §7.2, R04 | нет |
| `SPEC-COMP-005` (наследие перманентной смерти) | §5.5, §7.1, R05 | нет |
| `SPEC-COMP-006` (масштаб первой волны) | §11 R12, контент §6.5 | нет |
| `SPEC-COMP-007` (переиспользование механик) | §6.1, R07 | нет |
| `SPEC-COMP-008` (событийная модель) | §6.4, R08 | нет |
| `SPEC-COMP-009` (модель RNG) | §7.4, R09 | нет |
| `SPEC-COMP-010` (модель сохранений) | §5.6, §14, R10 | нет |
| `SPEC-COMP-011` (CI) | §12.6, R11 | нет |
| `SPEC-COMP-020/021` (JSON-контракты, расширение CompanionDefinition) | §5.1, §6.2 | нет |
| `SPEC-COMP-022…026` (политики отношений/синергии/наследия/зацепок/реакций) | §5.1–§5.5 | нет |
| `SPEC-COMP-027` (переиспользование `MechanicDefinition`) | §6.1 | нет |
| `SPEC-COMP-028` (`PartyInstance` расширение) | §5.6 | нет |
| `SPEC-COMP-030/031` (ядро и фракционные расширения) | §6.4 | нет |
| `SPEC-COMP-032` (мосты) | §9.3 | нет |
| `SPEC-COMP-040/041` (детерминизм, потоки) | §7.4 | нет |
| `SPEC-COMP-050/051` (снимки, валидация) | §5.6, §8.3, §14 | нет |
| `SPEC-COMP-060…063` (валидация) | §12.6, R11 | нет |
| `SPEC-COMP-070…072` (скелеты) | §6.5 | нет |
| `SPEC-COMP-080` (вертикальный срез) | §11 R13, §12.5 | нет |
| `SPEC-PARTY-005/011` (найм через нарратив, реакции) | §5.1, §7.2 | частично: конверсия пленных остаётся в 027 |
| `GD-07/GD-08` (контент как данные) | §5, §6 | нет |
| `GD-09` (Memento) | §5.6 | нет |

**Зафиксированные расхождения:**

1. DESIGN использует `cataclysm.activated`; каноническое событие 025 — `cataclysm.triggered`. Нормативно: мост подписывается на `cataclysm.triggered`, `cataclysm.activated` не регистрируется (OQ-01).
2. DESIGN использует `player.*`-топики (`player.used_forbidden_magic`, `player.chose_cruel_dialogue`, `player.looted_peasant_settlement`). Канонического `player.*`-namespace в Wave 0 нет. Нормативно: триггеры действий игрока приходят как `narrative.player_action_recorded{action_tag}` (034) до появления отдельного namespace (OQ-02).
3. `companion.fate_changed` из моста combat↔companions не входит в ядро §6.4 DESIGN; нормативно используется `party.companion_died` + `companion.legacy_*` (OQ-03).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Потребляемый контракт |
|---|---|
| `DEV-SPEC-001` | `Result<T,E>`, `AppError`, `Brand`, DI |
| `DEV-SPEC-002` | `IEventBus`, `EventDefinition`, delivery policy |
| `DEV-SPEC-003` | `IContentRegistry`, `ContentKind`, схемы, kind-по-директории |
| `DEV-SPEC-004` | `MechanicDefinition`, `IMechanicRuntime`, resolver/tracker |
| `DEV-SPEC-005` | `IRngService`, именованные потоки |
| `DEV-SPEC-006` | `IMementoProvider`, композиция save |
| `DEV-SPEC-007` | `TickPhase = 'scope:companion'`, `TickScheduler` |
| `DEV-SPEC-008` | CI-стадии schema/graph/gameplay |
| `DEV-SPEC-027` | `PartyInstance`, `PartyStore`, `party.*`-ядро, `IPartyPersonnelPort` |

### 2.2. Мягкие

| Спека | Стык |
|---|---|
| `DEV-SPEC-017` | `fleet.ship_changed` → лимит людей на борту (через 027) |
| `DEV-SPEC-020/021/022` | `economy.trade_executed`, `economy.price_shock`, `economy.loot_*` → реакции |
| `DEV-SPEC-023/024` | `world.ruler_changed`, `world.event_occurred`, локации → реакции |
| `DEV-SPEC-025/026` | `cataclysm.triggered`, `cataclysm.effect_applied` → макро-реакции |
| `DEV-SPEC-029/031` | `combat.started`, `combat.order_issued`, `combat.crew_died` → ослушание/потери |
| `DEV-SPEC-033` | `ITransformationUnlockPort` (заглушка) |
| `DEV-SPEC-036` | `IEpilogueFactPort` (owner-стаб в 027) |

### 2.3. Внешние

Новых зависимостей нет: `ajv`, `vitest`, Bun/Node как в Wave 0. Запрет `Math.random`/`Date.now` в `src/domain/companion/**` и `src/application/companion/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Acquisition Hook | Декларация нарративной зацепки (слух/событие/записка/квест), открывающей напарника для найма |
| Relationship Threshold | Механический порог шкалы отношений с декларативными эффектами и нарративным тоном |
| Synergy | Пара/группа напарников с положительным эффектом при совместном составе |
| Conflict | Пара/группа напарников с отрицательным эффектом и возможной ссорой |
| Reaction Granularity | Набор триггеров трёх категорий (macro / player_action / daily) → reaction policy |
| Permadeath Legacy | Декларация последствий смерти напарника: враг-нежить либо разблокировка ветки капитана |
| Companion Narrative State | Расширяющая часть снимка отряда: синергии, конфликты, пороги, наследие |
| Betrayal Charge | Накопленный сигнал вероятности предательства у напарника с низкими отношениями |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/companion/` — определения политик, value objects, рантайм-расширение, чистые модели (`RelationshipModel`, `SynergyModel`, `ReactionModel`, `LegacyModel`), ошибки, owner-порты.
- `src/application/companion/` — use cases (зацепки, дельта отношений, синергии, наследие).
- `src/infrastructure/companion/` — трекеры/резолверы, event-handlers, memento-секция, заглушки портов.
- `content/{companion,relationshipThresholds,synergy,permadeathLegacy,acquisitionHook,reactionGranularity,companionPolicy}/` + `content/mechanics/companion.json`, `content/events/companion-core.json`.
- `tools/ci/stages/validate-companion-graph.ts`, `validate-companion-lint.ts`.

Правило: `domain/companion ↛ application|infrastructure`; в 027/029/033/036 — только через порты.

### 4.2. Файлы

```text
src/domain/companion/
  RelationshipThresholdsDefinition.ts
  CompanionSynergyDefinition.ts
  PermadeathLegacyDefinition.ts
  AcquisitionHookDefinition.ts
  ReactionGranularityDefinition.ts
  CompanionNarrativeState.ts
  CompanionErrors.ts
  RelationshipModel.ts
  SynergyModel.ts
  ReactionModel.ts
  LegacyModel.ts
  IPartyRosterPort.ts
  ICombatOrderPort.ts
  IWorldLocationContextPort.ts
  ITransformationUnlockPort.ts
src/application/companion/
  ResolveAcquisitionHook.ts
  ApplyRelationshipDelta.ts
  EvaluateSynergies.ts
  ResolvePermadeathLegacy.ts
  GetCompanionNarrativeState.ts
src/infrastructure/companion/
  CompanionNarrativeStore.ts
  CompanionTickHandlers.ts
  CompanionEventHandler.ts
  CompanionNarrativeMementoSection.ts
  NullPartyRosterPort.ts
  NullTransformationUnlockPort.ts
content/schemas/
  relationship-thresholds.json
  companion-synergy.json
  permadeath-legacy.json
  acquisition-hook.json
  reaction-granularity.json
content/companion/core.json
content/relationshipThresholds/core.json
content/synergy/core.json
content/permadeathLegacy/core.json
content/acquisitionHook/core.json
content/reactionGranularity/core.json
content/mechanics/companion.json
content/events/companion-core.json
tools/ci/stages/validate-companion-graph.ts
tools/ci/stages/validate-companion-lint.ts
test/companion/…
scripts/demo-m23.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия bootstrap |
|---|---|---|---|
| `ICompanionNarrativeStore` | `CompanionNarrativeStore` | singleton | `domain-init` |
| `IPartyRosterPort` | адаптер к 027 `PartyStore` | singleton | `integration` |
| `ICombatOrderPort` | `NullCombatOrderPort` (замена в 029) | singleton | `integration` |
| `IWorldLocationContextPort` | адаптер к 023/024 | singleton | `integration` |
| `ITransformationUnlockPort` | `NullTransformationUnlockPort` (замена в 033) | singleton | `integration` |
| `IMementoSection('companion')` | `CompanionNarrativeMementoSection` | singleton | `save-composition` |
| Механики `scope: companion` | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. AcquisitionHookDefinition

```ts
export type AcquisitionHookId = Brand<string, 'AcquisitionHookId'>;
export type HookType = 'rumor' | 'event' | 'note' | 'quest';

export interface AcquisitionHookDefinition {
  readonly id: AcquisitionHookId;
  readonly display_name_key: string;
  readonly hook_type: HookType;
  readonly location_filter_tags: readonly string[];
  readonly reputation_requirement_policy_id?: string;
  readonly quest_template_id?: string;
  readonly generation_policy_id: string;
  readonly target_companion_id: string;
  readonly narrative_flavor_key: string;
}
```

Инварианты: `COMP-INV-01` — `hook_type` ∈ 4 нормативных; `COMP-INV-02` — при `hook_type='quest'` обязателен `quest_template_id`; `COMP-INV-03` — `target_companion_id` разрешается в `CompanionDefinition` (027).

### 5.2. RelationshipThresholdsDefinition

```ts
export interface RelationshipThreshold {
  readonly id: string;
  readonly min_value: number;   // [-100, 100]
  readonly max_value: number;
  readonly mechanical_effects: readonly RelationshipEffect[];
  readonly narrative_tone: 'devoted' | 'loyal' | 'neutral' | 'hostile' | 'betrayal';
  readonly epilogue_fact?: string;
}

export type RelationshipEffect =
  | 'party_morale_bonus_large'
  | 'party_morale_bonus_small'
  | 'unlock_secret_arc'
  | 'unlock_secret_dialogue'
  | 'chance_to_disobey_order'
  | 'chance_to_sabotage'
  | 'guaranteed_betrayal_in_combat'
  | 'companion_leaves_party';

export interface RelationshipThresholdsDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly thresholds: readonly RelationshipThreshold[];
}
```

Инварианты: `COMP-INV-04` — пороги не перекрываются и покрывают `[-100, 100]` без дыр; `COMP-INV-05` — `id` порога уникален внутри политики.

### 5.3. CompanionSynergyDefinition

```ts
export type SynergyType = 'positive' | 'negative';

export interface CompanionSynergyDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly required_companion_ids: readonly string[];   // ≥2
  readonly synergy_type: SynergyType;
  readonly mechanical_effects: readonly string[];
  readonly narrative_flavor_key: string;
  readonly activation_policy_id: string;
  readonly quarrel_event_id?: string;
  readonly epilogue_fact?: string;
}
```

Инварианты: `COMP-INV-06` — `required_companion_ids.length ≥ 2` и все существуют; `COMP-INV-07` — `synergy_type='negative'` ⇒ допустим `quarrel_event_id`, `positive` ⇒ `quarrel_event_id` отсутствует.

### 5.4. ReactionGranularityDefinition

```ts
export type ReactionCategory = 'macro' | 'player_action' | 'daily';

export interface ReactionTrigger {
  readonly event_id: string;
  readonly reaction_policy_id: string;
  readonly item_filter_tags?: readonly string[];
  readonly good_filter_tags?: readonly string[];
}

export interface ReactionGranularityDefinition {
  readonly id: string;
  readonly macro_triggers: readonly ReactionTrigger[];
  readonly player_action_triggers: readonly ReactionTrigger[];
  readonly daily_triggers: readonly ReactionTrigger[];
}
```

Инварианты: `COMP-INV-08` — каждая категория имеет ≥1 триггер (gameplay lint); `COMP-INV-09` — все `event_id` зарегистрированы в реестре событий.

### 5.5. PermadeathLegacyDefinition

```ts
export interface LegacyOutcome {
  readonly id: string;
  readonly condition: string;          // 'default' | простое выражение над флагами
  readonly action: 'spawn_unique_enemy' | 'unlock_captain_transformation_branch';
  readonly enemy_template_id?: string;
  readonly spawn_location_policy_id?: string;
  readonly branch_id?: string;
  readonly epilogue_fact: string;
}

export interface PermadeathLegacyDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly trigger_conditions: readonly string[];
  readonly outcomes: readonly LegacyOutcome[];
}
```

Инварианты: `COMP-INV-10` — `outcomes.length ≥ 1`; `COMP-INV-11` — не более одного `condition='default'`; `COMP-INV-12` — `spawn_unique_enemy` требует `enemy_template_id`, `unlock_captain_transformation_branch` требует `branch_id`.

### 5.6. Рантайм: CompanionNarrativeState

```ts
export interface SynergyRuntime {
  readonly synergy_id: string;
  readonly activated_tick: number;
  readonly active: boolean;
}

export interface CompanionNarrativeEntry {
  readonly companion_instance_id: string;
  readonly current_threshold_id: string;
  readonly crossed_threshold_ids: readonly string[];
  readonly betrayal_charges: number;
  readonly last_relationship_value: number;
}

export interface CompanionNarrativeState {
  readonly active_synergies: readonly SynergyRuntime[];
  readonly active_conflicts: readonly SynergyRuntime[];
  readonly companions: Readonly<Record<string, CompanionNarrativeEntry>>;
  readonly legacy_resolved: Readonly<Record<string, string>>;   // companionDefId → outcomeId
  readonly ephemeral_windows: readonly { rule_id: string; expires_tick: number }[];
}
```

Инварианты: `COMP-INV-13` — `crossed_threshold_ids` монотонно растёт (порог не «разпересекается»); `COMP-INV-14` — `legacy_resolved` не перезаписывается после установки.

Снимок расширяет `party-state.json` (027) секцией `companion_narrative`; валидация — через memento-секцию (§8.2).

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `companion-relationship-threshold-tracker` | tracker | companion | 200 | `party.companion_relationship_changed`, `combat.order_issued` | `companion.relationship_threshold_crossed`, `companion.disobeyed_order` | `{ last_relationship_value, current_threshold_id }` |
| `companion-synergy-tracker` | tracker | companion | 180 | `party.companion_recruited`, `party.companion_dismissed`, `party.companion_died` | `companion.synergy_activated`, `companion.synergy_deactivated`, `companion.conflict_activated`, `companion.conflict_deactivated` | `{ active_synergy_ids, active_conflict_ids }` |
| `companion-reaction-resolver` | resolver | companion | 300 | `world.event_occurred`, `narrative.player_action_recorded`, `economy.trade_executed`, `cataclysm.effect_applied` | `companion.reaction_triggered_macro`, `companion.reaction_triggered_player_action`, `companion.reaction_triggered_daily` | `null` |
| `companion-betrayal-tracker` | tracker | companion | 90 | `party.companion_relationship_changed`, `combat.started` | `companion.betrayal_triggered`, `companion.betrayal_averted` | `{ betrayal_charges, last_relationship_value }` |
| `companion-legacy-resolver` | resolver | companion | 150 | `party.companion_died` | `companion.legacy_enemy_spawned`, `companion.legacy_transform_unlocked` | `null` |
| `companion-acquisition-hook-resolver` | resolver | companion | 120 | `world.event_occurred`, `world.location_changed`, `economy.quest_generated` | `companion.acquisition_hook_triggered`, `companion.acquisition_hook_completed`, `companion.acquisition_hook_failed` | `null` |

Правила 004: tracker персистит, resolver — нет; `role_tags ⊇ ['companion']`; namespace событий `companion.*`.

### 6.2. JSON Schema

- `relationship-thresholds.json` — `thresholds` minItems 1; `min_value`/`max_value` ∈ [-100,100]; `mechanical_effects` enum (8 значений); `narrative_tone` enum (5).
- `companion-synergy.json` — `required_companion_ids` minItems 2; `synergy_type` enum; `quarrel_event_id` запрещён при `positive` (if/then).
- `permadeath-legacy.json` — `outcomes` minItems 1; `action` enum; if/then по `enemy_template_id`/`branch_id`.
- `acquisition-hook.json` — `hook_type` enum 4; if/then: `quest` ⇒ `quest_template_id` required.
- `reaction-granularity.json` — три массива обязательны; `event_id` pattern topic; `reaction_policy_id` required.
- `party-state.json` (расширение 027) — `companion_narrative` object: `active_synergies`, `active_conflicts`, `companions`, `legacy_resolved`, `ephemeral_windows`; `additionalProperties: false` на всех уровнях.

### 6.3. Политики

Все числа (пороги 75/50/-50/-75, веса бонусов, шансы ослушания, TTL эфемерных окон) — только в контенте. Код читает через `IContentRegistry.getByKind(...)`. Срез первой волны — `content/{relationshipThresholds,synergy,permadeathLegacy,acquisitionHook,reactionGranularity}/core.json`.

### 6.4. События

| Topic | Payload (минимум) | Source |
|---|---|---|
| `companion.acquisition_hook_triggered` | hook_id, companion_def_id, location_id | core |
| `companion.acquisition_hook_completed` | hook_id, companion_def_id | core |
| `companion.acquisition_hook_failed` | hook_id, reason_tag | core |
| `companion.relationship_threshold_crossed` | companion_id, threshold_id, direction | core |
| `companion.synergy_activated` | synergy_id, companion_ids | core |
| `companion.synergy_deactivated` | synergy_id, reason_tag | core |
| `companion.conflict_activated` | synergy_id, companion_ids | core |
| `companion.conflict_deactivated` | synergy_id, reason_tag | core |
| `companion.quarrel_occurred` | synergy_id, companion_ids | core |
| `companion.reaction_triggered_macro` | companion_id, rule_id, trigger_topic | core |
| `companion.reaction_triggered_player_action` | companion_id, rule_id, action_tag | core |
| `companion.reaction_triggered_daily` | companion_id, rule_id, trigger_topic | core |
| `companion.disobeyed_order` | companion_id, order_id, charge | core |
| `companion.sabotage_attempted` | companion_id, target_tag | core |
| `companion.betrayal_triggered` | companion_id, combat_instance_id | core |
| `companion.legacy_enemy_spawned` | companion_def_id, enemy_template_id, outcome_id | core |
| `companion.legacy_transform_unlocked` | companion_def_id, branch_id, outcome_id | core |

Фракционные расширения: `companion.industrial-steam.*`, `companion.ancient-arcane.*`, `companion.necromantic-corpse.*`, `companion.living-artifact.*` — регистрация обязательна, коллизии с ядром запрещены.

### 6.5. Контент первой волны

6 напарников (`companion-steam-engineer`, `companion-arcane-mage`, `companion-necromancer`, `companion-relic-hunter`, `companion-disgraced-captain`, `companion-double-agent`), 4 синергии/конфликта, 3 сценария наследия (`legacy-undead-revenant`, `legacy-necromancer-path`, `legacy-betrayal-or-necromancy`), 6 зацепок, 2 политики порогов, 2 политики реакций.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Порог отношений**

```
[neutral] --delta: value ∈ [min,max] нового порога--> [threshold(tone)]
[threshold] --delta--> [threshold'] + emit relationship_threshold_crossed
[*] --companion_died/dismissed--> [terminal]
```

**(b) Синергия/конфликт**

```
[inactive] --roster ⊇ required ∧ activation_policy ok--> [active] + emit activated
[active] --roster ⊄ required ∨ died/dismissed--> [inactive] + emit deactivated
[active:negative] --tick ∧ quarrel_chance--> [quarrel] + emit quarrel_occurred
```

**(c) Предательство**

```
[loyal] --relationship < betrayal_threshold--> [charged(n)]
[charged(n)] --n ≥ betrayal_charges_threshold ∧ combat.started--> [betrayed] + emit betrayal_triggered
[charged(n)] --relationship ≥ threshold--> [loyal] + emit betrayal_averted
```

**(d) Наследие**

```
[pending] --party.companion_died--> [evaluating]
[evaluating] --outcome(condition)--> [resolved(outcome_id)] + emit legacy_*
[resolved] --> [terminal]   // COMP-INV-14
```

### 7.2. Sequence: реакция на макро-событие

```
world.event_occurred{event_id}
  → companion-reaction-resolver: pre-index[event_id] → rules
  → для каждого напарника в отряде: match rule → emit reaction_triggered_macro
  → effects: mood (027), relationship delta (ApplyRelationshipDelta), epilogue fact (036)
```

### 7.3. Tick-контракт

Фаза `scope:companion` идёт после `scope:party` (027) и до `scope:combat` (029): бой видит актуальные отношения и флаги предательства того же такта. Companion-трекеры получают `tickScope('companion')`; порядок — priority desc, tie-breaker по id (INV-10 004). Пропуск фазы допускается только для TTL эфемерных окон с детерминированным догоном по числу пропущенных тактов.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.companion.acquisition_hook` (появление зацепок), `rng.companion.relationship` (ослушание/саботаж), `rng.companion.daily_reaction` (срабатывание повседневных реакций), `rng.companion.synergy_activation` (активация синергии/конфликта при неоднозначном составе), `rng.companion.legacy_outcome` (выбор исхода при нескольких подходящих). Смешение запрещено; `Math.random`/`Date.now` запрещены. Повторная доставка события игнорируется по ключу `(topic, tick, companion_id)`.

### 7.5. Алгоритм выбора исхода наследия

```
resolveLegacy(def, flags):
  for outcome in def.outcomes where outcome.condition != 'default':
      if evalCondition(outcome.condition, flags): return outcome
  defaults = outcomes where condition == 'default'
  if defaults.length == 1: return defaults[0]
  if defaults.length > 1: return pickOne(rng.companion.legacy_outcome, defaults)
  return Err(DOMAIN_COMPANION_LEGACY_UNRESOLVED)
```

Сложность O(outcomes) на смерть; порядок исходов стабилен (порядок в контенте).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 028; impl: 027
export interface IPartyRosterPort {
  roster(captainId: string): Result<readonly string[], AppError>;         // companion instance ids
  definitions(captainId: string): Result<readonly string[], AppError>;    // companion definition ids
}

// owner: 028; impl: 029
export interface ICombatOrderPort {
  activeOrders(combatInstanceId: string): Result<readonly string[], AppError>;
}

// owner: 028; impl: 023/024
export interface IWorldLocationContextPort {
  locationTags(nodeId: string): Result<readonly string[], AppError>;
  isHomeCity(companionDefId: string, nodeId: string): Result<boolean, AppError>;
}

// owner: 028; impl: 033
export interface ITransformationUnlockPort {
  unlockBranch(captainId: string, branchId: string, evidence: string): Result<void, AppError>;
}
```

`IEpilogueFactPort` — контракт 027, владелец переходит к 036; 028 вызывает его без изменений.

### 8.2. Адаптеры

`PartyRosterAdapter` (делегат к 027 `PartyStore`), `NullCombatOrderPort` (`Ok([])`), `NullTransformationUnlockPort` (`Ok(undefined)` + запись в collector для тестов), `CompanionNarrativeMementoSection` (сериализация §5.6).

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_COMPANION_UNKNOWN` | companion id не найден | да |
| `DOMAIN_COMPANION_HOOK_UNKNOWN` | hook id не найден | да |
| `DOMAIN_COMPANION_HOOK_CONDITIONS_UNMET` | локация/репутация не выполнены | да |
| `DOMAIN_COMPANION_THRESHOLD_OVERLAP` | пороги перекрываются | нет |
| `DOMAIN_COMPANION_SYNERGY_INVALID` | <2 напарников или неизвестный id | нет |
| `DOMAIN_COMPANION_LEGACY_UNRESOLVED` | нет подходящего исхода | нет |
| `DOMAIN_COMPANION_RELATIONSHIP_RANGE` | значение вне [-100,100] | нет |
| `INFRA_COMPANION_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые события

| Topic | Реакция | Фаза |
|---|---|---|
| `party.companion_recruited` / `_dismissed` / `_died` | пересчёт состава синергий; наследие | event-loop |
| `party.companion_relationship_changed` | смена порога, заряды предательства | event-loop |
| `combat.order_issued` | проверка ослушания | event-loop |
| `combat.started` | проверка предательства | event-loop |
| `combat.crew_died` | реакция на потерю | event-loop |
| `world.event_occurred`, `world.ruler_changed`, `world.location_changed` | реакции macro/daily | event-loop |
| `cataclysm.triggered`, `cataclysm.effect_applied` | макро-реакции | event-loop |
| `economy.trade_executed`, `economy.loot_*` | реакции player_action/daily | event-loop |
| `narrative.player_action_recorded` | реакции player_action | event-loop |

### 9.2. Эмитируемые события

Все topics §6.4. Consumers: 027 (mood/morale), 029/031 (бой), 033 (ветки), 034 (диалоги), 036 (факты).

### 9.3. Мосты

`party.companion_died → companion.legacy_*`; `combat.order_issued → companion.disobeyed_order`; `world.* → companion.reaction_triggered_macro|daily`; `economy.* → companion.reaction_triggered_*`; `companion.legacy_transform_unlocked → 033 (unlockBranch)`; факты `epilogue.companion.*` / `epilogue.synergy.*` → 036.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `ResolveAcquisitionHook` | `{hook_id, node_id, evidence[]}` | `{status, companion_def_id}` | Content, WorldLocation | `acquisition_hook_*` |
| `ApplyRelationshipDelta` | `{instance_id, delta, source_topic}` | `{value, threshold_id}` | PartyRoster | `relationship_threshold_crossed`, `companion_relationship_changed` |
| `EvaluateSynergies` | `{captain_id}` | `{active[], conflicts[]}` | PartyRoster | `synergy_*`, `conflict_*` |
| `ResolvePermadeathLegacy` | `{companion_def_id, flags}` | `{outcome_id}` | Transformation | `legacy_enemy_spawned` / `legacy_transform_unlocked` |
| `GetCompanionNarrativeState` | — | снимок §5.6 | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема пакета не проходит | `INFRA_COMPANION_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | перекрытие порогов | `DOMAIN_COMPANION_THRESHOLD_OVERLAP` | падение загрузки контента |
| domain | значение отношений вне диапазона | `DOMAIN_COMPANION_RELATIONSHIP_RANGE` | `Err`, состояние не меняется |
| application | условия зацепки не выполнены | `DOMAIN_COMPANION_HOOK_CONDITIONS_UNMET` | `Err` пользователю |
| save | снимок невалиден | `INFRA_COMPANION_SCHEMA_INVALID` | reject load (политика 006) |
| runtime | дубль доставки | — | идемпотентный skip + warn |

---

## 11. Критерии приёмки

### DEV-SPEC-028-R01 — Процедурные зацепки найма
Требование: зацепка декларирует условия появления (тип, локация, репутация) и ведёт к найму через `party.companion_recruited`; найм невозможен без завершённой зацепки.
Invariant: COMP-INV-01…03.

- AC01: Given hook `rumor-tavern-arcane-district` и узел с тегами `[arcane-district, tavern]`, When `ResolveAcquisitionHook`, Then `companion.acquisition_hook_triggered` и `status='available'`.
- AC02: Given узел без тегов локации, When `ResolveAcquisitionHook`, Then `Err(DOMAIN_COMPANION_HOOK_CONDITIONS_UNMET)` и событие не эмитится.

### DEV-SPEC-028-R02 — Шкала отношений с механическими порогами
Требование: отношение ∈ [-100,100]; смена значения пересекает ровно один порог; пересечение эмитит событие и публикует факт.
Invariant: COMP-INV-04/05/13.

- AC03: Given `value=55`, When `delta=-90`, Then `value=-35`, порог `threshold-neutral`, событие `relationship_threshold_crossed{direction:'down'}`.
- AC04: Given значение уже в `threshold-hostile`, When `delta=0`, Then событие не эмитится (идемпотентность).
- AC05: Given политика с перекрывающимися порогами, When загрузка контента, Then `Err(DOMAIN_COMPANION_THRESHOLD_OVERLAP)`.

### DEV-SPEC-028-R03 — Синергии и конфликты
Требование: синергия активна, пока состав отряда содержит всех требуемых; активация/деактивация эмитит соответствующее событие; конфликт может порождать ссору.
Invariant: COMP-INV-06/07.

- AC06: Given в отряде оба напарника пары, When `EvaluateSynergies`, Then `companion.synergy_activated{synergy_id}`.
- AC07: Given один из пары уволен, When `party.companion_dismissed`, Then `companion.synergy_deactivated{reason_tag:'dismissed'}`.
- AC08: Given активный конфликт и `rng.companion.synergy_activation` даёт срабатывание, When такт, Then `companion.quarrel_occurred`.

### DEV-SPEC-028-R04 — Гранулярность реакций
Требование: три категории триггеров независимы; каждая сработавшая реакция даёт ровно одно событие своей категории и применяет эффекты политики.
Invariant: COMP-INV-08/09.

- AC09: Given `world.ruler_changed` и правило macro, When событие, Then `companion.reaction_triggered_macro{rule_id}`.
- AC10: Given `economy.trade_executed` по товару с тегом `relic`, When событие, Then `companion.reaction_triggered_daily`.
- AC11: Given триггер на незарегистрированное событие, When `ci:validate --stage=graph`, Then ошибка graph.

### DEV-SPEC-028-R05 — Наследие перманентной смерти
Требование: смерть напарника разрешает ровно один исход; исход либо спавнит врага, либо разблокирует ветку капитана; факт публикуется в эпилог.
Invariant: COMP-INV-10…12/14.

- AC12: Given `legacy-betrayal-or-necromancy` и флаг некромантии, When `party.companion_died`, Then `companion.legacy_transform_unlocked{branch_id:'captain-necromancer-path'}`.
- AC13: Given тот же сценарий без флага, When смерть, Then `companion.legacy_enemy_spawned{enemy_template_id:'enemy-undead-double-agent'}`.
- AC14: Given повторная смерть того же definition_id, When наследие, Then состояние не меняется (COMP-INV-14).

### DEV-SPEC-028-R06 — Расширение CompanionDefinition
Требование: пять новых policy-полей обязательны и разрешаются в контент; напарник не хранит рантайм.

- AC15: Given `CompanionDefinition` без `synergy_policy_id`, When `ci:validate --stage=schemas`, Then ошибка.
- AC16: Given `CompanionDefinition` с рантайм-полем, When схема, Then `additionalProperties` reject.

### DEV-SPEC-028-R07 — Переиспользование MechanicDefinition
Требование: контракт 004 не расширяется; все companion-механики имеют `role_tags ∋ 'companion'`; tracker персистит, resolver — нет.

- AC17: Given `companion-synergy-tracker`, When `ci:validate --stage=mechanics`, Then `persisted=true` и `state_schema` присутствует.
- AC18: Given resolver со `state_schema`, When `ci:validate`, Then ошибка.

### DEV-SPEC-028-R08 — Событийная модель
Требование: 17 ядерных тем зарегистрированы; фракционные namespace'ы не коллидируют с ядром.

- AC19: Given перечень §6.4, When `ci:validate --stage=events`, Then все темы присутствуют.
- AC20: Given фракционное событие с ID ядерной темы, When graph-стадия, Then `Err`.

### DEV-SPEC-028-R09 — RNG
Требование: ровно 5 потоков `rng.companion.*`, изолированных; запрет неименованной случайности.

- AC21: Given fixture-прогон, When `--stage=rng-streams`, Then задействованы ровно 5 companion-потоков, изоляция подтверждена.
- AC22: Given `Math.random` в `src/domain/companion/`, When CI, Then ошибка.

### DEV-SPEC-028-R10 — Сохранения и журнал
Требование: снимок включает companion-narrative секцию; загрузка валидирует схему и инварианты; журнал не восстанавливает поведение.

- AC23: Given save→load, When сравнение, Then deep-equal снимка и идентичное продолжение 10 тактов.
- AC24: Given снимок с `legacy_resolved` для неизвестного definition_id, When загрузка, Then `Err(INFRA_COMPANION_SCHEMA_INVALID)`.

### DEV-SPEC-028-R11 — CI
Требование: schema + graph + gameplay lint для контента напарников.

- AC25: Given negative-fixtures (нет синергии, нет реакции на daily, наследие без исходов, перекрытие порогов, цикл ссылок), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-028-R12 — Контент первой волны
Требование: 6 напарников с полным циклом, ≥4 синергии/конфликта, 3 сценария наследия, двойной агент как обязательный элемент.

- AC26: Given пакет `companion-core`, When загрузка, Then 6 напарников, ≥4 синергии, 3 наследия, у двойного агента декларировано условие предательства.

### DEV-SPEC-028-R13 — Вертикальный срез
Требование: сценарий SPEC-COMP-080 воспроизводится как `demo:m23`.

- AC27: Given `bun run demo:m23`, When завершение, Then `Ok`: зацепка → найм → синергия → пересечение порога → смерть → наследие → save/load → идентичное продолжение.

---

## 12. Тест-план

### 12.1. Unit
T01 схемы политик positive/negative; T02 `RelationshipModel` (пороги, диапазон, идемпотентность); T03 `SynergyModel` (активация по составу); T04 `LegacyModel` (выбор исхода, default, COMP-INV-14); T05 `ReactionModel` (индекс триггеров).

### 12.2. Integration
T06 use cases + recording bus (hook→recruit→synergy→threshold→death→legacy); T07 фаза `scope:companion` через `MechanicRuntime`; T08 мосты world/economy/combat/cataclysm.

### 12.3. Contract
T09 пакет контента против всех схем; T10 полный перечень тем §6.4; T11 companion-механики против `mechanic-definition.json`.

### 12.4. Determinism
T12 save/load/replay сценария; T13 изоляция 5 потоков + grep запретов.

### 12.5. E2E
T14 `demo:m23` (AC27).

### 12.6. CI
T15 `validate-companion-graph.ts`; T16 `validate-companion-lint.ts`.

Покрытие: каждый AC01…AC27 присутствует минимум в одном тесте.

---

## 13. Производительность

### 13.1. Бюджет
Мораль/синергии — O(|roster| · |synergies|); реакции — O(подписок по topic) через pre-index `event_id → rules`; наследие — O(outcomes). Фаза `scope:companion` должна укладываться в общий tick budget (контракт 007/016).

### 13.2. LOD
При перегрузке: TTL эфемерных окон батчатся с детерминированным догоном; повседневные реакции с флагом `non_critical` могут пропускаться; критические (порог, предательство, наследие) — никогда.

### 13.3. Профилирование
Счётчики `companion.*`, длительность фазы — в `ci:validation-report`. Нагрузочный сценарий: 6 напарников × 40 правил реакций × 500 тактов.

---

## 14. Миграции

Секция `companion_narrative` в `party-state.json` v1. Breaking-изменения — только через major bump save-формата; регламент — будущий документ миграций (OVERVIEW §8). Поля определений — additive-only в minor.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | `cataclysm.activated` vs `cataclysm.triggered`: закрепить единое имя в DESIGN | нет (спека нормативна) | design | до review Wave 5 |
| OQ-02 | Канонический namespace `player.*` или `narrative.player_action_recorded` | R04 (AC10) | arch | до Wave 6 |
| OQ-03 | `companion.fate_changed` — вводить или использовать `party.companion_died` | нет | design | до Wave 6 |
| OQ-04 | Локационный фильтр реакций требует world-position контракта 023 | AC09 partial | arch | до Wave 5 review |
| OQ-05 | Ветвящиеся личные арки (сейчас линейные в 027) | нет | design | до Wave 6 |

---

## 16. Что остаётся вне scope

- Числовой баланс порогов, шансов и весов — контент + Balance & Tuning.
- Тексты диалогов, личные арки (исполнение) → `DEV-SPEC-034`.
- Ветки трансформации → `DEV-SPEC-033`.
- Генерация эпилога → `DEV-SPEC-036`.
- Бой, раны, травмы, дуэли → `DEV-SPEC-029…031`.
- UI отряда и мобильный UX → `DEV-SPEC-013/016`.
- Миграции сохранений, сервер/мультиплеер.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | Ожидаемый TKT (M23) |
|---|---|---|---|---|
| SPEC-COMP-001/025 | R01 | AC01,AC02 | T01,T06 | M23-001,005 |
| SPEC-COMP-002/022 | R02 | AC03,AC04,AC05 | T02,T06 | M23-002,006 |
| SPEC-COMP-003/023 | R03 | AC06,AC07,AC08 | T03,T06 | M23-003,007 |
| SPEC-COMP-004/026 | R04 | AC09,AC10,AC11 | T05,T08 | M23-004,008 |
| SPEC-COMP-005/024 | R05 | AC12,AC13,AC14 | T04,T06 | M23-005,009 |
| SPEC-COMP-021 | R06 | AC15,AC16 | T01,T09 | M23-001 |
| SPEC-COMP-027 | R07 | AC17,AC18 | T11 | M23-010 |
| SPEC-COMP-030/031 | R08 | AC19,AC20 | T10 | M23-010 |
| SPEC-COMP-009/041 | R09 | AC21,AC22 | T13 | M23-011 |
| SPEC-COMP-010/050/051/028 | R10 | AC23,AC24 | T12 | M23-012 |
| SPEC-COMP-011/060…063 | R11 | AC25 | T15,T16 | M23-013 |
| SPEC-COMP-006/070…072 | R12 | AC26 | T09 | M23-014 |
| SPEC-COMP-080 | R13 | AC27 | T14 | M23-015 |

Итог декомпозиции: 15 тикетов `TKT-M23-001…015`, демо `demo:m23`.

---

## Приложение A. Чек-лист Definition of Done

- ✅ секции 1–17 присутствуют, нумерация сохранена;
- ✅ TS-интерфейсы зафиксированы (§5);
- ✅ JSON-схемы перечислены с ключевыми ограничениями (§6.2);
- ✅ state machines и sequence описаны (§7.1, §7.2);
- ✅ порты и заглушки имеют контракты (§8);
- ✅ ошибки — только `Result` (§8.3, §10);
- ✅ каждое R01…R13 имеет ≥1 AC (AC01…AC27);
- ✅ тест-план покрывает все AC (§12);
- ✅ структура файлов зафиксирована (§4.2);
- ✅ зависимости перечислены (§2);
- ✅ OQ закрыты или помечены (§15);
- ✅ DESIGN-источник указан, расхождения отмечены (§1.3).
