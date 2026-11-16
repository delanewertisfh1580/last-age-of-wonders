# TICKETS-M30 v1.0 — «Lore Revelation, Key NPCs & Environmental Storytelling»

**Тип документа:** Детализация тикетов вехи M30
**Дата:** 2026-11-15
**Статус:** ✅ реализовано (2026-11-16) — Lore Revelation, Key NPCs & Environmental Storytelling
**Веха:** M30 (Wave 6 — Captain, Narrative, Hidden Branches)
**Покрывает:** `DEV-SPEC-035`
**Тикетов:** 8
**Демо вехи:** `bun run demo:m30` — вход в локацию раскрывает фрагмент → слой лора → диалог с NPC → изменение отношения → смерть NPC → save/load.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-035 | Размер |
|---|---|---|---|
| `TKT-M30-001` | Слои лора, фрагменты, схемы, LoreErrors | §5.1, §6.3, §8.3 | M |
| `TKT-M30-002` | Слои раскрытия | §5.2, R02 | S |
| `TKT-M30-003` | Environmental storytelling и равноправные источники | §6.2, §9.3, R03/R04 | M |
| `TKT-M30-004` | Ключевые NPC | §5.3, §5.4, R05 | M |
| `TKT-M30-005` | События lore/npc | §6.4, R06 | S |
| `TKT-M30-006` | RNG и снимок | §7.4, §5.5, R07 | M |
| `TKT-M30-007` | CI: graph + lint | §12.6, R08 | S |
| `TKT-M30-008` | Контент и демо demo:m30 | §6.5, §11 R09 | M |

---

## 2. Порядок выполнения

1. `TKT-M30-001` — корень.
2. `TKT-M30-002` и `TKT-M30-004` — параллельно после 001.
3. `TKT-M30-003` после 002/004; `TKT-M30-005` после 001.
4. `TKT-M30-006` после 003/005.
5. `TKT-M30-007` после 005/006; `TKT-M30-008` — после всех.

---

## 3. Тикеты

### TKT-M30-001 — Слои лора, фрагменты, схемы, LoreErrors

**DEV-SPEC:** DEV-SPEC-035 §5.1, §6.3, §8.3
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M29-001
**Блокирует:** TKT-M30-002…007, TKT-M30-008

**Что сделать:**
- `LoreLayerDefinition`, `LoreFragmentDefinition` (каналы доставки, discovery policy), схемы и `LoreErrors.ts`.
- Инварианты LORE-INV-01…04.

**Acceptance Criteria:**
- AC01: дубль `chronological_order` → ошибка схемы.
- AC02: выполненное условие → `DiscoverLoreFragment` и `lore_fragment_discovered`.

**Definition of Done:**
- [ ] контракты и схемы; [ ] ошибки; [ ] `t:type` зелёный.

---

### TKT-M30-002 — Слои раскрытия

**DEV-SPEC:** DEV-SPEC-035 §5.2, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** S
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-001
**Блокирует:** TKT-M30-003

**Что сделать:**
- `LoreRevelationLayerDefinition`: 5 типов, обязательный `faction_id` при `faction_specific`; `RevealLoreLayer`.

**Acceptance Criteria:**
- AC03: `faction_specific` без `faction_id` → `DOMAIN_LORE_REVELATION_INVALID`.
- AC04: все фрагменты слоя раскрыты → `lore_layer_revealed`.

**Definition of Done:**
- [ ] модель и use case; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M30-003 — Environmental storytelling и равноправные источники

**DEV-SPEC:** DEV-SPEC-035 §6.2, §9.3, R03/R04
**Требования:** R03, R04
**AC:** AC05, AC06, AC07
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-002, TKT-M30-004
**Блокирует:** TKT-M30-006, TKT-M30-008

**Что сделать:**
- `environmental-storyteller`, `lore-discovery-tracker`; доставка через 4 канала без цифр.
- Равноправные источники: локация, событие мира, напарник, NPC, находка.

**Acceptance Criteria:**
- AC05: `world.location_changed` в тегированной локации → фрагмент через visual/audio.
- AC06: фрагмент без каналов → lint error.
- AC07: 3 источника → 3 факта в коллекторе.

**Definition of Done:**
- [ ] механики и мосты; [ ] тесты; [ ] `ci:validate` зелёный.

---

### TKT-M30-004 — Ключевые NPC

**DEV-SPEC:** DEV-SPEC-035 §5.3, §5.4, R05
**Требования:** R05
**AC:** AC08…AC11
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-001
**Блокирует:** TKT-M30-003, TKT-M30-008

**Что сделать:**
- `KeyNpcDefinition` (4 типа), `KeyNpcInstance` (attitude, status), `NpcModel`.
- `ChangeNpcState`, `KillKeyNpc`; факт `epilogue.narrative.npc_died`.

**Acceptance Criteria:**
- AC08: `npc_type='antagonist'` → политика состояния разрешается.
- AC09: `95 + 20` → `100` и `npc_state_changed`.
- AC10: `KillKeyNpc` → `dead`, событие, факт.
- AC11: действие с `dead` NPC → `DOMAIN_NPC_DEAD`.

**Definition of Done:**
- [ ] модель и use cases; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M30-005 — События lore/npc

**DEV-SPEC:** DEV-SPEC-035 §6.4, R06
**Требования:** R06
**AC:** AC12
**Размер:** S
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-001
**Блокирует:** TKT-M30-006, TKT-M30-007

**Что сделать:**
- Использовать ядерные темы 034 (`lore_*`, `npc_*`) + фракционные namespace'ы, payload-схемы.

**Acceptance Criteria:**
- AC12: темы зарегистрированы и не дублируют ядро.

**Definition of Done:**
- [ ] события; [ ] `--stage=events` зелёный.

---

### TKT-M30-006 — RNG и снимок

**DEV-SPEC:** DEV-SPEC-035 §7.4, §5.5, R07
**Требования:** R07
**AC:** AC13, AC14
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-003, TKT-M30-005
**Блокирует:** TKT-M30-007, TKT-M30-008

**Что сделать:**
- Потоки `rng.narrative.lore_revelation`, `.npc_state`.
- `LoreStateMementoProvider`, `lore-state.json` (слои, фрагменты, NPC).

**Acceptance Criteria:**
- AC13: save/load → deep-equal и идентичное продолжение 10 тактов.
- AC14: fixture-прогон использует только объявленные потоки.

**Definition of Done:**
- [ ] потоки и провайдер; [ ] `t:test` зелёный.

---

### TKT-M30-007 — CI: graph + lint

**DEV-SPEC:** DEV-SPEC-035 §12.6, R08
**Требования:** R08
**AC:** AC15
**Размер:** S
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-005, TKT-M30-006
**Блокирует:** TKT-M30-008

**Что сделать:**
- `validate-lore-graph.ts` (слои→фрагменты→раскрытие, NPC→фрагменты) и `validate-lore-lint.ts` (каналы, `faction_specific`).

**Acceptance Criteria:**
- AC15: negative-fixtures дают ожидаемые ошибки.

**Definition of Done:**
- [ ] стадии; [ ] `ci:validate` зелёный.

---

### TKT-M30-008 — Контент и демо demo:m30

**DEV-SPEC:** DEV-SPEC-035 §6.5, §11 R09
**Требования:** R09
**AC:** AC16
**Размер:** M
**Статус:** ✅ выполнено
**Зависит от:** TKT-M30-001…007
**Блокирует:** TKT-M31-002, TKT-M34-005

**Что сделать:**
- 4 слоя, 12 фрагментов, 5 слоёв раскрытия, 6 NPC.
- `scripts/demo-m30.ts` по SPEC-LORE-089.

**Acceptance Criteria:**
- AC16: `bun run demo:m30` → `Ok`: локация → фрагмент → слой → NPC → смерть → save/load.

**Definition of Done:**
- [ ] контент и демо; [ ] `content:check`; [ ] README; [ ] трассировка M30.

---

## 4. Definition of Done вехи

- [ ] 8 тикетов закрыты; [ ] `t:check` зелёный; [ ] `ci:validate` зелёный; [ ] `content:check` зелёный; [ ] `demo:m30` проходит; [ ] закрывает Wave 6.

## 5. Что разблокирует M30

`TKT-M31-002` (факты лора в эпилоге), `TKT-M34-005` (шаг 7 среза), контент NPC для 021/023.

## 6. Риски и заметки

- Environmental storytelling легко превращается в текстовые простыни — лимит на объём фрагмента в политике.
- Смерть NPC терминальна; воскрешение допускается только отдельной политикой.
- Равноправные источники не должны давать приоритет «сюжетным» фактам.
