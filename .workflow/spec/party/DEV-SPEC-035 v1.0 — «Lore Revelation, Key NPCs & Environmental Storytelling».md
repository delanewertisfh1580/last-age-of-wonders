# DEV-SPEC-035 v1.0 — «Lore Revelation, Key NPCs & Environmental Storytelling»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 6 (Captain, Narrative, Hidden Branches), четвёртый блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-034`
**Блокирует:** `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Сюжет и лор»` (SPEC-LORE-004, 008, 012, 015, 019, 025, 026, 030, 033…039, 041/042, 050/051, 060/061, 074…079, 087…089)
**Связанные DEV-SPEC:** `DEV-SPEC-010/011` (визуал), `DEV-SPEC-014/015` (аудио), `DEV-SPEC-017` (фракции), `DEV-SPEC-023/024` (мир), `DEV-SPEC-026` (шрамы), `DEV-SPEC-027/028` (напарники — носители лора), `DEV-SPEC-032` (капитан), `DEV-SPEC-034` (вехи, арки, диалоги), `DEV-SPEC-036` (эпилог)
**Порождает веху:** `TICKETS-M30`

---

## 0. Как читать эту спеку

Спека отвечает за **раскрытие мира**: слои лора и фрагменты, ключевых NPC с динамическим состоянием, environmental storytelling через 4 канала и равноправные источники лора (напарники, NPC, окружение, находки). Она не порождает вехи и арки — это 034; она их наполняет.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`LoreLayerDefinition`**: слой лора с эпохой, хронологией и набором фрагментов;
- **`LoreRevelationLayerDefinition`**: слой раскрытия (`discovery`, `companion`, `faction`, `cataclysm`, `faction_specific`);
- **`KeyNpcDefinition`**: ключевой NPC (`faction_leader`, `antagonist`, `key_ally`, `mentor`) с базовым диалогом, динамическим состоянием и фактами эпилога;
- **`KeyNpcInstance`**: рантайм — отношение к капитану, статус, локация, участие в арках;
- **`LoreFragmentDefinition`**: фрагмент лора с условием раскрытия и каналом доставки;
- **environmental storytelling**: доставка через 4 канала (текст, визуал, аудио, реакции напарников) без точных цифр;
- **равноправные источники**: находка, NPC, напарник, окружение, событие мира — все публикуют факты без приоритета;
- **события** `narrative.lore_*` / `narrative.npc_*` (используют ядро 034) + фракционные namespace'ы;
- **RNG**: `rng.narrative.lore_revelation`, `rng.narrative.npc_state`;
- **сохранения**: секция `npc` + `lore` в снимке нарратива;
- **CI**: schema/graph/gameplay lint;
- **демо** `demo:m30`.

### 1.2. Что спецификация НЕ делает

- Не реализует вехи, арки, диалоговый движок и пролог → `DEV-SPEC-034`.
- Не генерирует эпилог → `DEV-SPEC-036`.
- Не реализует мир, города и правителей → `DEV-SPEC-023/024`.
- Не реализует шрамы как механику → `DEV-SPEC-026` (только читает `economy.scar_applied`).
- Не создаёт ассеты, шейдеры и аудио → `DEV-SPEC-010/011/014/015`.
- Не содержит финальные тексты и баланс.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-LORE-004` (слои лора) | §5.1, §5.2, R01 | нет |
| `SPEC-LORE-008` (ключевые NPC) | §5.3, §5.4, R02 | нет |
| `SPEC-LORE-012` (environmental storytelling) | §6.2, R03 | нет |
| `SPEC-LORE-015` (равноправные источники) | §9.3, R04 | нет |
| `SPEC-LORE-019` (масштаб) | §6.5, R10 | нет |
| `SPEC-LORE-025/030` (контракты слоёв) | §5.1, §5.2 | нет |
| `SPEC-LORE-026` (контракт NPC) | §5.3, §5.4 | нет |
| `SPEC-LORE-033…039` (механики NPC/лора) | §6.1 | нет |
| `SPEC-LORE-041/042` (события, мосты) | §6.4, §9.3 | нет |
| `SPEC-LORE-050/051` (детерминизм) | §7.4 | нет |
| `SPEC-LORE-060/061` (снимки) | §5.5, §14 | нет |
| `SPEC-LORE-074…079` (валидация) | §12.6 | нет |
| `SPEC-LORE-087…089` (скелеты и срез) | §6.5, §11 R11 | нет |

**Расхождения:** DESIGN вводит `narrative.lore_fragment_discovered`, но не задаёт контракт фрагмента; контракт вводится здесь (OQ-01). Мост `economy.scar_applied → narrative.lore_layer_revealed` зависит от 026 — при отсутствии шрамов мост не активируется (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-034` | `NarrativeStateInstance`, ядро `narrative.*`, `IReputationPort` |

### 2.2. Мягкие

`DEV-SPEC-010/011` (визуальные симптомы/шрамы), `DEV-SPEC-014/015` (аудио), `DEV-SPEC-017` (фракции), `DEV-SPEC-023/024` (`world.*`), `DEV-SPEC-026` (`economy.scar_applied`), `DEV-SPEC-027/028` (напарники-носители), `DEV-SPEC-032` (капитан), `DEV-SPEC-036` (эпилог).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/lore/**`, `src/application/lore/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Lore Layer | Слой истории мира (эпоха) с набором фрагментов |
| Lore Fragment | Единица знания, раскрываемая при условии |
| Revelation Layer | Слой раскрытия, определяющий канал и адресата лора |
| Key NPC | Сюжетно значимый персонаж с динамическим состоянием |
| Environmental Storytelling | Доставка лора через окружение, а не через реплики |
| Discovery Channel | Канал доставки: находка, NPC, напарник, окружение, событие |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/lore/` — определения, рантайм, модели (`LoreModel`, `RevelationModel`, `NpcModel`), ошибки, порты.
- `src/application/lore/` — use cases.
- `src/infrastructure/lore/` — store, event-handlers, memento-adapter к 034.
- `content/{loreLayer,loreRevelationLayer,loreFragment,keyNpc,npcPolicy,lorePolicy}/`, `content/mechanics/lore.json`.

### 4.2. Файлы

```text
src/domain/lore/
  LoreLayerDefinition.ts
  LoreFragmentDefinition.ts
  LoreRevelationLayerDefinition.ts
  KeyNpcDefinition.ts
  KeyNpcInstance.ts
  LoreErrors.ts
  LoreModel.ts
  RevelationModel.ts
  NpcModel.ts
  ICompanionLorePort.ts
  IWorldLocationPort.ts
src/application/lore/
  DiscoverLoreFragment.ts
  RevealLoreLayer.ts
  ChangeNpcState.ts
  KillKeyNpc.ts
  GetNpcState.ts
  GetLoreState.ts
src/infrastructure/lore/
  LoreStore.ts
  NpcStore.ts
  LoreEventHandler.ts
  LoreStateMementoProvider.ts
  NullCompanionLorePort.ts
  NullWorldLocationPort.ts
content/schemas/
  lore-layer.json
  lore-fragment.json
  lore-revelation-layer.json
  key-npc.json
  key-npc-instance.json
content/loreLayer/core.json
content/loreFragment/core.json
content/loreRevelationLayer/core.json
content/keyNpc/core.json
content/mechanics/lore.json
tools/ci/stages/validate-lore-graph.ts
tools/ci/stages/validate-lore-lint.ts
test/lore/…
scripts/demo-m30.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `ILoreStore` | `LoreStore` | singleton | `domain-init` |
| `INpcStore` | `NpcStore` | singleton | `domain-init` |
| `ICompanionLorePort` | `NullCompanionLorePort` (замена в 028) | singleton | `integration` |
| `IWorldLocationPort` | `NullWorldLocationPort` (замена в 023) | singleton | `integration` |
| `IMementoProvider('lore')` | `LoreStateMementoProvider` | singleton | `save-composition` |
| `lore-*`/`npc-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. LoreLayerDefinition и LoreFragmentDefinition

```ts
export interface LoreLayerDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly era_id: string;
  readonly chronological_order: number;
  readonly revelation_policy_id: string;
  readonly lore_fragment_ids: readonly string[];
}

export interface LoreFragmentDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly layer_id: string;
  readonly discovery_policy_id: string;
  readonly revelation_layer_id: string;
  readonly delivery_channels: readonly ('text' | 'visual' | 'audio' | 'companion')[];
  readonly epilogue_fact_id?: string;
}
```

Инварианты: `LORE-INV-01` — `chronological_order` уникален и ≥1; `LORE-INV-02` — все `lore_fragment_ids` существуют; `LORE-INV-03` — `delivery_channels` ≥1, без дублей; `LORE-INV-04` — фрагмент не хранит рантайм.

### 5.2. LoreRevelationLayerDefinition

```ts
export type RevelationLayerType = 'discovery' | 'companion' | 'faction' | 'cataclysm' | 'faction_specific';

export interface LoreRevelationLayerDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly layer_type: RevelationLayerType;
  readonly faction_id?: string;          // обязателен при faction_specific
  readonly revelation_policy_id: string;
  readonly faction_specific: boolean;
}
```

Инварианты: `LORE-INV-05` — `layer_type` ∈ 5 нормативных; `LORE-INV-06` — `faction_specific=true ⇒ faction_id` задан.

### 5.3. KeyNpcDefinition

```ts
export type NpcType = 'faction_leader' | 'antagonist' | 'key_ally' | 'mentor';

export interface KeyNpcDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly faction_id: string;
  readonly npc_type: NpcType;
  readonly core_dialogue_policy_id: string;
  readonly dynamic_state_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly epilogue_fact_policy_id: string;
  readonly lore_fragment_ids: readonly string[];
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `LORE-INV-07` — `npc_type` ∈ 4 нормативных; `LORE-INV-08` — `core_dialogue_policy_id` и `dynamic_state_policy_id` обязательны; `LORE-INV-09` — `lore_fragment_ids` разрешаются.

### 5.4. KeyNpcInstance

```ts
export type NpcStatus = 'alive' | 'dead' | 'missing' | 'imprisoned' | 'ascended';

export interface KeyNpcInstance {
  readonly npc_id: string;
  readonly status: NpcStatus;
  readonly attitude: number;             // [-100,100] к капитану
  readonly location_id: string;
  readonly arc_ids: readonly string[];
  readonly revealed_fragment_ids: readonly string[];
  readonly last_state_change_tick: number;
}
```

Инварианты: `LORE-INV-10` — `attitude ∈ [-100,100]`; `LORE-INV-11` — `dead` терминален, кроме `ascended` по политике; `LORE-INV-12` — `dead` публикует факт `epilogue.narrative.npc_died`.

### 5.5. Снимок

`LoreStateSnapshot` = `{ layers_revealed, fragments_discovered, npcs: KeyNpcInstance[] }`, `$id: lore-state.json`, провайдер `domainId: 'lore'`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `lore-discovery-tracker` | tracker | narrative | 265 | `world.location_changed`, `economy.scar_applied`, `world.event_occurred` | `narrative.lore_fragment_discovered`, `narrative.lore_layer_revealed` | `{ discovered_fragment_ids }` |
| `npc-steam-emperor-relationship-tracker` | tracker | narrative | 255 | `narrative.dialogue_ended`, `captain.reputation_changed` | `narrative.npc_state_changed` | `{ attitude, status }` |
| `lore-companion-revealer` | resolver | narrative | 275 | `companion.reaction_triggered_macro`, `party.companion_died` | `narrative.lore_fragment_discovered` | `null` |
| `environmental-storyteller` | resolver | narrative | 240 | `world.location_changed`, `combat.environment_changed` | `narrative.lore_fragment_discovered` | `null` |

### 6.2. Environmental storytelling

Доставка только через 4 канала (`text`, `visual`, `audio`, `companion`) по `delivery_policy_id`. Правила: нет точных цифр и прогресс-баров; каждый фрагмент обязан иметь ≥1 канал; окружение может раскрывать фрагмент без NPC.

### 6.3. JSON Schema

- `lore-layer.json` — `chronological_order` integer ≥1; `lore_fragment_ids` minItems 1.
- `lore-fragment.json` — `delivery_channels` minItems 1, enum 4; `layer_id` required.
- `lore-revelation-layer.json` — `layer_type` enum 5; if `faction_specific` then `faction_id` required.
- `key-npc.json` — `npc_type` enum 4; `core_dialogue_policy_id`/`dynamic_state_policy_id` required.
- `key-npc-instance.json` — `attitude` [-100,100]; `status` enum 5; `additionalProperties: false`.

### 6.4. События

Ядро 034: `narrative.lore_layer_revealed`, `narrative.lore_fragment_discovered`, `narrative.npc_state_changed`, `narrative.npc_died`.

Фракционные: `narrative.industrial-steam.*`, `narrative.ancient-arcane.*`, `narrative.necromantic-corpse.*`, `narrative.living-artifact.*` (например `narrative.ancient-arcane.leyline-activation-discovered`).

### 6.5. Контент первой волны

4 слоя лора (`ancient-magical`, `industrial-revolution`, `necrotic-collapse`, `current-age`), 12 фрагментов, 5 слоёв раскрытия, 6 ключевых NPC (по одному на фракцию + 2 антагониста).

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Фрагмент**

```
[hidden] --discovery_condition--> [discovered] + emit lore_fragment_discovered
[discovered] --layer_policy--> [revealed] + emit lore_layer_revealed (если слой полон)
```

**(b) NPC**

```
[alive] --state_change--> [alive(attitude)] + emit npc_state_changed
[alive] --death_condition--> [dead] + emit npc_died + fact
[alive] --missing_condition--> [missing] + emit npc_state_changed
[missing] --return_condition--> [alive]
[dead] --> [terminal] (кроме ascended-политики)
```

### 7.2. Sequence: раскрытие лора окружением

```
world.location_changed{location_id}
  → environmental-storyteller: match discovery_policy
  → DiscoverLoreFragment{fragment_id}
      → delivery_channels (≥1) → cinematic/audio/companion hook
      → emit narrative.lore_fragment_discovered
  → RevealLoreLayer{layer_id, if all fragments discovered}
      → emit narrative.lore_layer_revealed
      → IEpilogueFactPort.publish('epilogue.narrative.lore_revealed')
```

### 7.3. Tick-контракт

`scope:narrative`; трекеры лора идут после вех/арок (034), чтобы видеть актуальные события. Раскрытие фрагментов может батчиться; смерть NPC — никогда.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.narrative.lore_revelation` (выбор фрагмента при нескольких кандидатах), `rng.narrative.npc_state` (вариативность поведения NPC). Смешение запрещено; повторное раскрытие того же фрагмента игнорируется.

### 7.5. Отношение NPC

```
changeAttitude(instance, delta, policy):
  value = clamp(instance.attitude + delta * policy.weight, -100, 100)
  if policy.thresholds.crossed(instance.attitude, value): emit npc_state_changed{kind:'attitude-tier'}
  return value
```

Сложность O(1).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 035; impl: 028
export interface ICompanionLorePort {
  carrierCompanions(captainId: string): Result<readonly string[], AppError>;
}

// owner: 035; impl: 023
export interface IWorldLocationPort {
  currentLocation(captainId: string): Result<string, AppError>;
  locationTags(locationId: string): Result<readonly string[], AppError>;
}
```

### 8.2. Адаптеры

`NullCompanionLorePort` (`Ok([])`), `NullWorldLocationPort` (`Ok('location-unknown')`), `LoreStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_LORE_LAYER_UNKNOWN` | слой не найден | да |
| `DOMAIN_LORE_FRAGMENT_UNKNOWN` | фрагмент не найден | да |
| `DOMAIN_LORE_REVELATION_INVALID` | контракт слоя раскрытия нарушен | нет |
| `DOMAIN_NPC_UNKNOWN` | NPC не найден | да |
| `DOMAIN_NPC_DEAD` | действие с погибшим NPC | да |
| `DOMAIN_NPC_ATTITUDE_RANGE` | значение вне диапазона | нет |
| `INFRA_LORE_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`world.location_changed`, `world.event_occurred`, `world.ruler_changed`, `economy.scar_applied`, `companion.reaction_triggered_macro`, `party.companion_died`, `combat.environment_changed`, `captain.reputation_changed`, `narrative.dialogue_ended`.

### 9.2. Эмитируемые

`narrative.lore_fragment_discovered`, `narrative.lore_layer_revealed`, `narrative.npc_state_changed`, `narrative.npc_died` (+ фракционные). Consumers: 027/028, 032, 034, 036.

### 9.3. Мосты и равноправные источники

`world.location_changed → narrative.lore_fragment_discovered` (окружение); `companion.reaction_triggered_macro → narrative.lore_fragment_discovered` (напарник); `narrative.dialogue_ended → narrative.npc_state_changed` (NPC); `economy.scar_applied → narrative.lore_layer_revealed` (следы катастроф); находки — через `discovery_policy`. Ни один источник не имеет приоритета: факты копятся в общем коллекторе 036.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `DiscoverLoreFragment` | `{captain_id, fragment_id, source}` | `{discovered}` | World, Companion | `lore_fragment_discovered` |
| `RevealLoreLayer` | `{captain_id, layer_id}` | `{revealed}` | — | `lore_layer_revealed` |
| `ChangeNpcState` | `{npc_id, delta_attitude?, status?}` | `KeyNpcInstance` | — | `npc_state_changed` |
| `KillKeyNpc` | `{npc_id, cause}` | `{facts}` | — | `npc_died` |
| `GetNpcState` | `{npc_id}` | `KeyNpcInstance` | — | — |
| `GetLoreState` | `{captain_id}` | снимок | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_LORE_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | `faction_specific` без `faction_id` | `DOMAIN_LORE_REVELATION_INVALID` | падение загрузки контента |
| domain | отношение вне диапазона | `DOMAIN_NPC_ATTITUDE_RANGE` | `Err`, значение не меняется |
| application | действие с погибшим NPC | `DOMAIN_NPC_DEAD` | `Err` |
| save | снимок невалиден | `INFRA_LORE_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-035-R01 — Слои лора и фрагменты
Требование: слои упорядочены, фрагменты принадлежат слою и раскрываются по условию.
Invariant: LORE-INV-01…04.

- AC01: Given `chronological_order` дублируется, When `ci:validate --stage=schemas`, Then ошибка.
- AC02: Given условие раскрытия выполнено, When `DiscoverLoreFragment`, Then `narrative.lore_fragment_discovered`.

### DEV-SPEC-035-R02 — Слои раскрытия
Требование: 5 типов; `faction_specific` требует `faction_id`.
Invariant: LORE-INV-05/06.

- AC03: Given `layer_type='faction_specific'` без `faction_id`, When загрузка, Then `DOMAIN_LORE_REVELATION_INVALID`.
- AC04: Given все фрагменты слоя раскрыты, When политика, Then `narrative.lore_layer_revealed`.

### DEV-SPEC-035-R03 — Environmental storytelling
Требование: лор доставляется окружением через 4 канала, без цифр.
Invariant: LORE-INV-03.

- AC05: Given `world.location_changed` в локации с тегом, When такт, Then фрагмент раскрыт через `visual`/`audio`.
- AC06: Given фрагмент без каналов доставки, When gameplay lint, Then ошибка.

### DEV-SPEC-035-R04 — Равноправные источники
Требование: находка, NPC, напарник, окружение и событие мира публикуют факты без приоритета.

- AC07: Given раскрытие из 3 источников, When коллектор фактов, Then все 3 присутствуют.

### DEV-SPEC-035-R05 — Ключевые NPC
Требование: 4 типа NPC; отношение в диапазоне; смерть публикует факт.
Invariant: LORE-INV-07…12.

- AC08: Given `npc_type='antagonist'`, When загрузка, Then `dynamic_state_policy_id` разрешается.
- AC09: Given `ChangeNpcState{+20}` при `attitude=95`, When вызов, Then `100` и `narrative.npc_state_changed`.
- AC10: Given `KillKeyNpc`, When вызов, Then `status='dead'`, `narrative.npc_died` и факт эпилога.
- AC11: Given `status='dead'`, When `ChangeNpcState`, Then `Err(DOMAIN_NPC_DEAD)`.

### DEV-SPEC-035-R06 — События
Требование: используются ядерные темы 034; фракционные без коллизий.

- AC12: Given перечень §6.4, When `--stage=events`, Then темы присутствуют и не дублируют ядро.

### DEV-SPEC-035-R07 — RNG и сохранения
Требование: 2 потока; снимок валидируется.

- AC13: Given save→load, When сравнение, Then deep-equal и идентичное продолжение 10 тактов.
- AC14: Given fixture-прогон, When `--stage=rng-streams`, Then используются только разрешённые потоки.

### DEV-SPEC-035-R08 — CI
Требование: schema + graph + lint.

- AC15: Given negative-fixtures (слой без фрагментов, фрагмент без каналов, NPC без диалога, `faction_specific` без фракции), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-035-R09 — Контент и срез
Требование: 4 слоя, 12 фрагментов, 5 слоёв раскрытия, 6 NPC; сценарий SPEC-LORE-089 как `demo:m30`.

- AC16: Given `bun run demo:m30`, When завершение, Then `Ok`: локация → фрагмент → слой → NPC → смерть NPC → save/load → идентичное состояние.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `LoreModel`; T03 `RevelationModel`; T04 `NpcModel` (attitude, статусы).
12.2 Integration: T05 use cases + recording bus; T06 мосты 023/026/027/028.
12.3 Contract: T07 определения против схем; T08 события.
12.4 Determinism: T09 save/load + RNG-изоляция.
12.5 E2E: T10 `demo:m30`.
12.6 CI: T11 graph; T12 lint.

---

## 13. Производительность

### 13.1. Бюджет
Раскрытие — O(policies); NPC — O(1) на изменение. Фаза `scope:narrative`.

### 13.2. LOD
Фрагменты могут раскрываться пакетно при входе в локацию; смерть NPC и финалы — никогда.

### 13.3. Профилирование
Счётчики `narrative.lore_*`, `narrative.npc_*`; сценарий: 12 фрагментов × 6 NPC × 500 тактов.

---

## 14. Миграции

`lore-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Контракт `LoreFragmentDefinition` (DESIGN его не фиксирует) | R01 | arch | до M30 |
| OQ-02 | Поведение моста `economy.scar_applied`, если 026 не поставил шрам | R03 | design | до M30 |
| OQ-03 | Может ли NPC «воскреснуть» через некромантию | R05 | design | до Wave 6 review |

---

## 16. Что остаётся вне scope

- Вехи, арки, диалоговый движок → `DEV-SPEC-034`.
- Генерация эпилога → `DEV-SPEC-036`.
- Мир, города, правители → `DEV-SPEC-023/024`.
- Шрамы как механика → `DEV-SPEC-026`.
- Ассеты, шейдеры, аудио, финальные тексты.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M30) |
|---|---|---|---|---|
| SPEC-LORE-004/025 | R01 | AC01,AC02 | T02,T05 | M30-001 |
| SPEC-LORE-030/033 | R02 | AC03,AC04 | T03,T05 | M30-002 |
| SPEC-LORE-012/034/035 | R03 | AC05,AC06 | T05,T12 | M30-003 |
| SPEC-LORE-015 | R04 | AC07 | T05 | M30-003 |
| SPEC-LORE-008/026/036…039 | R05 | AC08…AC11 | T04,T05 | M30-004 |
| SPEC-LORE-041/042 | R06 | AC12 | T08 | M30-005 |
| SPEC-LORE-050/051/060/061 | R07 | AC13,AC14 | T09 | M30-006 |
| SPEC-LORE-074…079 | R08 | AC15 | T11,T12 | M30-007 |
| SPEC-LORE-019/087…089 | R09 | AC16 | T10 | M30-008 |

Итог декомпозиции: 8 тикетов `TKT-M30-001…008`, демо `demo:m30`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.3); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R09 → AC01…AC16; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
