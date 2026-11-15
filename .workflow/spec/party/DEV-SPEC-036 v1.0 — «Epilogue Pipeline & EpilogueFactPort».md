# DEV-SPEC-036 v1.0 — «Epilogue Pipeline & EpilogueFactPort»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 7 (Epilogue & Meta), первый блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-034`, `DEV-SPEC-035`
**Блокирует:** `DEV-SPEC-037`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Генератор эпилога»` (SPEC-EPI-001…016, 020…025, 027, 028, 030…032, 040/041, 050/051, 060…063, 070…073, 080)
**Связанные DEV-SPEC:** `DEV-SPEC-025` (катаклизмы), `DEV-SPEC-027` (отряд), `DEV-SPEC-032` (капитан), `DEV-SPEC-033` (трансформация), `DEV-SPEC-034/035` (нарратив и лор), `DEV-SPEC-037` (мета-угроза), `DEV-SPEC-010/012` (рендер и анимации)
**Порождает веху:** `TICKETS-M31`

---

## 0. Как читать эту спеку

Спека задаёт **чистый пайплайн эпилога** `FactCollector → FactFilter → FactSorter → TextComposer → Renderer` и **владеет контрактом `IEpilogueFactPort`**, который реализуют все предыдущие домены. Мета-угроза и финальный выбор следующего забега — 037; здесь финальный выбор только объявляется и фиксируется.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`IEpilogueFactPort`** (owner 036) — публикация фактов из 025/027/028/032/033/034/035;
- **`EpilogueFactDefinition`** — иерархический тематический атом (`theme`, `emotional_tone`, `narrative_weight`, `significance`, `sub_facts`, `related_facts`);
- **`EpilogueTemplateDefinition`**, **`NarrativeStyleDefinition`**, **`EpilogueSceneDefinition`**, **`FinalChoiceDefinition`**;
- **5-стадийный пайплайн** с механиками-плагинами;
- **тематическое плетение** (нити фактов) и **адаптивный стиль**;
- **`EpilogueInstance`** — снимок + журнал;
- **события** `epilogue.*` (11 ядерных тем) + фракционные namespace'ы;
- **RNG**: 7 потоков `rng.epilogue.*`;
- **CI**: schema + graph + gameplay lint;
- **демо** `demo:m31`.

### 1.2. Что спецификация НЕ делает

- Не реализует мета-угрозу и её влияние на следующий забег → `DEV-SPEC-037`.
- Не владеет фактами: их порождают другие домены (здесь только контракт и коллектор).
- Не реализует 3D-сцены и шейдеры → `DEV-SPEC-010/011`, анимации → `DEV-SPEC-012`.
- Не реализует нарратив забега → `DEV-SPEC-034/035`.
- Не содержит финальные тексты и баланс.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-EPI-001` (границы) | §1.1/§1.2, R01 | нет |
| `SPEC-EPI-002` (пайплайн) | §5.6, §7.1, R02 | нет |
| `SPEC-EPI-003` (модель факта) | §5.1, R03 | нет |
| `SPEC-EPI-004` (гибридная ось) | §6.2, R04 | нет |
| `SPEC-EPI-005` (плетение) | §7.5, R05 | нет |
| `SPEC-EPI-006` (стиль) | §5.3, R06 | нет |
| `SPEC-EPI-007` (текст + сцены) | §5.4, R07 | рендер — 040/041 |
| `SPEC-EPI-008` (финальный выбор) | §5.5, R08 | эффекты — 037 |
| `SPEC-EPI-011` (механики) | §6.1, R02 | нет |
| `SPEC-EPI-012` (события) | §6.4, R09 | нет |
| `SPEC-EPI-013` (RNG) | §7.4, R10 | нет |
| `SPEC-EPI-014` (снимки) | §5.7, R11 | нет |
| `SPEC-EPI-015` (CI) | §12.6, R12 | нет |
| `SPEC-EPI-016` (масштаб) | §6.5, R13 | нет |
| `SPEC-EPI-020…025/027/028` (контракты) | §5, §6 | нет |
| `SPEC-EPI-030/031` (ядро) | §6.4 | нет |
| `SPEC-EPI-032` (мосты) | §9.3 | нет |
| `SPEC-EPI-040/041` (детерминизм) | §7.4 | нет |
| `SPEC-EPI-050/051` (снимки) | §5.7, §14 | нет |
| `SPEC-EPI-060…063` (валидация) | §12.6 | нет |
| `SPEC-EPI-070…073` (скелеты) | §6.5 | нет |
| `SPEC-EPI-080` (срез) | §11 R13 | нет |

**Расхождения:** DESIGN упоминает мосты `epilogue.fact_published`, которых нет в ядерном списке событий; нормативно вводится `epilogue.fact_published` как событие коллектора (OQ-01). `hidden_branch.meta_epilogue_unlocked → epilogue.meta_threat_generation_enabled` реализуется в 037 (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-034` | `narrative.ending_reached`, факты `epilogue.narrative.*` |
| `DEV-SPEC-035` | лор-факты, `epilogue.narrative.lore_revealed` |

### 2.2. Мягкие

`DEV-SPEC-025` (`cataclysm.ended`), `DEV-SPEC-027/028` (`party.*`), `DEV-SPEC-032` (`captain.retired`, фон), `DEV-SPEC-033` (`hidden_branch.final_state_reached`), `DEV-SPEC-037` (мета-угроза), `DEV-SPEC-010/012` (рендер).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/epilogue/**`, `src/application/epilogue/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Epilogue Fact | Иерархический тематический атом финального нарратива |
| Narrative Thread | Нить связанных фактов из разных систем |
| Weaving | Плетение нитей в связный нарратив |
| Narrative Style | Стиль повествования, зависящий от финала и доминирующих фактов |
| Pipeline Stage | Один из 5 этапов: Collector, Filter, Sorter, Composer, Renderer |
| Final Choice | Один крупный выбор в конце эпилога |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/epilogue/` — определения, рантайм, модели (`FactModel`, `WeavingModel`, `StyleModel`), ошибки, порты.
- `src/application/epilogue/` — use cases пайплайна.
- `src/infrastructure/epilogue/` — store, механики пайплайна, memento, адаптер фактов.
- `content/{epilogueFact,epilogueTemplate,narrativeStyle,epilogueScene,finalChoice,weavingPolicy}/`, `content/mechanics/epilogue.json`.

### 4.2. Файлы

```text
src/domain/epilogue/
  EpilogueFactDefinition.ts
  EpilogueTemplateDefinition.ts
  NarrativeStyleDefinition.ts
  EpilogueSceneDefinition.ts
  FinalChoiceDefinition.ts
  EpilogueInstance.ts
  EpilogueErrors.ts
  FactModel.ts
  WeavingModel.ts
  StyleModel.ts
  IEpilogueFactPort.ts
src/application/epilogue/
  StartEpilogueGeneration.ts
  CollectFacts.ts
  FilterFacts.ts
  SortFacts.ts
  ComposeText.ts
  SelectTemplate.ts
  PresentFinalChoice.ts
  RecordFinalChoice.ts
  CompleteEpilogue.ts
  GetEpilogueState.ts
src/infrastructure/epilogue/
  EpilogueStore.ts
  EpilogueFactRegistry.ts
  EpiloguePipelineResolvers.ts
  EpilogueStateMementoProvider.ts
content/schemas/
  epilogue-fact.json
  epilogue-template.json
  narrative-style.json
  epilogue-scene.json
  final-choice.json
  epilogue-instance.json
content/{epilogueFact,epilogueTemplate,narrativeStyle,epilogueScene,finalChoice}/core.json
content/mechanics/epilogue.json
tools/ci/stages/validate-epilogue-graph.ts
tools/ci/stages/validate-epilogue-lint.ts
test/epilogue/…
scripts/demo-m31.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `IEpilogueStore` | `EpilogueStore` | singleton | `domain-init` |
| `IEpilogueFactPort` | `EpilogueFactRegistry` | singleton | `integration` |
| `IMementoProvider('epilogue')` | `EpilogueStateMementoProvider` | singleton | `save-composition` |
| `epilogue-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. EpilogueFactDefinition

```ts
export type FactTheme = 'war' | 'betrayal' | 'ascension' | 'fall' | 'mystery' | 'sacrifice' | 'triumph' | 'tragedy';
export type FactSignificance = 'world_shaping' | 'personal' | 'factional' | 'minor';
export type FactSource = 'cataclysm' | 'party' | 'narrative' | 'hidden_branch' | 'economy' | 'fleet' | 'captain' | 'world';

export interface EpilogueSubFact {
  readonly id: string;
  readonly theme: FactTheme;
  readonly emotional_tone: string;
  readonly narrative_weight: number;
}

export interface EpilogueFactDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly source_system: FactSource;
  readonly theme: FactTheme;
  readonly emotional_tone: string;
  readonly narrative_weight: number;          // [0,1]
  readonly significance: FactSignificance;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly sub_facts: readonly EpilogueSubFact[];
  readonly tags: readonly string[];
  readonly related_facts: readonly string[];
}
```

Инварианты: `EPI-INV-01` — `narrative_weight ∈ [0,1]`; `EPI-INV-02` — `theme`/`significance`/`source_system` из нормативных наборов; `EPI-INV-03` — `related_facts` разрешаются; `EPI-INV-04` — факт не хранит рантайм.

### 5.2. EpilogueTemplateDefinition

```ts
export interface EpilogueTemplateDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly dominant_themes: readonly FactTheme[];   // ≥1
  readonly narrative_style_policy_id: string;
  readonly weaving_policy_id: string;
  readonly scene_policy_ids: readonly string[];
  readonly final_choice_policy_id: string;
  readonly meta_threat_policy_id: string;
}
```

Инварианты: `EPI-INV-05` — `dominant_themes.length ≥ 1`; `EPI-INV-06` — style/weaving policy обязательны и разрешаются.

### 5.3. NarrativeStyleDefinition

```ts
export interface NarrativeStyleDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly tone_tags: readonly string[];      // ≥1
  readonly text_template_policy_id: string;
  readonly audio_theme_policy_id: string;
}
```

Инварианты: `EPI-INV-07` — `tone_tags.length ≥ 1`; `EPI-INV-08` — стиль не хранит рантайм.

### 5.4. EpilogueSceneDefinition

```ts
export interface EpilogueSceneDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly scene_type: 'animated' | 'static' | 'procedural';
  readonly duration_policy_id: string;
  readonly visual_elements_policy_id: string;
  readonly text_overlay_policy_id: string;
  readonly audio_policy_id: string;
}
```

### 5.5. FinalChoiceDefinition

```ts
export interface FinalChoiceOutcome {
  readonly outcome_id: string;
  readonly meta_threat_modifiers: Readonly<Record<string, unknown>>;
  readonly epilogue_facts: readonly string[];
}

export interface FinalChoiceDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly choice_type: 'meta_influence' | 'narrative_only';
  readonly outcomes: readonly FinalChoiceOutcome[];   // ≥1
}
```

Инварианты: `EPI-INV-09` — `outcomes.length ≥ 1`; `EPI-INV-10` — при `meta_influence` модификаторы валидируются политикой 037.

### 5.6. Пайплайн

```ts
export interface EpilogueInstance {
  readonly epilogue_id: string;
  readonly captain_id: string;
  readonly generation_started_tick: number;
  readonly generation_completed_tick?: number;
  readonly collected_facts: readonly string[];
  readonly narrative_threads: readonly { readonly thread_id: string; readonly fact_ids: readonly string[]; readonly dominant_theme: FactTheme; readonly narrative_weight: number }[];
  readonly selected_template_id?: string;
  readonly narrative_style_id?: string;
  readonly generated_scenes: readonly string[];
  readonly final_choice_id?: string;
  readonly final_choice_outcome_id?: string;
  readonly journal: readonly EpilogueJournalEntry[];
}
```

Инварианты: `EPI-INV-11` — стадии строго последовательны (нельзя `facts_sorted` без `facts_filtered`); `EPI-INV-12` — `generation_completed_tick ≥ generation_started_tick`; `EPI-INV-13` — журнал монотонен по `(tick, seq)`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `epilogue-fact-collection-tracker` | tracker | epilogue | 300 | `epilogue.fact_published`, `narrative.ending_reached` | `epilogue.facts_collected` | `{ collected_fact_ids }` |
| `epilogue-fact-filter-resolver` | resolver | epilogue | 290 | `epilogue.facts_collected` | `epilogue.facts_filtered` | `null` |
| `epilogue-fact-sort-resolver` | resolver | epilogue | 280 | `epilogue.facts_filtered` | `epilogue.facts_sorted` | `null` |
| `epilogue-fact-weaving-resolver` | resolver | epilogue | 270 | `epilogue.facts_sorted` | `epilogue.narrative_threads_formed` | `null` |
| `epilogue-text-composer-resolver` | resolver | epilogue | 260 | `epilogue.narrative_threads_formed` | `epilogue.text_composed` | `null` |
| `epilogue-scene-selector-resolver` | resolver | epilogue | 250 | `epilogue.text_composed` | `epilogue.scenes_generated` | `null` |

### 6.2. Гибридная категоризация

Первично — по `source_system`, вторично — по нарративной роли (`theme`), третично — по `significance`. Все три группировки декларативны; сортировка внутри нити — по `narrative_weight` с детерминированным tie-break.

### 6.3. JSON Schema

- `epilogue-fact.json` — `narrative_weight` [0,1]; `theme` enum 8; `significance` enum 4; `source_system` enum 8; `sub_facts` items required [id, theme].
- `epilogue-template.json` — `dominant_themes` minItems 1; policies required.
- `narrative-style.json` — `tone_tags` minItems 1.
- `epilogue-scene.json` — `scene_type` enum 3.
- `final-choice.json` — `choice_type` enum 2; `outcomes` minItems 1.
- `epilogue-instance.json` — `additionalProperties: false`; `journal` items required [event_id, tick].

### 6.4. События

Ядро (11): `epilogue.generation_started`, `epilogue.fact_published`, `epilogue.facts_collected`, `epilogue.facts_filtered`, `epilogue.facts_sorted`, `epilogue.narrative_threads_formed`, `epilogue.text_composed`, `epilogue.scenes_generated`, `epilogue.final_choice_presented`, `epilogue.final_choice_made`, `epilogue.generation_completed`.

Фракционные: `epilogue.industrial-steam.*`, `epilogue.ancient-arcane.*`, `epilogue.necromantic-corpse.*`, `epilogue.living-artifact.*`.

### 6.5. Контент первой волны

12+ типов фактов, 10+ шаблонов, 5 стилей (`mystical`, `technical`, `grim`, `epic`, `elegiac`), 20+ сцен, 4 финальных выбора.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Пайплайн**

```
[idle] --ending_reached--> [collecting] + emit generation_started
[collecting] --facts_collected--> [filtering] + emit facts_collected
[filtering] --> [sorting] + emit facts_filtered
[sorting] --> [weaving] + emit facts_sorted
[weaving] --> [composing] + emit narrative_threads_formed
[composing] --> [rendering] + emit text_composed, scenes_generated
[rendering] --final_choice--> [choice_presented] + emit final_choice_presented
[choice_presented] --choice--> [completed] + emit final_choice_made, generation_completed
```

**(b) Пропуск стадии запрещён**: любая попытка вызывает `DOMAIN_EPI_PIPELINE_ORDER`.

### 7.2. Sequence: генерация

```
narrative.ending_reached{ending_id}
  → StartEpilogueGeneration → generation_started
  → CollectFacts → IEpilogueFactPort.snapshot() → facts_collected
  → FilterFacts(significance, relevance) → facts_filtered
  → SortFacts(source → theme → significance) → facts_sorted
  → ComposeText(weaving_policy, template) → narrative_threads_formed → text_composed
  → Renderer(scene_policy) → scenes_generated
  → PresentFinalChoice → final_choice_presented
  → RecordFinalChoice → final_choice_made
  → CompleteEpilogue → generation_completed
```

### 7.3. Tick-контракт

`scope:epilogue` выполняется после `scope:narrative` и вне обычного tick-loop забега (пост-финальная фаза). После `generation_completed` фаза терминальна для забега.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.epilogue.fact_collection`, `.fact_filtering`, `.thread_weaving`, `.style_selection`, `.scene_selection`, `.fact_interpretation`, `.meta_threat_generation` (используется 037). Смешение запрещено; повторный `CollectFacts` в том же такте идемпотентен.

### 7.5. Плетение

```
weave(facts, policy):
  threads = []
  for fact in sorted(facts, by weight desc, id asc):
      thread = findThreadMatching(fact.theme, fact.tags, threads, policy)
      if thread: thread.facts += fact
      else: threads += newThread(fact)
  return threads sorted by weight desc, id asc
```

Сложность O(n·t), n ≤ 100 фактов, t ≤ 12 нитей.

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 036; impl: 025/027/028/032/033/034/035
export interface IEpilogueFactPort {
  publish(factId: string, payload?: Readonly<Record<string, unknown>>): Result<void, AppError>;
  snapshot(): Result<readonly string[], AppError>;
}

// owner: 036; impl: 037
export interface IMetaThreatPort {
  generate(policyId: string, modifiers: Readonly<Record<string, unknown>>): Result<string, AppError>;
}
```

### 8.2. Адаптеры

`EpilogueFactRegistry` (дедупликация по `factId`, сохранение `publish_tick`), `EpilogueStateMementoProvider`, `NullMetaThreatPort` (замена в 037).

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_EPI_FACT_UNKNOWN` | факт не зарегистрирован | да |
| `DOMAIN_EPI_PIPELINE_ORDER` | нарушен порядок стадий | нет |
| `DOMAIN_EPI_TEMPLATE_UNKNOWN` | шаблон не найден | да |
| `DOMAIN_EPI_NO_FACTS` | нет фактов для эпилога | да |
| `DOMAIN_EPI_CHOICE_INVALID` | исход выбора не декларирован | да |
| `INFRA_EPI_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`narrative.ending_reached`, `narrative.faction_arc_completed`, `cataclysm.ended`, `party.companion_died`, `party.companion_betrayed`, `hidden_branch.final_state_reached`, `economy.scar_applied`, `world.ruler_changed`, `world.city_fallen`, `captain.retired`.

### 9.2. Эмитируемые

Темы §6.4. Consumers: 037 (мета-угроза), 040/041 (рендер), 039 (срез).

### 9.3. Мосты

Каждый мост — `fact_published` в `IEpilogueFactPort`: `cataclysm.ended`, `party.companion_died`, `narrative.faction_arc_completed`, `hidden_branch.final_state_reached`, `economy.scar_applied`, `world.city_fallen`. Ни один источник не имеет приоритета (§6.2).

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `StartEpilogueGeneration` | `{captain_id, ending_id}` | `{epilogue_id}` | Fact | `generation_started` |
| `CollectFacts` | `{epilogue_id}` | `{facts}` | Fact | `facts_collected` |
| `FilterFacts` | `{epilogue_id}` | `{facts}` | — | `facts_filtered` |
| `SortFacts` | `{epilogue_id}` | `{threads}` | — | `facts_sorted` |
| `ComposeText` | `{epilogue_id, template_id}` | `{text_ref}` | MetaThreat | `narrative_threads_formed`, `text_composed` |
| `PresentFinalChoice` | `{epilogue_id}` | `{choice_id}` | — | `final_choice_presented` |
| `RecordFinalChoice` | `{epilogue_id, outcome_id}` | `{facts}` | MetaThreat | `final_choice_made` |
| `CompleteEpilogue` | `{epilogue_id}` | `{ok}` | — | `generation_completed` |
| `GetEpilogueState` | `{epilogue_id}` | `EpilogueInstance` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_EPI_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | нет фактов | `DOMAIN_EPI_NO_FACTS` | эпилог минимального шаблона + `Err` в лог |
| application | пропуск стадии | `DOMAIN_EPI_PIPELINE_ORDER` | `Err`, стадия не выполняется |
| application | неизвестный исход выбора | `DOMAIN_EPI_CHOICE_INVALID` | `Err` |
| save | снимок невалиден | `INFRA_EPI_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-036-R01 — Границы и контракт фактов
Требование: эпилог владеет только генерацией; факты приходят через `IEpilogueFactPort`.
Invariant: EPI-INV-01…04.

- AC01: Given `publish('epilogue-fact-x')` из 032, When вызов, Then факт в реестре и `epilogue.fact_published`.
- AC02: Given повторный `publish` того же факта, When вызов, Then дубликата нет (идемпотентность).

### DEV-SPEC-036-R02 — Пайплайн
Требование: 5 стадий строго последовательны; каждая — механика с `role_tags ∋ 'epilogue'`.
Invariant: EPI-INV-11.

- AC03: Given `ending_reached`, When генерация, Then события идут в порядке §7.1.
- AC04: Given `ComposeText` без `SortFacts`, When вызов, Then `Err(DOMAIN_EPI_PIPELINE_ORDER)`.

### DEV-SPEC-036-R03 — Модель факта
Требование: 8 тем, 4 значимости, 8 источников, подфакты и связи.
Invariant: EPI-INV-01…04.

- AC05: Given факт с `theme='glory'`, When `--stage=schemas`, Then ошибка.
- AC06: Given `related_facts` на несуществующий факт, When `--stage=graph`, Then ошибка.

### DEV-SPEC-036-R04 — Категоризация
Требование: источник → роль → значимость; сортировка детерминирована.

- AC07: Given 3 факта разных источников, When `SortFacts`, Then порядок соответствует §6.2 и стабилен между прогонами.

### DEV-SPEC-036-R05 — Плетение
Требование: нити объединяют связанные факты; порядок по весу.

- AC08: Given связанные факты `cataclysm` и `party`, When `ComposeText`, Then одна нить с `dominant_theme` и весом.
- AC09: Given равные веса, When плетение, Then tie-break по `id` (детерминизм).

### DEV-SPEC-036-R06 — Стиль
Требование: стиль выбирается по финалу и доминирующим фактам; 5 стилей.
Invariant: EPI-INV-05…08.

- AC10: Given финал `arcane-mastery`, When выбор, Then `narrative-style-mystical`.
- AC11: Given шаблон без `narrative_style_policy_id`, When загрузка, Then ошибка схемы.

### DEV-SPEC-036-R07 — Сцены
Требование: ключевые моменты получают сцены; `scene_type` из 3 значений.

- AC12: Given `text_composed`, When `scenes_generated`, Then ≥1 сцена и `scene_policy_ids` использованы.

### DEV-SPEC-036-R08 — Финальный выбор
Требование: один крупный выбор; исходы декларированы.
Invariant: EPI-INV-09/10.

- AC13: Given `PresentFinalChoice`, When вызов, Then `final_choice_presented` и выбор в UI-контракте.
- AC14: Given неизвестный `outcome_id`, When `RecordFinalChoice`, Then `Err(DOMAIN_EPI_CHOICE_INVALID)`.

### DEV-SPEC-036-R09 — События
Требование: 11 ядерных тем; фракционные без коллизий.

- AC15: Given перечень §6.4, When `--stage=events`, Then все темы присутствуют.

### DEV-SPEC-036-R10 — RNG и сохранения
Требование: 7 потоков; снимок валидируется.

- AC16: Given save→load, When генерация, Then идентичный эпилог (побайтово равный текст-реф).
- AC17: Given fixture-прогон, When `--stage=rng-streams`, Then используются только разрешённые потоки.

### DEV-SPEC-036-R11 — CI
Требование: schema + graph + lint.

- AC18: Given negative-fixtures (вес вне [0,1], нет темы, шаблон без стиля, выбор без исходов), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-036-R12 — Контент и срез
Требование: 12+ фактов, 10+ шаблонов, 5 стилей, 20+ сцен, 4 выбора; SPEC-EPI-080 как `demo:m31`.

- AC19: Given `bun run demo:m31`, When завершение, Then `Ok`: факты → нити → текст → сцены → выбор → save/load → идентичный результат.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `FactModel`; T03 `WeavingModel`; T04 `StyleModel`.
12.2 Integration: T05 пайплайн + recording bus; T06 мосты 025/027/033/034/035.
12.3 Contract: T07 определения против схем; T08 события.
12.4 Determinism: T09 save/load + RNG-изоляция + повторная генерация.
12.5 E2E: T10 `demo:m31`.
12.6 CI: T11 graph; T12 lint.

---

## 13. Производительность

### 13.1. Бюджет
Сбор — O(facts); фильтрация/сортировка — O(n log n); плетение — O(n·t). n ≤ 100.

### 13.2. LOD
Сцены — по бюджету рендера; текст и выбор — никогда.

### 13.3. Профилирование
Счётчики `epilogue.*`; сценарий: 100 фактов × 12 нитей × 20 сцен.

---

## 14. Миграции

`epilogue-instance.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | `epilogue.fact_published` — добавляется в ядро (в DESIGN только в мостах) | R01/R09 | arch | до M31 |
| OQ-02 | Кто эмитит `meta_threat_generation_enabled` — 036 или 037 | R08 | arch | до M31 |
| OQ-03 | Формат текст-рефа (id шаблона или готовый текст) | R10 | arch | до Wave 7 review |

---

## 16. Что остаётся вне scope

- Мета-угроза и следующий забег → `DEV-SPEC-037`.
- Нарратив забега → `DEV-SPEC-034/035`.
- Шейдеры, анимации, аудио → `DEV-SPEC-010/011/014/015/040/041`.
- Финальные тексты эпилога и баланс.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M31) |
|---|---|---|---|---|
| SPEC-EPI-001/003 | R01 | AC01,AC02 | T02,T06 | M31-001 |
| SPEC-EPI-002/011/027 | R02 | AC03,AC04 | T05 | M31-002 |
| SPEC-EPI-003/021 | R03 | AC05,AC06 | T02,T11 | M31-003 |
| SPEC-EPI-004 | R04 | AC07 | T02 | M31-004 |
| SPEC-EPI-005 | R05 | AC08,AC09 | T03 | M31-005 |
| SPEC-EPI-006/023 | R06 | AC10,AC11 | T04 | M31-006 |
| SPEC-EPI-007/024 | R07 | AC12 | T05 | M31-007 |
| SPEC-EPI-008/025 | R08 | AC13,AC14 | T05 | M31-008 |
| SPEC-EPI-030/031 | R09 | AC15 | T08 | M31-009 |
| SPEC-EPI-040/041/050/051 | R10 | AC16,AC17 | T09 | M31-010 |
| SPEC-EPI-015/060…063 | R11 | AC18 | T11,T12 | M31-011 |
| SPEC-EPI-016/070…073/080 | R12 | AC19 | T10 | M31-012 |

Итог декомпозиции: 12 тикетов `TKT-M31-001…012`, демо `demo:m31`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.3); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R12 → AC01…AC19; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
