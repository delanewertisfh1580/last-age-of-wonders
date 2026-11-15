# TICKETS-M31 v1.0 — «Epilogue Pipeline & EpilogueFactPort»

**Тип документа:** Детализация тикетов вехи M31
**Дата:** 2026-11-15
**Статус:** ⏳ запланировано — реализация не начата
**Веха:** M31 (Wave 7 — Epilogue & Meta)
**Покрывает:** `DEV-SPEC-036`
**Тикетов:** 12
**Демо вехи:** `bun run demo:m31` — 15 фактов из 6 систем → фильтрация → сортировка → 3 нити → текст → 20 сцен → финальный выбор → save/load → побайтово идентичный эпилог.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-036 | Размер |
|---|---|---|---|
| `TKT-M31-001` | IEpilogueFactPort, модель факта, схемы, EpiErrors | §5.1, §6.3, §8.1, §8.3 | M |
| `TKT-M31-002` | Пайплайн: 5 стадий и механики | §5.6, §7.1, R02 | M |
| `TKT-M31-003` | Сбор и фильтрация фактов | §7.2, R01 | M |
| `TKT-M31-004` | Категоризация и сортировка | §6.2, R04 | M |
| `TKT-M31-005` | Тематическое плетение | §7.5, R05 | M |
| `TKT-M31-006` | Стиль повествования | §5.3, R06 | S |
| `TKT-M31-007` | Сцены и текст | §5.4, R07 | M |
| `TKT-M31-008` | Финальный выбор | §5.5, R08 | M |
| `TKT-M31-009` | События epilogue.* | §6.4, R09 | S |
| `TKT-M31-010` | RNG и снимок | §7.4, §5.6, R10 | M |
| `TKT-M31-011` | CI: graph + lint | §12.6, R11 | S |
| `TKT-M31-012` | Контент и демо demo:m31 | §6.5, §11 R12 | M |

---

## 2. Порядок выполнения

1. `TKT-M31-001` — корень.
2. `TKT-M31-002` после 001; `TKT-M31-003`/`004`/`005` — последовательно внутри пайплайна.
3. `TKT-M31-006` после 005; `TKT-M31-007` после 006.
4. `TKT-M31-008` после 007; `TKT-M31-009` после 003/007.
5. `TKT-M31-010` после 008/009; `TKT-M31-011` после 009/010.
6. `TKT-M31-012` — после всех.

---

## 3. Тикеты

### TKT-M31-001 — IEpilogueFactPort, модель факта, схемы

**DEV-SPEC:** DEV-SPEC-036 §5.1, §6.3, §8.1, §8.3
**Требования:** R01, R03
**AC:** AC01, AC02, AC05, AC06
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-001
**Блокирует:** TKT-M31-002…012

**Что сделать:**
- `EpilogueFactDefinition` (theme 8, significance 4, source 8, sub_facts, related_facts), `IEpilogueFactPort` (`publish`, `snapshot`), `EpilogueFactRegistry` с дедупликацией.
- Схемы `epilogue-fact.json` и ошибки.

**Acceptance Criteria:**
- AC01: `publish` из 032 → факт в реестре + `epilogue.fact_published`.
- AC02: повторный `publish` не создаёт дубль.
- AC05: `theme='glory'` → ошибка схемы.
- AC06: `related_facts` на несуществующий факт → ошибка графа.

**Definition of Done:**
- [ ] контракт, реестр, схемы; [ ] contract-тесты; [ ] `t:type` зелёный.

---

### TKT-M31-002 — Пайплайн: 5 стадий и механики

**DEV-SPEC:** DEV-SPEC-036 §5.6, §7.1, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-001
**Блокирует:** TKT-M31-003…010, TKT-M31-012

**Что сделать:**
- `EpilogueInstance` + state machine пайплайна (collect→filter→sort→weave→compose→render→choice→complete).
- 6 механик §6.1 с `role_tags ∋ 'epilogue'`; запрет пропуска стадий.

**Acceptance Criteria:**
- AC03: `ending_reached` → события в порядке §7.1.
- AC04: `ComposeText` без `SortFacts` → `Err(DOMAIN_EPI_PIPELINE_ORDER)`.

**Definition of Done:**
- [ ] state machine и механики; [ ] тесты порядка; [ ] `ci:validate` зелёный.

---

### TKT-M31-003 — Сбор и фильтрация фактов

**DEV-SPEC:** DEV-SPEC-036 §7.2, R01
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-002
**Блокирует:** TKT-M31-004, TKT-M31-009

**Что сделать:**
- `CollectFacts`, `FilterFacts` (значимость, релевантность, лимиты политики).
- `epilogue-fact-collection-tracker`.

**Acceptance Criteria:**
- AC01/AC02: сбор идемпотентен, повторный вызов в том же такте не меняет набор.

**Definition of Done:**
- [ ] use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M31-004 — Категоризация и сортировка

**DEV-SPEC:** DEV-SPEC-036 §6.2, R04
**Требования:** R04
**AC:** AC07
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-003
**Блокирует:** TKT-M31-005

**Что сделать:**
- `SortFacts`: источник → тема → значимость; детерминированный tie-break по `id`.

**Acceptance Criteria:**
- AC07: порядок соответствует §6.2 и стабилен между прогонами.

**Definition of Done:**
- [ ] сортировка; [ ] тест стабильности; [ ] `t:test` зелёный.

---

### TKT-M31-005 — Тематическое плетение

**DEV-SPEC:** DEV-SPEC-036 §7.5, R05
**Требования:** R05
**AC:** AC08, AC09
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-004
**Блокирует:** TKT-M31-006, TKT-M31-012

**Что сделать:**
- `WeavingModel`: поиск нитей по `theme`/`tags`/`related_facts`, порядок по весу.
- `epilogue-fact-weaving-resolver`.

**Acceptance Criteria:**
- AC08: связанные факты → одна нить с `dominant_theme`.
- AC09: равные веса → tie-break по `id`.

**Definition of Done:**
- [ ] модель и резолвер; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M31-006 — Стиль повествования

**DEV-SPEC:** DEV-SPEC-036 §5.3, R06
**Требования:** R06
**AC:** AC10, AC11
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-005
**Блокирует:** TKT-M31-007

**Что сделать:**
- `NarrativeStyleDefinition` и `StyleModel`: 5 стилей, выбор по финалу и доминирующим фактам.

**Acceptance Criteria:**
- AC10: финал `arcane-mastery` → `narrative-style-mystical`.
- AC11: шаблон без стиля → ошибка схемы.

**Definition of Done:**
- [ ] модель и 5 стилей; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M31-007 — Сцены и текст

**DEV-SPEC:** DEV-SPEC-036 §5.4, R07
**Требования:** R07
**AC:** AC12
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-006
**Блокирует:** TKT-M31-008, TKT-M31-009

**Что сделать:**
- `EpilogueSceneDefinition` (animated/static/procedural), `ComposeText`, `epilogue-scene-selector-resolver`.

**Acceptance Criteria:**
- AC12: `text_composed` → ≥1 сцена и использованные `scene_policy_ids`.

**Definition of Done:**
- [ ] композер и селектор; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M31-008 — Финальный выбор

**DEV-SPEC:** DEV-SPEC-036 §5.5, R08
**Требования:** R08
**AC:** AC13, AC14
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-007
**Блокирует:** TKT-M31-010, TKT-M31-012

**Что сделать:**
- `FinalChoiceDefinition` (meta_influence/narrative_only), `PresentFinalChoice`, `RecordFinalChoice`.

**Acceptance Criteria:**
- AC13: `final_choice_presented` и выбор доступен UI-контракту.
- AC14: неизвестный `outcome_id` → `Err(DOMAIN_EPI_CHOICE_INVALID)`.

**Definition of Done:**
- [ ] контракт и use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M31-009 — События epilogue.*

**DEV-SPEC:** DEV-SPEC-036 §6.4, R09
**Требования:** R09
**AC:** AC15
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-003, TKT-M31-007
**Блокирует:** TKT-M31-010, TKT-M31-011

**Что сделать:**
- 11 ядерных тем + `epilogue.fact_published` + 4 фракционных namespace'а.

**Acceptance Criteria:**
- AC15: все темы §6.4 зарегистрированы.

**Definition of Done:**
- [ ] события; [ ] `--stage=events` зелёный.

---

### TKT-M31-010 — RNG и снимок

**DEV-SPEC:** DEV-SPEC-036 §7.4, §5.6, R10
**Требования:** R10
**AC:** AC16, AC17
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-008, TKT-M31-009
**Блокирует:** TKT-M31-011, TKT-M31-012

**Что сделать:**
- 7 потоков `rng.epilogue.*`; `EpilogueStateMementoProvider`, `epilogue-instance.json` + журнал.

**Acceptance Criteria:**
- AC16: save/load → побайтово равный текст-реф.
- AC17: fixture-прогон не выходит за объявленные потоки.

**Definition of Done:**
- [ ] потоки и провайдер; [ ] тесты; [ ] `t:check` зелёный.

---

### TKT-M31-011 — CI: graph + lint

**DEV-SPEC:** DEV-SPEC-036 §12.6, R11
**Требования:** R11
**AC:** AC18
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-009, TKT-M31-010
**Блокирует:** TKT-M31-012

**Что сделать:**
- `validate-epilogue-graph.ts` (факты→нити→шаблоны, выбор→исходы) и `validate-epilogue-lint.ts` (вес, темы, стили).

**Acceptance Criteria:**
- AC18: negative-fixtures дают ожидаемые ошибки.

**Definition of Done:**
- [ ] стадии; [ ] `ci:validate` зелёный.

---

### TKT-M31-012 — Контент и демо demo:m31

**DEV-SPEC:** DEV-SPEC-036 §6.5, §11 R12
**Требования:** R12
**AC:** AC19
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M31-001…011
**Блокирует:** TKT-M32-001, TKT-M34-005

**Что сделать:**
- 12+ фактов, 10+ шаблонов, 5 стилей, 20+ сцен, 4 выбора.
- `scripts/demo-m31.ts` по SPEC-EPI-080.

**Acceptance Criteria:**
- AC19: `bun run demo:m31` → `Ok`, полный пайплайн и save/load.

**Definition of Done:**
- [ ] контент и демо; [ ] `content:check`; [ ] README; [ ] трассировка M31.

---

## 4. Definition of Done вехи

- [ ] 12 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m31` проходит; [ ] все домены публикуют факты через `IEpilogueFactPort`.

## 5. Что разблокирует M31

`TKT-M32-001` (мета-угроза), `TKT-M34-005` (шаги 9–10 среза).

## 6. Риски и заметки

- Порядок стадий пайплайна — главный источник ошибок; проверять тестом.
- Без фиксированных tie-break эпилог недетерминирован.
- Текст-реф должен быть стабильным, иначе save/load ломает воспроизводимость.
