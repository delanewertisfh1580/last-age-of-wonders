# TICKETS-M29 v1.0 — «Story Beacons, Narrative Arcs & Dialogue»

**Тип документа:** Детализация тикетов вехи M29
**Дата:** 2026-11-15
**Статус:** ⏳ запланировано — реализация не начата
**Веха:** M29 (Wave 6 — Captain, Narrative, Hidden Branches)
**Покрывает:** `DEV-SPEC-034`
**Тикетов:** 11
**Демо вехи:** `bun run demo:m29` — предыстория → пролог с выбором → веха от катаклизма → арка от напарника → диалог с репутацией → финал → save/load.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-034 | Размер |
|---|---|---|---|
| `TKT-M29-001` | Определения нарратива, схемы, NarrativeErrors | §5.1, §6.2, §8.3 | M |
| `TKT-M29-002` | Сюжетные вехи и порядок | §5.1, §7.5, R01 | M |
| `TKT-M29-003` | Арки и фракционные арки | §5.2, §5.3, R02/R03 | M |
| `TKT-M29-004` | Диалоги как механика | §5.6, §7.1c, R04 | M |
| `TKT-M29-005` | Предыстория в нарративе | §5.4, R05 | S |
| `TKT-M29-006` | Пролог и первый выбор | §5.5, §7.1d, R06 | M |
| `TKT-M29-007` | Финалы (объявление) | §5.6, R07 | S |
| `TKT-M29-008` | События и равноправные источники | §6.4, §9.3, R08/R09 | M |
| `TKT-M29-009` | RNG и снимок | §7.4, §5.7, R10 | M |
| `TKT-M29-010` | CI: graph + lint | §12.6, R11 | S |
| `TKT-M29-011` | Контент и демо demo:m29 | §6.5, §11 R12 | M |

---

## 2. Порядок выполнения

1. `TKT-M29-001` — корень.
2. `TKT-M29-002`, `TKT-M29-004`, `TKT-M29-005` — параллельно после 001.
3. `TKT-M29-003` после 002; `TKT-M29-006` после 005.
4. `TKT-M29-007` после 002/003.
5. `TKT-M29-008` после 003/004/007.
6. `TKT-M29-009` после 002/008; `TKT-M29-010` после 008/009.
7. `TKT-M29-011` — после всех.

---

## 3. Тикеты

### TKT-M29-001 — Определения нарратива, схемы, NarrativeErrors

**DEV-SPEC:** DEV-SPEC-034 §5.1, §6.2, §8.3
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-001
**Блокирует:** TKT-M29-002…010, TKT-M29-011

**Что сделать:**
- `StoryBeaconDefinition`, `NarrativeArcDefinition`, `FactionNarrativeArcDefinition`, `DialogueDefinition` (+`DialogueLine`), `PrologueDefinition`, `EndingDefinition`, `NarrativeStateInstance`.
- Схемы §6.2, `NarrativeErrors.ts`.

**Acceptance Criteria:**
- AC01: веха без `ordering_policy_id` → ошибка схемы.
- AC02: диалог с 1 участником → ошибка схемы.

**Definition of Done:**
- [ ] контракты и схемы; [ ] ошибки; [ ] `t:type` зелёный.

---

### TKT-M29-002 — Сюжетные вехи и порядок

**DEV-SPEC:** DEV-SPEC-034 §5.1, §7.5, R01
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-001
**Блокирует:** TKT-M29-003, TKT-M29-007, TKT-M29-009, TKT-M29-011

**Что сделать:**
- `BeaconModel` (ordering/activation/completion), `ActivateStoryBeacon`, `CompleteStoryBeacon`.
- `narrative-beacon-tracker`; правило порядка вех.

**Acceptance Criteria:**
- AC01: `cataclysm.triggered` + условие → `story_beacon_activated`.
- AC02: нарушение порядка → `Err(DOMAIN_NARR_BEACON_ORDER_VIOLATION)`.

**Definition of Done:**
- [ ] модель и трекер; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M29-003 — Арки и фракционные арки

**DEV-SPEC:** DEV-SPEC-034 §5.2, §5.3, R02/R03
**Требования:** R02, R03
**AC:** AC03…AC06
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-002
**Блокирует:** TKT-M29-008, TKT-M29-011

**Что сделать:**
- `ArcModel` (activation/completion/skip), `narrative-arc-tracker`, `narrative-faction-arc-tracker`.
- Связь фракционной арки с доктриной и кульминацией.

**Acceptance Criteria:**
- AC03: `companion.reaction_triggered_macro` → `arc_activated`.
- AC04: побочная арка может быть пропущена без блокировки финала.
- AC05/AC06: фракционная арка разрешает `doctrine_id`; без кульминации — ошибка графа.

**Definition of Done:**
- [ ] модели и трекеры; [ ] тесты; [ ] `ci:validate` зелёный.

---

### TKT-M29-004 — Диалоги как механика

**DEV-SPEC:** DEV-SPEC-034 §5.6, §7.1c, R04
**Требования:** R04
**AC:** AC07, AC08, AC09
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-001
**Блокирует:** TKT-M29-008, TKT-M29-011

**Что сделать:**
- `DialogueModel` (граф реплик, теги, исходы), `StartDialogue`, `RecordDialogueChoice`, `EndDialogue`.
- `dialogue-*-resolver` + изменения репутации через `IReputationPort`.

**Acceptance Criteria:**
- AC07: старт → `dialogue_started` и корректная первая реплика.
- AC08: выбор с эффектом → `dialogue_choice_made` и изменение репутации.
- AC09: цикл в `next_line_ids` → `DOMAIN_NARR_DIALOGUE_INVALID`.

**Definition of Done:**
- [ ] движок диалогов; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M29-005 — Предыстория в нарративе

**DEV-SPEC:** DEV-SPEC-034 §5.4, R05
**Требования:** R05
**AC:** AC10
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-005
**Блокирует:** TKT-M29-006

**Что сделать:**
- `BackgroundDefinition` и `ICaptainBackgroundPort` (реализация поверх 032).
- 3 фона: стартовые клятвы, зацепки, тон.

**Acceptance Criteria:**
- AC10: `background-steam-engineer-apprentice` → клятвы и зацепки применены в 027/028.

**Definition of Done:**
- [ ] контракт и 3 фона; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M29-006 — Пролог и первый выбор

**DEV-SPEC:** DEV-SPEC-034 §5.5, §7.1d, R06
**Требования:** R06
**AC:** AC11, AC12
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-005
**Блокирует:** TKT-M29-009, TKT-M29-011

**Что сделать:**
- `PrologueModel`: универсальная сцена + первый крупный выбор (фракция/регион/крючок).
- `StartPrologue`, `CompletePrologue`; факт `epilogue.narrative.prologue_choice_made`.

**Acceptance Criteria:**
- AC11: выбор `choice-steam-faction` → `starting_faction` и `prologue_completed`.
- AC12: повторный пролог → `Err(DOMAIN_NARR_PROLOGUE_COMPLETED)`.

**Definition of Done:**
- [ ] модель и use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M29-007 — Финалы (объявление)

**DEV-SPEC:** DEV-SPEC-034 §5.6, R07
**Требования:** R07
**AC:** AC13
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-002, TKT-M29-003
**Блокирует:** TKT-M29-008, TKT-M31-* (старт эпилога)

**Что сделать:**
- `EndingDefinition` (major/minor) + `ReachEnding`: объявление финала, `narrative.ending_reached`, факт.

**Acceptance Criteria:**
- AC13: условие финала → `ending_reached` и факт в `IEpilogueFactPort`.

**Definition of Done:**
- [ ] контракт и use case; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M29-008 — События и равноправные источники

**DEV-SPEC:** DEV-SPEC-034 §6.4, §9.3, R08/R09
**Требования:** R08, R09
**AC:** AC14, AC15
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-003, TKT-M29-004, TKT-M29-007
**Блокирует:** TKT-M29-009, TKT-M29-010

**Что сделать:**
- 15 ядерных тем + 4 фракционных namespace'а; мосты 025/027/028/033.
- Проверка, что факты из разных источников публикуются без приоритета.

**Acceptance Criteria:**
- AC14: все темы §6.4 зарегистрированы.
- AC15: события из 3 источников дают 3 факта в коллекторе.

**Definition of Done:**
- [ ] события и мосты; [ ] `--stage=events` зелёный.

---

### TKT-M29-009 — RNG и снимок

**DEV-SPEC:** DEV-SPEC-034 §7.4, §5.7, R10
**Требования:** R10
**AC:** AC16, AC17
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-002, TKT-M29-008
**Блокирует:** TKT-M29-010, TKT-M29-011

**Что сделать:**
- 5 потоков `rng.narrative.*`; `NarrativeStateMementoProvider`, `narrative-state.json` + журнал.

**Acceptance Criteria:**
- AC16: save/load → deep-equal и идентичное продолжение 10 тактов.
- AC17: fixture-прогон не выходит за объявленные потоки.

**Definition of Done:**
- [ ] потоки и провайдер; [ ] тесты; [ ] `t:check` зелёный.

---

### TKT-M29-010 — CI: graph + lint

**DEV-SPEC:** DEV-SPEC-034 §12.6, R11
**Требования:** R11
**AC:** AC18
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-008, TKT-M29-009
**Блокирует:** TKT-M29-011

**Что сделать:**
- `validate-narrative-graph.ts` (циклы реплик, порядок вех, кульминации арок) и `validate-narrative-lint.ts`.

**Acceptance Criteria:**
- AC18: negative-fixtures дают ожидаемые ошибки.

**Definition of Done:**
- [ ] стадии; [ ] `ci:validate` зелёный.

---

### TKT-M29-011 — Контент и демо demo:m29

**DEV-SPEC:** DEV-SPEC-034 §6.5, §11 R12
**Требования:** R12
**AC:** AC19
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M29-001…010
**Блокирует:** TKT-M31-002, TKT-M34-002

**Что сделать:**
- 3 фона, 5 вех, 4 фракционные арки, 6 диалогов, 1 пролог, 4 финала.
- `scripts/demo-m29.ts` по SPEC-LORE-090.

**Acceptance Criteria:**
- AC19: `bun run demo:m29` → `Ok`, полный сценарий и save/load.

**Definition of Done:**
- [ ] контент и демо; [ ] `content:check`; [ ] README; [ ] трассировка M29.

---

## 4. Definition of Done вехи

- [ ] 11 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m29` проходит.

## 5. Что разблокирует M29

`TKT-M30-*` (лор и NPC), `TKT-M31-002` (эпилог), `TKT-M34-002` (шаги 1, 7, 8 среза).

## 6. Риски и заметки

- Порядок вех и свободные арки конфликтуют, если арка блокирует веху — запрещено политикой.
- Граф реплик без ацикличности делает выбор непредсказуемым.
- Пролог нельзя проходить дважды: состояние фиксируется в снимке.
