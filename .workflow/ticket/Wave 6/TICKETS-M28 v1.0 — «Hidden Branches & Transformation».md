# TICKETS-M28 v1.0 — «Hidden Branches & Transformation»

**Тип документа:** Детализация тикетов вехи M28
**Дата:** 2026-11-15
**Статус:** ⏳ запланировано — реализация не начата
**Веха:** M28 (Wave 6 — Captain, Narrative, Hidden Branches)
**Покрывает:** `DEV-SPEC-033`
**Тикетов:** 11
**Демо вехи:** `bun run demo:m28` — катаклизм открывает ветку → активация → переход awakening → mastery → узел → комбинация → финал → мета-слой → save/load.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-033 | Размер |
|---|---|---|---|
| `TKT-M28-001` | Границы контекста, определения, схемы, TransErrors | §5.1, §6.2, §8.3 | M |
| `TKT-M28-002` | Триггеры трансформации | §5.4, §7.1a, R02 | M |
| `TKT-M28-003` | Древо состояний и переходы | §5.3, §7.1b, R03 | M |
| `TKT-M28-004` | Механики трансформации | §6.1, R04 | M |
| `TKT-M28-005` | Модульные узлы и комбинации | §5.2, §7.5, R05 | M |
| `TKT-M28-006` | События hidden_branch.* | §6.4, R06 | S |
| `TKT-M28-007` | Симптомы и 4 канала доставки | §6.3, R07 | M |
| `TKT-M28-008` | Финалы, эпилог и мета-слой | §5.5, §9.3, R08 | M |
| `TKT-M28-009` | RNG и снимок | §7.4, §5.5, R09 | M |
| `TKT-M28-010` | CI: graph + lint | §12.6, R10 | S |
| `TKT-M28-011` | Контент и демо demo:m28 | §6.5, §11 R11 | M |

---

## 2. Порядок выполнения

1. `TKT-M28-001` — корень.
2. `TKT-M28-002`, `TKT-M28-003`, `TKT-M28-005` — параллельно после 001.
3. `TKT-M28-004` после 003; `TKT-M28-006` после 002.
4. `TKT-M28-007` после 003/005.
5. `TKT-M28-008` после 003/006.
6. `TKT-M28-009` после 005/008; `TKT-M28-010` после 006/009.
7. `TKT-M28-011` — после всех.

---

## 3. Тикеты

### TKT-M28-001 — Границы контекста, определения, схемы

**DEV-SPEC:** DEV-SPEC-033 §5.1, §6.2, §8.3
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-001
**Блокирует:** TKT-M28-002…010, TKT-M28-011

**Что сделать:**
- `TransformationBranchDefinition`, `TransformationNodeDefinition`, `TransformationTreeDefinition`, `TransformationTriggerDefinition`, `CaptainTransformationInstance`.
- Схемы §6.2 и `TransformationErrors.ts`; проверить отсутствие импортов чужих доменов.

**Acceptance Criteria:**
- AC01: в `src/domain/transformation/**` нет импортов `domain/party|fleet|economy` (кроме портов).
- AC02: статы капитана не пишутся из 033 (только `applyTransformationTags`).

**Definition of Done:**
- [ ] контракты, схемы, ошибки; [ ] CI-grep; [ ] `t:type` зелёный.

---

### TKT-M28-002 — Триггеры трансформации

**DEV-SPEC:** DEV-SPEC-033 §5.4, §7.1a, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-001
**Блокирует:** TKT-M28-006, TKT-M28-011

**Что сделать:**
- `TriggerModel` + `transformation-trigger-resolver`: допустимые источники `cataclysm.*`, `world.event_occurred`, `companion.legacy_transform_unlocked`.
- `EvaluateTransformationTrigger` → `hidden_branch.trigger_evaluated{result}`.

**Acceptance Criteria:**
- AC03: `cataclysm.hidden_branch_opened` + условие → `activated`.
- AC04: источник `economy.price_shock` → ошибка графа.

**Definition of Done:**
- [ ] модель и резолвер; [ ] тесты; [ ] `ci:validate` зелёный.

---

### TKT-M28-003 — Древо состояний и переходы

**DEV-SPEC:** DEV-SPEC-033 §5.3, §7.1b, R03
**Требования:** R03
**AC:** AC05, AC06
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-001
**Блокирует:** TKT-M28-004, TKT-M28-007, TKT-M28-008

**Что сделать:**
- `TreeModel` (entry/exit условия, достижимость финалов), `TransitionBranchState`, `ActivateBranch`.
- Проверка TRANS-INV-06…09.

**Acceptance Criteria:**
- AC05: переход awakening→mastery по условию → `state_transitioned`.
- AC06: древо без финала → `DOMAIN_TRANS_TREE_INVALID`.

**Definition of Done:**
- [ ] модель и use cases; [ ] тесты достижимости; [ ] `t:test` зелёный.

---

### TKT-M28-004 — Механики трансформации

**DEV-SPEC:** DEV-SPEC-033 §6.1, R04
**Требования:** R04
**AC:** AC07, AC08
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-003
**Блокирует:** TKT-M28-010, TKT-M28-011

**Что сделать:**
- 5 механик §6.1 с `role_tags ∋ 'transformation'`; резолверы без `state_schema`, трекеры с `persisted=true`.

**Acceptance Criteria:**
- AC07: коррупционный трекер персистит и имеет схему.
- AC08: резолвер со `state_schema` → ошибка CI.

**Definition of Done:**
- [ ] механики; [ ] `--stage=mechanics` зелёный.

---

### TKT-M28-005 — Модульные узлы и комбинации

**DEV-SPEC:** DEV-SPEC-033 §5.2, §7.5, R05
**Требования:** R05
**AC:** AC09, AC10
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-001
**Блокирует:** TKT-M28-007, TKT-M28-009, TKT-M28-011

**Что сделать:**
- `NodeModel`: активация/деактивация узлов, совместимость по `combination_tags`, `CombineNodes`.

**Acceptance Criteria:**
- AC09: совместимые узлы → `hidden_branch.combination_formed`.
- AC10: несовместимые → `Err(DOMAIN_TRANS_NODE_INCOMPATIBLE)`.

**Definition of Done:**
- [ ] модель и use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M28-006 — События hidden_branch.*

**DEV-SPEC:** DEV-SPEC-033 §6.4, R06
**Требования:** R06
**AC:** AC11
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-002
**Блокирует:** TKT-M28-008, TKT-M28-010

**Что сделать:**
- 9 ядерных тем + 4 фракционных namespace'а, payload-схемы.

**Acceptance Criteria:**
- AC11: перечень §6.4 зарегистрирован, коллизий нет.

**Definition of Done:**
- [ ] события; [ ] `--stage=events` зелёный.

---

### TKT-M28-007 — Симптомы и 4 канала доставки

**DEV-SPEC:** DEV-SPEC-033 §6.3, R07
**Требования:** R07
**AC:** AC12, AC13
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-003, TKT-M28-005
**Блокирует:** TKT-M28-011

**Что сделать:**
- `transformation-symptom-tracker` и `delivery_policy_id` с 4 каналами (text/visual/audio/companion); без цифр и прогресс-баров.

**Acceptance Criteria:**
- AC12: `state_transitioned` → `symptom_triggered` и политика ≥4 каналов.
- AC13: политика <4 каналов → gameplay lint error.

**Definition of Done:**
- [ ] трекер и контент симптомов; [ ] lint; [ ] `ci:validate` зелёный.

---

### TKT-M28-008 — Финалы, эпилог и мета-слой

**DEV-SPEC:** DEV-SPEC-033 §5.5, §9.3, R08
**Требования:** R08
**AC:** AC14
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-003, TKT-M28-006
**Блокирует:** TKT-M28-009, TKT-M28-011

**Что сделать:**
- Финал публикует факт в `IEpilogueFactPort`; `meta_epilogue_unlocked` по политике; мосты в 034/036/037.

**Acceptance Criteria:**
- AC14: `final_state_reached` → факт + `meta_epilogue_unlocked` при выполнении политики.

**Definition of Done:**
- [ ] финалы и мосты; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M28-009 — RNG и снимок

**DEV-SPEC:** DEV-SPEC-033 §7.4, §5.5, R09
**Требования:** R09
**AC:** AC15, AC16
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-005, TKT-M28-008
**Блокирует:** TKT-M28-010, TKT-M28-011

**Что сделать:**
- Потоки `rng.transformation.trigger`, `.node_combination`, `.symptom`.
- `TransformationStateMementoProvider`, `captain-transformation-state.json` с журналом.

**Acceptance Criteria:**
- AC15: save/load → deep-equal и идентичный переход.
- AC16: fixture-прогон использует только объявленные потоки.

**Definition of Done:**
- [ ] потоки и провайдер; [ ] тесты; [ ] `--stage=rng-streams` зелёный.

---

### TKT-M28-010 — CI: graph + lint

**DEV-SPEC:** DEV-SPEC-033 §12.6, R10
**Требования:** R10
**AC:** AC17
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-004, TKT-M28-006, TKT-M28-009
**Блокирует:** TKT-M28-011

**Что сделать:**
- `validate-transformation-graph.ts` (достижимость, источники, дубли) и `validate-transformation-lint.ts` (узлы без тегов, каналы).

**Acceptance Criteria:**
- AC17: negative-fixtures дают ожидаемые ошибки.

**Definition of Done:**
- [ ] стадии; [ ] `ci:validate` зелёный.

---

### TKT-M28-011 — Контент и демо demo:m28

**DEV-SPEC:** DEV-SPEC-033 §6.5, §11 R11
**Требования:** R11
**AC:** AC18
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M28-001…010
**Блокирует:** TKT-M32-002, TKT-M34-005

**Что сделать:**
- 5 узлов, 3 ветки, 3 триггера, 5 симптомов.
- `scripts/demo-m28.ts` по сценарию SPEC-TRANS-080.

**Acceptance Criteria:**
- AC18: `bun run demo:m28` → `Ok`: триггер → активация → переход → узел → финал → save/load.

**Definition of Done:**
- [ ] контент и демо; [ ] `content:check`; [ ] README; [ ] трассировка M28.

---

## 4. Definition of Done вехи

- [ ] 11 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m28` проходит.

## 5. Что разблокирует M28

`TKT-M29-007` (финалы в нарративе), `TKT-M31-001` (факты трансформации), `TKT-M32-002` (мета-слой), `TKT-M34-005` (шаги 6 среза).

## 6. Риски и заметки

- Соблазн добавить «фоновые трекеры» противоречит SPEC-TRANS-003 — запрещено.
- Комбинации узлов растут квадратично: лимит активных узлов в политике.
- Симптомы не должны раскрывать точные числа прогресса.
