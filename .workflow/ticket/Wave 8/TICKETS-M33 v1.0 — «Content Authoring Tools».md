# TICKETS-M33 v1.0 — «Content Authoring Tools»

**Тип документа:** Детализация тикетов вехи M33
**Дата:** 2026-11-15
**Статус:** ⏳ запланировано — реализация не начата
**Веха:** M33 (Wave 8 — Epilogue, Tooling & Vertical Slice)
**Покрывает:** `DEV-SPEC-038`
**Тикетов:** 8
**Демо вехи:** `bun run demo:m33` — скаффолд напарника и вехи → validate → graph → preview → types --check → docs, без изменений в `src/**`.

---

## 1. Состав вехи

| ID | Название | DEV-SPEC-038 | Размер |
|---|---|---|---|
| `TKT-M33-001` | Манифесты паков и валидация структуры | §5.1, R01 | M |
| `TKT-M33-002` | CLI и скаффолдинг по ContentKind | §5.3, §6.1, R02 | M |
| `TKT-M33-003` | Генерация TS-типов и контроль drift | §7.5, R03 | M |
| `TKT-M33-004` | Авторский lint (7 правил + warning) | §6.3, R04 | M |
| `TKT-M33-005` | Граф контента и предпросмотр | §7.6, §6.6, R05 | M |
| `TKT-M33-006` | CI: content:check в стадии contracts | §6.5, R06 | S |
| `TKT-M33-007` | Генерация документации | §6.1, R07 | S |
| `TKT-M33-008` | Безопасность изменений и демо demo:m33 | §11 R08 | M |

---

## 2. Порядок выполнения

1. `TKT-M33-001` — корень.
2. `TKT-M33-002`, `TKT-M33-003`, `TKT-M33-004` — параллельно после 001.
3. `TKT-M33-005` после 001/002.
4. `TKT-M33-006` после 003/004/005; `TKT-M33-007` после 002.
5. `TKT-M33-008` — после всех.

---

## 3. Тикеты

### TKT-M33-001 — Манифесты паков и валидация структуры

**DEV-SPEC:** DEV-SPEC-038 §5.1, R01
**Требования:** R01
**AC:** AC01, AC02
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** DEV-SPEC-003, TKT-M31-012
**Блокирует:** TKT-M33-002…008

**Что сделать:**
- `ContentPackManifest` + `manifest.json` для всех паков; проверка путей, `kind`, циклов `depends_on`.
- `TOOLS-INV-01…03`.

**Acceptance Criteria:**
- AC01: пак без манифеста → `TOOL_CONTENT_MANIFEST_INVALID`.
- AC02: циклические зависимости → ошибка графа.

**Definition of Done:**
- [ ] манифесты и валидатор; [ ] тесты; [ ] `t:type` зелёный.

---

### TKT-M33-002 — CLI и скаффолдинг по ContentKind

**DEV-SPEC:** DEV-SPEC-038 §5.3, §6.1, R02
**Требования:** R02
**AC:** AC03, AC04
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-001
**Блокирует:** TKT-M33-005, TKT-M33-007, TKT-M33-008

**Что сделать:**
- `tools/content/cli.ts` и команды `content:new`, `content:validate`, `content:graph`, `content:preview`, `content:docs`, `content:types`, `content:check`.
- Шаблоны для всех `ContentKind`; обновление манифеста.

**Acceptance Criteria:**
- AC03: `content:new --kind=companion` → файл + манифест + `content:validate` зелёный.
- AC04: существующий файл без `--force` → exit 2, файл не изменён.

**Definition of Done:**
- [ ] CLI и шаблоны; [ ] скрипты в `package.json`; [ ] `t:test` зелёный.

---

### TKT-M33-003 — Генерация TS-типов и контроль drift

**DEV-SPEC:** DEV-SPEC-038 §7.5, R03
**Требования:** R03
**AC:** AC05, AC06
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-001
**Блокирует:** TKT-M33-006

**Что сделать:**
- `content:types` (write/check) из JSON Schema в `content/types/*.ts` с header `// GENERATED`.

**Acceptance Criteria:**
- AC05: изменённая схема → `content:types --check` exit 1 со списком.
- AC06: ручная правка типа → drift.

**Definition of Done:**
- [ ] генератор; [ ] `content:types --check` в CI; [ ] drift-тест.

---

### TKT-M33-004 — Авторский lint

**DEV-SPEC:** DEV-SPEC-038 §6.3, R04
**Требования:** R04
**AC:** AC07…AC09
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-001
**Блокирует:** TKT-M33-006, TKT-M33-008

**Что сделать:**
- 7 error-правил + `pack-metadata` warning (kebab-case, префикс, дубли, orphan, локализация, «числа только в политиках», обязательные поля).
- Детерминированный отчёт `AuthoringReport`.

**Acceptance Criteria:**
- AC07: `Companion_X` → `TOOL_CONTENT_INVALID_ID`.
- AC08: ключ без локализации → error.
- AC09: балансное число вне политики → error.

**Definition of Done:**
- [ ] правила и runner; [ ] по тесту на правило; [ ] `t:test` зелёный.

---

### TKT-M33-005 — Граф контента и предпросмотр

**DEV-SPEC:** DEV-SPEC-038 §7.6, §6.6, R05
**Требования:** R05
**AC:** AC10, AC11
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-001, TKT-M33-002
**Блокирует:** TKT-M33-006, TKT-M33-008

**Что сделать:**
- `GraphBuilder` (узлы/рёбра, входящие/исходящие, «кто использует») и `content:preview` на in-memory `ContentRegistry`.

**Acceptance Criteria:**
- AC10: orphan-ссылка → узел помечен, exit 1.
- AC11: preview не пишет состояние и не трогает save.

**Definition of Done:**
- [ ] граф и preview; [ ] тесты; [ ] `t:test` зелёный.

---

### TKT-M33-006 — CI: content:check в contracts

**DEV-SPEC:** DEV-SPEC-038 §6.5, R06
**Требования:** R06
**AC:** AC12
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-003, TKT-M33-004, TKT-M33-005
**Блокирует:** TKT-M33-008

**Что сделать:**
- Добавить `content:check` в стадию `contracts`, не меняя порядок 8 стадий.

**Acceptance Criteria:**
- AC12: сломанный контент → `ci:validate` падает на `contracts` с тем же кодом.

**Definition of Done:**
- [ ] интеграция в 008; [ ] `ci:validate` зелёный.

---

### TKT-M33-007 — Генерация документации

**DEV-SPEC:** DEV-SPEC-038 §6.1, R07
**Требования:** R07
**AC:** AC13
**Размер:** S
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-002
**Блокирует:** TKT-M33-008

**Что сделать:**
- `content:docs --pack=<pack>` → `docs/content/<pack>.md` с таблицами определений.

**Acceptance Criteria:**
- AC13: два прогона дают побайтово идентичные файлы.

**Definition of Done:**
- [ ] рендер; [ ] тест стабильности; [ ] `docs/content` в git.

---

### TKT-M33-008 — Безопасность изменений и демо demo:m33

**DEV-SPEC:** DEV-SPEC-038 §11 R08
**Требования:** R08
**AC:** AC14
**Размер:** M
**Статус:** ⏳ не начато
**Зависит от:** TKT-M33-001…007
**Блокирует:** TKT-M34-009

**Что сделать:**
- Проверка, что `content:*` меняет только `content/**` и `docs/content/**`.
- `scripts/demo-m33.ts`: полный цикл авторинга.

**Acceptance Criteria:**
- AC14: diff после любого запуска не затрагивает `src/**`; демо проходит.

**Definition of Done:**
- [ ] guard-тест и демо; [ ] README; [ ] трассировка M33.

---

## 4. Definition of Done вехи

- [ ] 8 тикетов закрыты; [ ] `content:check` зелёный; [ ] `ci:validate` зелёный; [ ] `t:check` зелёный; [ ] `demo:m33` проходит.

## 5. Что разблокирует M33

`TKT-M34-009` (релизный чеклист использует `content:check`), дальнейший авторинг контента всех волн.

## 6. Риски и заметки

- Инструменты не должны становиться вторым источником истины для схем — владелец 003.
- Генерация типов может конфликтовать с ручными типами — header и `--check` обязательны.
- Локализационный lint требует, чтобы паки содержали `loc/*.json` до валидации.
