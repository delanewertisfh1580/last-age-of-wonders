# TICKETS-M27 v1.0 — «Captain Domain (stats, aging, pension, reputation, oaths)»

**Тип документа:** Детализация тикетов вехи M27
**Дата:** 2026-11-15
**Статус:** ⏳ запланировано — реализация не начата
**Веха:** M27 (Wave 6 — Captain, Narrative, Hidden Branches)
**Покрывает:** `DEV-SPEC-032`
**Тикетов:** 9
**Демо вехи:** `bun run demo:m27` — создание капитана с предысторией → 20 возрастных шагов с деградацией → смена репутации по двум фракциям → клятва и её нарушение → пенсия → save/load.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-032 | Размер |
|---|---|---|---|
| `TKT-M27-001` | Определения капитана, схемы, CaptainErrors | §5.1, §6.2, §8.3 | M |
| `TKT-M27-002` | CaptainInstance, инварианты, пенсия как терминал | §5.2, R02 | M |
| `TKT-M27-003` | Старение, деградация, пенсия | §5.3, R03 | M |
| `TKT-M27-004` | Репутация и ICaptainStatePort | §5.2, §8.1, R04 | M |
| `TKT-M27-005` | Предыстория капитана | §5.4, R05 | M |
| `TKT-M27-006` | Клятвы: OathModel и факты | §5.4, R06 | M |
| `TKT-M27-007` | События captain.* + мосты | §6.4, §9.3, R07 | S |
| `TKT-M27-008` | Снимок и CI | §5.5, §12.6, R08/R09 | M |
| `TKT-M27-009` | Демо demo:m27 + интеграция с 027 | §9.4, §11 | M |

---

## 2. Порядок выполнения

1. `TKT-M27-001` — корень.
2. `TKT-M27-002`, `TKT-M27-005` — параллельно после 001.
3. `TKT-M27-003` после 002; `TKT-M27-004` после 002.
4. `TKT-M27-006` после 005.
5. `TKT-M27-007` после 003/004/006.
6. `TKT-M27-008` после 002/007; `TKT-M27-009` — после всех.

---

## 3. Тикеты

### TKT-M27-001 — Определения капитана, схемы, CaptainErrors

**DEV-SPEC:** DEV-SPEC-032 §5.1, §6.2, §8.3
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M22-001
**Блокирует:** TKT-M27-002…008, TKT-M27-009

**Что сделать:**
- `CaptainDefinition` (base_stats 5 ключей, политики роста/старения/пенсии/репутации/клятв, vulnerability/counterplay tags).
- Схемы `captain-definition.json`, `captain-instance.json`, `oath-definition.json`, `captain-background.json`; `CaptainErrors.ts`.

**Acceptance Criteria:**
- AC01: определение без `will` → ошибка схемы.
- AC02: валидное определение → `CreateCaptain` эмитит `captain.created` со статами `base_stats`.

**Definition of Done:**
- [ ] контракты и схемы; [ ] ошибки; [ ] `t:type` зелёный.

---

### TKT-M27-002 — CaptainInstance, инварианты, пенсия как терминал

**DEV-SPEC:** DEV-SPEC-032 §5.2, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-001
**Блокирует:** TKT-M27-003, TKT-M27-004, TKT-M27-008

**Что сделать:**
- `CaptainInstance` (stats, skills, age_ticks, reputation, oaths, wounds, retired, tracker_states).
- Инварианты CAPTAIN-INV-04…07; `RetireCaptain` идемпотентен.

**Acceptance Criteria:**
- AC03: `reputation=-150` в снимке → `INFRA_CAPTAIN_SCHEMA_INVALID`.
- AC04: повторная пенсия не меняет состояние.

**Definition of Done:**
- [ ] агрегат и инварианты; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M27-003 — Старение, деградация, пенсия

**DEV-SPEC:** DEV-SPEC-032 §5.3, §7.1a, R03
**Требования:** R03
**AC:** AC05, AC06
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-002
**Блокирует:** TKT-M27-007, TKT-M27-009

**Что сделать:**
- `AgingModel` + `captain-aging-tracker` (шаг возраста, деградация после порога, clamp, догон при пропуске тактов).
- Пенсия по `pension_age_step` → `RetireCaptain`.

**Acceptance Criteria:**
- AC05: достижение `decay_start` → `captain.stat_degraded` и статы уменьшены по политике.
- AC06: достижение `pension_age_step` → `captain.retired`, `isPresent()=false`.

**Definition of Done:**
- [ ] модель и трекер; [ ] тесты догона; [ ] `t:test` зелёный.

---

### TKT-M27-004 — Репутация и ICaptainStatePort

**DEV-SPEC:** DEV-SPEC-032 §5.2, §8.1, R04
**Требования:** R04
**AC:** AC07, AC08
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-002
**Блокирует:** TKT-M27-007, TKT-M27-009

**Что сделать:**
- `ReputationModel` ([-100,100], веса фракций, clamp), `ChangeReputation`.
- `CaptainStateAdapter` — реализация `ICaptainStatePort` (027): `reputationModifier`, `isPresent`.

**Acceptance Criteria:**
- AC07: `95 + 20` → `100` и `captain.reputation_changed`.
- AC08: `reputationModifier` возвращает значение по политике, не 0.

**Definition of Done:**
- [ ] модель и адаптер; [ ] contract-тест с 027; [ ] `t:test` зелёный.

---

### TKT-M27-005 — Предыстория капитана

**DEV-SPEC:** DEV-SPEC-032 §5.4, R05
**Требования:** R05
**AC:** AC09, AC10
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-001
**Блокирует:** TKT-M27-006, TKT-M27-009

**Что сделать:**
- `CaptainBackgroundDefinition` (start_resources, start_faction_relations, oath_ids, acquisition_hook_ids, narrative_hook_ids).
- `CreateCaptain` применяет фон; выбор фиксируется навсегда.

**Acceptance Criteria:**
- AC09: `background-officer` → стартовые ресурсы, отношения и зацепки применены.
- AC10: повторный выбор фона → `Err(DOMAIN_CAPTAIN_BACKGROUND_LOCKED)`.

**Definition of Done:**
- [ ] контракт и 3 фона; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M27-006 — Клятвы: OathModel и факты

**DEV-SPEC:** DEV-SPEC-032 §5.4, §7.1b, R06
**Требования:** R06
**AC:** AC11, AC12
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-005
**Блокирует:** TKT-M27-007, TKT-M27-009

**Что сделать:**
- `OathModel`: active → fulfilled/broken, условия, штрафы репутации, факт эпилога.
- `SwearOath`, `BreakOath`.

**Acceptance Criteria:**
- AC11: `SwearOath` → `captain.oath_sworn`, `status='active'`.
- AC12: нарушение → `captain.oath_broken`, штраф и факт в `IEpilogueFactPort`.

**Definition of Done:**
- [ ] модель и use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M27-007 — События и мосты

**DEV-SPEC:** DEV-SPEC-032 §6.4, §9.3, R07
**Требования:** R07
**AC:** AC13
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-003, TKT-M27-004, TKT-M27-006
**Блокирует:** TKT-M27-008

**Что сделать:**
- 10 тем `captain.*` + фракционные namespace'ы; мосты в 027/028/036.

**Acceptance Criteria:**
- AC13: все темы §6.4 зарегистрированы, коллизий нет.

**Definition of Done:**
- [ ] события и мосты; [ ] `--stage=events` зелёный.

---

### TKT-M27-008 — Снимок и CI

**DEV-SPEC:** DEV-SPEC-032 §5.5, §12.6, R08/R09
**Требования:** R08, R09
**AC:** AC14, AC15
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-002, TKT-M27-007
**Блокирует:** TKT-M27-009

**Что сделать:**
- `CaptainStateMementoProvider`, `captain-state.json`.
- `validate-captain-graph.ts`, `validate-captain-lint.ts`.

**Acceptance Criteria:**
- AC14: save/load → deep-equal и идентичное продолжение 10 тактов.
- AC15: negative-fixtures (нет политики старения, клятва без последствий, фон без зацепок) дают ожидаемые ошибки.

**Definition of Done:**
- [ ] провайдер и стадии; [ ] `t:check` и `ci:validate` зелёные.

---

### TKT-M27-009 — Демо demo:m27 + интеграция с 027

**DEV-SPEC:** DEV-SPEC-032 §9.4, §11
**Требования:** R01…R09
**AC:** AC02, AC08, AC14
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M27-001…008
**Блокирует:** TKT-M28-002, TKT-M29-005, TKT-M34-002

**Что сделать:**
- `scripts/demo-m27.ts`: капитан → старение → репутация → клятва → пенсия → save/load.
- Проверить, что 027 читает репутацию и `isPresent` через `ICaptainStatePort`.

**Acceptance Criteria:**
- AC02/AC08/AC14: демо проходит, модификатор репутации влияет на 027, снимок восстанавливается.

**Definition of Done:**
- [ ] демо; [ ] интеграционный тест 027↔032; [ ] README; [ ] трассировка M27.

---

## 4. Definition of Done вехи

- [ ] 9 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m27` проходит; [ ] `ICaptainStatePort` реализован в 027.

## 5. Что разблокирует M27

`TKT-M28-*` (трансформация), `TKT-M29-005` (предыстория в прологе), `TKT-M30-*` (NPC реагируют на репутацию), `TKT-M31-001` (факты), `TKT-M34-002` (шаги 1 и 8 среза).

## 6. Риски и заметки

- Деградация статов может обнулить капитана до пенсии — политика задаёт минимумы.
- Пенсия как штатное завершение (INT-24) не должна трактоваться как поражение.
- Клятвы и репутация связаны: штраф применяется один раз за нарушение.
