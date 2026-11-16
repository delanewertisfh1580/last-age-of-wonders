# TICKETS-M32 v1.0 — «Meta Threat Generation & Ending Integration»

**Тип документа:** Детализация тикетов вехи M32
**Дата:** 2026-11-15
**Статус:** ✅ реализовано (2026-11-16) — Meta Threat Generation & Ending Integration
**Веха:** M32 (Wave 7 — Epilogue & Meta)
**Покрывает:** `DEV-SPEC-037`
**Тикетов:** 8
**Демо вехи:** `bun run demo:m32` — эпилог с финальным выбором → процедурная мета-угроза с провенансом → перенос в следующий забег → save/load → идентичное состояние.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-037 | Размер |
|---|---|---|---|
| `TKT-M32-001` | Определения угрозы, провенанс, схемы, MetaErrors | §5.1, §5.2, §6.2, §8.3 | M |
| `TKT-M32-002` | Разблокировка мета-слоя | §7.1, R02 | S |
| `TKT-M32-003` | Влияние финального выбора | §7.3, R03 | M |
| `TKT-M32-004` | Генерация имени и контент семейств | §6.5, §6.4, R04/R09 | M |
| `TKT-M32-005` | Детерминизм и повторная генерация | §7.4, R05 | M |
| `TKT-M32-006` | Перенос забега и события | §5.2, §9.3, R06/R07 | M |
| `TKT-M32-007` | CI: graph + lint | §12.6, R08 | S |
| `TKT-M32-008` | Демо demo:m32 | §11 R10 | M |

---

## 2. Порядок выполнения

1. `TKT-M32-001` — корень.
2. `TKT-M32-002` и `TKT-M32-003` — параллельно после 001.
3. `TKT-M32-004` после 001; `TKT-M32-005` после 003/004.
4. `TKT-M32-006` после 003/005.
5. `TKT-M32-007` после 004/006; `TKT-M32-008` — после всех.

---

## 3. Тикеты

### TKT-M32-001 — Определения угрозы, провенанс, схемы

**DEV-SPEC:** DEV-SPEC-037 §5.1, §5.2, §6.2, §8.3
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M31-001
**Блокирует:** TKT-M32-002…008

**Что сделать:**
- `MetaThreatDefinition` (family 4, doctrine, generation/modifiers/hooks policy, name fragments), `MetaThreatInstance`, `MetaRunState`.
- Схемы `meta-threat.json`, `meta-threat-instance.json`, `meta-run-state.json`; `MetaErrors.ts`.

**Acceptance Criteria:**
- AC01: арканные факты → `family='arcane'`, доктрина и модификаторы выведены.
- AC02: модификатор без `provenance_fact_ids` → `DOMAIN_META_PROVENANCE_MISSING`.

**Definition of Done:**
- [ ] контракты и схемы; [ ] ошибки; [ ] `t:type` зелёный.

---

### TKT-M32-002 — Разблокировка мета-слоя

**DEV-SPEC:** DEV-SPEC-037 §7.1, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** S
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-001
**Блокирует:** TKT-M32-003, TKT-M32-006

**Что сделать:**
- `EnableMetaThreat` по `hidden_branch.meta_epilogue_unlocked`; событие `epilogue.meta_threat_generation_enabled`.

**Acceptance Criteria:**
- AC03: разблокировка → событие.
- AC04: без разблокировки → `Err(DOMAIN_META_GENERATION_DISABLED)`.

**Definition of Done:**
- [ ] use case и мост 033; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M32-003 — Влияние финального выбора

**DEV-SPEC:** DEV-SPEC-037 §7.3, R03
**Требования:** R03
**AC:** AC05, AC06
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-002
**Блокирует:** TKT-M32-005, TKT-M32-006

**Что сделать:**
- `ApplyFinalChoice`: `intensity_multiplier`, `additional_tags`; `narrative_only` не меняет механику.

**Acceptance Criteria:**
- AC05: `accept-legacy` → интенсивность ×1.2 и тег `legacy-accepted`.
- AC06: `narrative_only` → модификаторы не изменены, факт зафиксирован.

**Definition of Done:**
- [ ] модель модификаторов; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M32-004 — Генерация имени и контент семейств

**DEV-SPEC:** DEV-SPEC-037 §6.5, §6.4, R04/R09
**Требования:** R04, R09
**AC:** AC07, AC13
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-001
**Блокирует:** TKT-M32-005, TKT-M32-007, TKT-M32-008

**Что сделать:**
- `name_fragment_policy`: 3 слота, выбор из фрагментов; поток `rng.meta.threat_name`.
- 4 семейства × 3 вариации, 12 модификаторов, 8 крючков.

**Acceptance Criteria:**
- AC07: разные seed → разные имена, слоты валидны.
- AC13: контент содержит ≥4 семейств и ≥2 вариации на семейство.

**Definition of Done:**
- [ ] генератор имени и контент; [ ] `content:check` зелёный.

---

### TKT-M32-005 — Детерминизм и повторная генерация

**DEV-SPEC:** DEV-SPEC-037 §7.4, R05
**Требования:** R05
**AC:** AC08, AC09
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-003, TKT-M32-004
**Блокирует:** TKT-M32-006, TKT-M32-008

**Что сделать:**
- `GenerateMetaThreat` с идемпотентностью по `epilogue_id`; `MetaStateMementoProvider`, `meta-state.json`.

**Acceptance Criteria:**
- AC08: повторная генерация → тот же `threat_id` и модификаторы.
- AC09: save/load → идентичный `MetaRunState`.

**Definition of Done:**
- [ ] генератор и снимок; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M32-006 — Перенос забега и события

**DEV-SPEC:** DEV-SPEC-037 §5.2, §9.3, R06/R07
**Требования:** R06, R07
**AC:** AC10, AC11
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-003, TKT-M32-005
**Блокирует:** TKT-M32-007, TKT-M32-008

**Что сделать:**
- `IMetaRunPort` + `MetaRunBridge` (или Null до 012); `PublishMetaRun` → `meta.run_armed`, `meta.run_started`.
- 5 тем §6.3 + фракционные namespace'ы.

**Acceptance Criteria:**
- AC10: `PublishMetaRun` → старт нового забега с активными модификаторами.
- AC11: все темы §6.3 зарегистрированы.

**Definition of Done:**
- [ ] порт, мост, события; [ ] тесты; [ ] `ci:validate` зелёный.

---

### TKT-M32-007 — CI: graph + lint

**DEV-SPEC:** DEV-SPEC-037 §12.6, R08
**Требования:** R08
**AC:** AC12
**Размер:** S
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-004, TKT-M32-006
**Блокирует:** TKT-M32-008

**Что сделать:**
- `validate-meta-graph.ts` и `validate-meta-lint.ts`: family, провенанс, дубли, «нет архетипа имени».

**Acceptance Criteria:**
- AC12: negative-fixtures дают ожидаемые ошибки.

**Definition of Done:**
- [ ] стадии; [ ] `ci:validate` зелёный.

---

### TKT-M32-008 — Демо demo:m32

**DEV-SPEC:** DEV-SPEC-037 §11 R10
**Требования:** R10
**AC:** AC14
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M32-001…007
**Блокирует:** TKT-M34-005 (шаг 10 среза)

**Что сделать:**
- `scripts/demo-m32.ts`: эпилог → выбор → угроза → перенос → save/load.

**Acceptance Criteria:**
- AC14: `bun run demo:m32` → `Ok`, идентичное состояние после загрузки.

**Definition of Done:**
- [ ] демо; [ ] README; [ ] трассировка M32.

---

## 4. Definition of Done вехи

- [ ] 8 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m32` проходит.

## 5. Что разблокирует M32

`TKT-M34-005` (шаги 9–10 среза), `TKT-M34-007` (золотой прогон), контент мета-угроз для 012/039.

## 6. Риски и заметки

- Без провенанса угроза превращается в случайный набор — запрещено контрактом.
- `MetaRunState` не должен попадать в снимок забега как доменное состояние 037.
- Имя из фиксированного списка ломает SPEC-EPI-009 — проверять lint-правилом.
