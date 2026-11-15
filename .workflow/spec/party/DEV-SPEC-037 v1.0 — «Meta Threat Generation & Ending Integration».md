# DEV-SPEC-037 v1.0 — «Meta Threat Generation & Ending Integration»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 7 (Epilogue & Meta), второй блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-036`, `DEV-SPEC-033`
**Блокирует:** `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Генератор эпилога»` (SPEC-EPI-009, 010, 025, 026, 028, 031/032, 041, 050/051, 063, 074, 080), `DESIGN v1.0 — «Скрытые ветки трансформации»` (SPEC-TRANS-008)
**Связанные DEV-SPEC:** `DEV-SPEC-012` (мета-прогресс, если реализован), `DEV-SPEC-025` (катаклизмы), `DEV-SPEC-032` (капитан), `DEV-SPEC-033` (мета-слой трансформации), `DEV-SPEC-036` (эпилог и `IEpilogueFactPort`), `DEV-SPEC-039` (срез)
**Порождает веху:** `TICKETS-M32`

---

## 0. Как читать эту спеку

Спека отвечает за **переход между забегами**: процедурная мета-угроза, влияние финального выбора, перенос результатов эпилога в следующий забег. Мета-угроза **не имеет архетипа** — она собирается целиком из фактов забега (SPEC-EPI-009).

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`MetaThreatDefinition`** — политика процедурной генерации угрозы (доктрина, модификаторы, крючки), 4 базовых семейства с вариациями;
- **`MetaThreatInstance`** — сгенерированная угроза: имя, доктрина, модификаторы, крючки, провенанс фактов;
- **процедурная генерация**: имя, доктрина, модификаторы собираются из доминирующих тем/источников фактов;
- **финальный выбор** → модификаторы угрозы (`intensity_multiplier`, `additional_tags`);
- **перенос между забегами**: `MetaRunState` (угроза, включённые модификаторы, флаги) и его публикация в следующий забег;
- **интеграция финалов**: `narrative.ending_reached` + `hidden_branch.meta_epilogue_unlocked` → `epilogue.meta_threat_generated`;
- **события** `epilogue.*` (часть ядра 036) + фракционные namespace'ы;
- **RNG**: поток `rng.epilogue.meta_threat_generation`, `rng.meta.threat_name`;
- **CI**: schema/graph/gameplay lint (детерминизм, отсутствие архетипа, покрытие вариаций);
- **демо** `demo:m32`.

### 1.2. Что спецификация НЕ делает

- Не генерирует сам эпилог → `DEV-SPEC-036`.
- Не реализует UI выбора и рендер → `DEV-SPEC-036/040`.
- Не реализует трансформацию капитана → `DEV-SPEC-033`.
- Не реализует катаклизмы → `DEV-SPEC-025`.
- Не содержит финальный баланс сложности следующего забега.
- Не реализует полноценный NG+ (состав отряда, корабль) — только контракт переноса.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-EPI-009` (процедурная угроза) | §5.1, §7.5, R01 | нет |
| `SPEC-EPI-010` (вариативность через RNG) | §7.4, R05 | нет |
| `SPEC-EPI-025` (финальный выбор) | §5.2, §7.3, R03 | нет |
| `SPEC-EPI-026` (контракт угрозы) | §5.1, §5.2 | нет |
| `SPEC-EPI-028` (снимок) | §5.3, R06 | расширено `meta_run` |
| `SPEC-EPI-032` (мосты) | §9.3, R07 | нет |
| `SPEC-EPI-041` (RNG) | §7.4 | добавлен `rng.meta.threat_name` (OQ-01) |
| `SPEC-EPI-050/051` (снимки) | §5.3, §14 | нет |
| `SPEC-EPI-063` (lint) | §12.6, R08 | нет |
| `SPEC-EPI-074` (4 угрозы) | §6.5, R09 | нет |
| `SPEC-EPI-080` (срез) | §11 R10 | нет |
| `SPEC-TRANS-008` (мета-слой) | §7.3, R02 | нет |

**Расхождения:** DESIGN говорит «угроза влияет на следующий забег», но не задаёт контракт переноса; `MetaRunState` вводится здесь (OQ-02). `hidden_branch.meta_epilogue_unlocked → epilogue.meta_threat_generation_enabled` в DESIGN упомянут в мостах, но событие не входит в ядро — нормативно добавляется (OQ-03).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-036` | `EpilogueInstance`, `FinalChoiceDefinition`, `IMetaThreatPort`, `IEpilogueFactPort` |
| `DEV-SPEC-033` | `hidden_branch.meta_epilogue_unlocked` |

### 2.2. Мягкие

`DEV-SPEC-025` (катаклизмы), `DEV-SPEC-032` (`captain.retired`), `DEV-SPEC-012` (мета-прогресс), `DEV-SPEC-039` (срез).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/meta/**`, `src/application/meta/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Meta Threat | Процедурно собранная угроза следующего забега |
| Threat Family | Базовое семейство политик (arcane, industrial, necromantic, metaphysical) |
| Threat Modifier | Модификатор сложности/правил следующего забега |
| Meta Run State | Перенос состояния между забегами |
| Provenance | Ссылка модификатора на факт(ы), из которых он выведен |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/meta/` — определения, рантайм, модели (`ThreatModel`, `ModifierModel`), ошибки, порты.
- `src/application/meta/` — use cases.
- `src/infrastructure/meta/` — store, memento, run-bridge.
- `content/{metaThreat,metaThreatModifier,metaThreatHook,metaPolicy}/`, `content/mechanics/meta.json`.

### 4.2. Файлы

```text
src/domain/meta/
  MetaThreatDefinition.ts
  MetaThreatInstance.ts
  MetaRunState.ts
  MetaErrors.ts
  ThreatModel.ts
  ModifierModel.ts
  IMetaRunPort.ts
src/application/meta/
  GenerateMetaThreat.ts
  ApplyFinalChoice.ts
  EnableMetaThreat.ts
  PublishMetaRun.ts
  GetMetaThreat.ts
src/infrastructure/meta/
  MetaStore.ts
  MetaThreatAdapter.ts        // реализация IMetaThreatPort (036)
  MetaRunBridge.ts
  MetaStateMementoProvider.ts
content/schemas/
  meta-threat.json
  meta-threat-instance.json
  meta-run-state.json
content/metaThreat/core.json
content/metaThreatModifier/core.json
content/metaThreatHook/core.json
content/mechanics/meta.json
tools/ci/stages/validate-meta-graph.ts
tools/ci/stages/validate-meta-lint.ts
test/meta/…
scripts/demo-m32.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `IMetaStore` | `MetaStore` | singleton | `domain-init` |
| `IMetaThreatPort` (036) | `MetaThreatAdapter` | singleton | `integration` |
| `IMetaRunPort` | `MetaRunBridge` | singleton | `integration` |
| `IMementoProvider('meta')` | `MetaStateMementoProvider` | singleton | `save-composition` |
| `meta-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. MetaThreatDefinition

```ts
export interface MetaThreatDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly generation_policy_id: string;
  readonly doctrine_tags: readonly string[];      // ≥1
  readonly modifiers_policy_id: string;
  readonly narrative_hooks_policy_id: string;
  readonly family: 'arcane' | 'industrial' | 'necromantic' | 'metaphysical';
  readonly name_fragment_policy_id: string;
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `META-INV-01` — `generation_policy_id`, `modifiers_policy_id`, `narrative_hooks_policy_id` обязательны; `META-INV-02` — `doctrine_tags.length ≥ 1`; `META-INV-03` — определение не содержит архетипа имени и не хранит рантайм.

### 5.2. MetaThreatInstance и MetaRunState

```ts
export interface ThreatModifierInstance {
  readonly modifier_id: string;
  readonly value: number | string | readonly string[];
  readonly provenance_fact_ids: readonly string[];
}

export interface MetaThreatInstance {
  readonly threat_id: string;
  readonly family: MetaThreatDefinition['family'];
  readonly generated_name_key: string;
  readonly doctrine: readonly string[];
  readonly modifiers: readonly ThreatModifierInstance[];
  readonly narrative_hook_ids: readonly string[];
  readonly source_epilogue_id: string;
  readonly generated_tick: number;
}

export interface MetaRunState {
  readonly run_index: number;
  readonly threat: MetaThreatInstance | null;
  readonly active_modifier_ids: readonly string[];
  readonly carried_flags: readonly string[];
  readonly final_choice_outcome_id?: string;
}
```

Инварианты: `META-INV-04` — `modifiers` без дублей `modifier_id`; `META-INV-05` — каждый модификатор имеет `provenance_fact_ids` (непустой) — угроза выводима из фактов; `META-INV-06` — `generated_name_key` собирается из фрагментов, не из фиксированного списка.

### 5.3. Снимок

`MetaStateSnapshot` = `{ run_index, threat, active_modifier_ids, carried_flags }`, `$id: meta-state.json`, провайдер `domainId: 'meta'`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `meta-threat-generation-resolver` | resolver | meta | 300 | `epilogue.final_choice_made`, `hidden_branch.meta_epilogue_unlocked` | `epilogue.meta_threat_generated` | `null` |
| `meta-modifier-provenance-tracker` | tracker | meta | 290 | `epilogue.facts_collected`, `epilogue.meta_threat_generated` | `epilogue.meta_threat_modifiers_bound` | `{ modifier_ids, fact_ids }` |
| `meta-run-bridge-resolver` | resolver | meta | 280 | `epilogue.generation_completed` | `meta.run_armed` | `null` |

### 6.2. JSON Schema

- `meta-threat.json` — `family` enum 4; `generation_policy_id` required; `doctrine_tags` minItems 1.
- `meta-threat-instance.json` — `modifiers` items required [modifier_id, provenance_fact_ids]; `provenance_fact_ids` minItems 1.
- `meta-run-state.json` — `run_index` integer ≥0; `active_modifier_ids` uniqueItems.
- `metaPolicy` — числа (интенсивность, веса) только в контенте.

### 6.3. События

`epilogue.meta_threat_generation_enabled`, `epilogue.meta_threat_generated`, `epilogue.meta_threat_modifiers_bound`, `meta.run_armed`, `meta.run_started`.

Фракционные: `epilogue.industrial-steam.*`, `epilogue.ancient-arcane.*`, `epilogue.necromantic-corpse.*`, `epilogue.living-artifact.*`.

### 6.4. Контент первой волны

4 семейства (`meta-threat-arcane`, `meta-threat-industrial`, `meta-threat-necromantic`, `meta-threat-metaphysical`), по 3 вариации на семейство (зависимость от финального выбора), 12 модификаторов, 8 крючков.

### 6.5. Генерация имени

`generated_name_key` собирается из 3 слотов (`prefix`, `core`, `suffix`) по `name_fragment_policy_id`; слоты выбираются из фрагментов, производных от доминирующих `theme` и `family`. Никакого фиксированного списка имён.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Мета-угроза**

```
[disabled] --meta_epilogue_unlocked--> [enabled] + emit meta_threat_generation_enabled
[enabled] --final_choice_made--> [generating]
[generating] --> [generated] + emit meta_threat_generated
[generated] --bind_modifiers--> [bound] + emit meta_threat_modifiers_bound
```

**(b) Перенос забега**

```
[completed_run] --generation_completed--> [armed] + emit meta.run_armed
[armed] --new_run--> [applied] + emit meta.run_started
[applied] --> [terminal]
```

### 7.2. Sequence: генерация после эпилога

```
epilogue.final_choice_made{outcome_id}
  → ApplyFinalChoice{outcome_id} → модификаторы выбора (intensity_multiplier, additional_tags)
  → GenerateMetaThreat{epilogue_id}
      → facts = IEpilogueFactPort.snapshot()
      → вывести family/doctrine/modifiers из доминирующих theme+source
      → имя из фрагментов (rng.meta.threat_name)
      → emit epilogue.meta_threat_generated
      → emit epilogue.meta_threat_modifiers_bound
  → PublishMetaRun{run_index+1}
      → emit meta.run_armed
```

### 7.3. Влияние финального выбора

`FinalChoiceOutcome.meta_threat_modifiers` применяются поверх сгенерированных: `intensity_multiplier` умножает политику интенсивности, `additional_tags` добавляются к `doctrine`. При `choice_type='narrative_only'` модификаторы не применяются, но факт фиксируется.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.epilogue.meta_threat_generation` (выбор модификаторов/крючков), `rng.meta.threat_name` (слоты имени). Смешение запрещено. Повторная генерация для того же `epilogue_id` возвращает существующую угрозу (`META-INV-07`).

### 7.5. Алгоритм вывода

```
generate(facts, policy, family):
  dominant = topK(facts, policy.k, by narrative_weight desc, id asc)
  doctrine = policy.doctrineFor(family, dominant.themes)
  modifiers = policy.modifiersFor(family, dominant.tags)
  modifiers = modifiers.map(m => ({...m, provenance_fact_ids: dominant.filter(m.requires).ids}))
  name = policy.composeName(family, dominant.themes, rng.meta.threat_name)
  hooks = policy.hooksFor(modifiers)
  return {family, name, doctrine, modifiers, hooks}
```

Сложность O(n log n).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 037; impl: 036
export interface IEpilogueFactsReadPort {
  snapshot(): Result<readonly string[], AppError>;
  dominantThemes(): Result<readonly string[], AppError>;
}

// owner: 037; impl: 012 (или Null)
export interface IMetaRunPort {
  readRunState(): Result<MetaRunState, AppError>;
  writeRunState(state: MetaRunState): Result<void, AppError>;
}
```

### 8.2. Адаптеры

`MetaThreatAdapter` (реализация `IMetaThreatPort` из 036), `MetaRunBridge` (файловый/профильный провайдер, `NullMetaRunPort` при отсутствии 012), `MetaStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_META_THREAT_UNKNOWN` | политика не найдена | да |
| `DOMAIN_META_GENERATION_DISABLED` | мета-слой не разблокирован | да |
| `DOMAIN_META_PROVENANCE_MISSING` | модификатор без фактов-источников | нет |
| `DOMAIN_META_MODIFIER_DUPLICATE` | дубль модификатора | нет |
| `INFRA_META_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`epilogue.final_choice_made`, `epilogue.generation_completed`, `epilogue.facts_collected`, `hidden_branch.meta_epilogue_unlocked`, `narrative.ending_reached`.

### 9.2. Эмитируемые

Темы §6.3. Consumers: 036 (модификаторы в шаблоне), 039 (срез), 012 (мета-прогресс).

### 9.3. Мосты

`hidden_branch.meta_epilogue_unlocked → epilogue.meta_threat_generation_enabled`; `epilogue.final_choice_made → ApplyFinalChoice`; `epilogue.generation_completed → meta.run_armed`; `meta.run_started → DEV-SPEC-012/039` (стартовые модификаторы забега).

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `EnableMetaThreat` | `{epilogue_id}` | `{enabled}` | — | `meta_threat_generation_enabled` |
| `ApplyFinalChoice` | `{epilogue_id, outcome_id}` | `{modifiers}` | — | — |
| `GenerateMetaThreat` | `{epilogue_id}` | `{threat_id}` | Facts | `meta_threat_generated`, `meta_threat_modifiers_bound` |
| `PublishMetaRun` | `{threat_id, run_index}` | `{ok}` | MetaRun | `meta.run_armed` |
| `GetMetaThreat` | `{epilogue_id}` | `MetaThreatInstance` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_META_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | модификатор без провенанса | `DOMAIN_META_PROVENANCE_MISSING` | падение загрузки контента |
| application | мета-слой не разблокирован | `DOMAIN_META_GENERATION_DISABLED` | `Err`, эпилог завершается без угрозы |
| application | дубль модификатора | `DOMAIN_META_MODIFIER_DUPLICATE` | `Err`, набор не меняется |
| save | снимок невалиден | `INFRA_META_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-037-R01 — Процедурность
Требование: угроза без архетипа, полностью выводима из фактов.
Invariant: META-INV-01…06.

- AC01: Given факты арканного финала, When `GenerateMetaThreat`, Then `family='arcane'`, доктрина и модификаторы выведены.
- AC02: Given модификатор без `provenance_fact_ids`, When `ci:validate`, Then `DOMAIN_META_PROVENANCE_MISSING`.

### DEV-SPEC-037-R02 — Разблокировка мета-слоя
Требование: угроза генерируется только при `meta_epilogue_unlocked` или политике явного разрешения.

- AC03: Given `hidden_branch.meta_epilogue_unlocked`, When `EnableMetaThreat`, Then `epilogue.meta_threat_generation_enabled`.
- AC04: Given мета-слой не разблокирован, When `GenerateMetaThreat`, Then `Err(DOMAIN_META_GENERATION_DISABLED)`.

### DEV-SPEC-037-R03 — Финальный выбор
Требование: исход выбора меняет модификаторы; `narrative_only` не меняет механику.
Invariant: —

- AC05: Given `accept-legacy` с `intensity_multiplier=1.2`, When `ApplyFinalChoice`, Then интенсивность умножена и тег `legacy-accepted` добавлен.
- AC06: Given `choice_type='narrative_only'`, When применение, Then модификаторы не изменяются, факт зафиксирован.

### DEV-SPEC-037-R04 — Имя
Требование: имя собирается из фрагментов по слотам.
Invariant: META-INV-06.

- AC07: Given два разных прогона с разными seed, When генерация, Then `generated_name_key` различаются, но слоты валидны.

### DEV-SPEC-037-R05 — Детерминизм
Требование: 2 потока; повторная генерация возвращает ту же угрозу.
Invariant: META-INV-07.

- AC08: Given повторный `GenerateMetaThreat` для того же `epilogue_id`, When вызов, Then идентичный `threat_id` и модификаторы.
- AC09: Given save→load, When новый забег, Then `MetaRunState` идентичен.

### DEV-SPEC-037-R06 — Перенос забега
Требование: мета-угроза и модификаторы попадают в следующий забег через `IMetaRunPort`.

- AC10: Given `PublishMetaRun`, When старт нового забега, Then `meta.run_started` и модификаторы активны.

### DEV-SPEC-037-R07 — Мосты и события
Требование: 5 тем §6.3; мосты из 033 и 036 работают.

- AC11: Given перечень §6.3, When `--stage=events`, Then все темы присутствуют.

### DEV-SPEC-037-R08 — CI
Требование: schema + graph + lint (включая «нет архетипа»).

- AC12: Given negative-fixtures (угроза без family, модификатор без фактов, дубль, имя из фиксированного списка), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-037-R09 — Контент
Требование: 4 семейства × 3 вариации, 12 модификаторов, 8 крючков.

- AC13: Given `content/metaThreat/core.json`, When валидация, Then ≥4 семейств и ≥2 вариации на семейство.

### DEV-SPEC-037-R10 — Срез
Требование: SPEC-EPI-080 (часть мета-слоя) как `demo:m32`.

- AC14: Given `bun run demo:m32`, When завершение, Then `Ok`: эпилог → выбор → угроза → перенос → save/load → идентичное состояние.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `ThreatModel`; T03 `ModifierModel` (провенанс); T04 генерация имени.
12.2 Integration: T05 `IMetaThreatPort` из 036; T06 мост 033/036.
12.3 Contract: T07 определения против схем; T08 события.
12.4 Determinism: T09 повторная генерация + save/load.
12.5 E2E: T10 `demo:m32`.
12.6 CI: T11 graph; T12 lint.

---

## 13. Производительность

### 13.1. Бюджет
Генерация — O(n log n) по фактам (n ≤ 100); перенос — O(modifiers). Пост-финальная фаза.

### 13.2. LOD
Не применимо: генерация одноразовая на забег.

### 13.3. Профилирование
Счётчики `meta.*`; сценарий: 1000 генераций × 4 семейства.

---

## 14. Миграции

`meta-state.json` v1; при изменении схемы модификаторов — major bump с миграцией угроз (`META-INV-08`: неизвестный модификатор отбрасывается с warning, забег не ломается).

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Поток `rng.meta.threat_name` вне списка SPEC-EPI-041 | R04/R05 | arch | до M32 |
| OQ-02 | Где живёт `MetaRunState` (профиль, 012 или файл) | R06 | arch | до M32 |
| OQ-03 | Добавление `epilogue.meta_threat_generation_enabled` в ядро | R02 | arch | до M32 |
| OQ-04 | Может ли игрок отказаться от угрозы (opt-out) | R02 | design | до Wave 7 review |

---

## 16. Что остаётся вне scope

- Генерация эпилога → `DEV-SPEC-036`.
- UI и рендер → `DEV-SPEC-036/040`.
- Трансформация → `DEV-SPEC-033`.
- Полноценный NG+ (состав, корабль, экономика) → `DEV-SPEC-012/039`.
- Баланс сложности следующего забега.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M32) |
|---|---|---|---|---|
| SPEC-EPI-009/026 | R01 | AC01,AC02 | T02,T03,T11 | M32-001 |
| SPEC-TRANS-008 | R02 | AC03,AC04 | T05,T06 | M32-002 |
| SPEC-EPI-025 | R03 | AC05,AC06 | T06 | M32-003 |
| SPEC-EPI-074 | R04 | AC07 | T04 | M32-004 |
| SPEC-EPI-010/041 | R05 | AC08,AC09 | T09 | M32-005 |
| SPEC-EPI-028/032/050/051 | R06 | AC10 | T05,T09 | M32-006 |
| SPEC-EPI-031/032 | R07 | AC11 | T08 | M32-006 |
| SPEC-EPI-063 | R08 | AC12 | T11,T12 | M32-007 |
| SPEC-EPI-074/016 | R09 | AC13 | T01 | M32-004 |
| SPEC-EPI-080 | R10 | AC14 | T10 | M32-008 |

Итог декомпозиции: 8 тикетов `TKT-M32-001…008`, демо `demo:m32`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R10 → AC01…AC14; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
