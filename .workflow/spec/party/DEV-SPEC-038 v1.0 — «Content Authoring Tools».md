# DEV-SPEC-038 v1.0 — «Content Authoring Tools»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 8 (Tooling & Vertical Slice), первый блок
**Зависит от:** `DEV-SPEC-001…009`
**Блокирует:** `DEV-SPEC-039`
**Основана на:** `GENERAL DESIGN v1.0` (GD-07, GD-08), `DEV-SPEC-003` (Content Registry & JSON Schema Package), `DEV-SPEC-008` (CI Validation Pipeline), `DEV-SPEC-009` (Localization), все `DEV-SPEC` §6 (data-контракты)
**Связанные DEV-SPEC:** `DEV-SPEC-004` (механики), `DEV-SPEC-005` (RNG), `DEV-SPEC-006` (save), `DEV-SPEC-017…037` (потребители контента), `DEV-SPEC-039` (срез)
**Порождает веху:** `TICKETS-M33`

---

## 0. Как читать эту спеку

Спека описывает **инструменты для авторов контента**, а не игровую механику. Контент — это данные (GD-07), поэтому качество инструментов определяет скорость добавления фракций, кораблей, напарников, катаклизмов, вех и эпилогов. Всё, что здесь описано, работает в репозитории и в CI, без отдельного сервера.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **CLI авторинга** `content:*`: создание, валидация, граф, предпросмотр, документация;
- **скаффолдинг по `ContentKind`**: шаблон файла + запись в манифест пака;
- **генерация TypeScript-типов** из JSON Schema (`content/types/*.ts`) с проверкой рассинхрона;
- **манифесты контент-паков** (`content/<pack>/manifest.json`) и их композиция;
- **авторский lint**: kebab-case ID, ключи локализации, orphan-ссылки, дубликаты, обязательные поля, «баланс только в политиках»;
- **граф контента**: ссылки между определениями, обратные ссылки, «кто использует»;
- **предпросмотр**: загрузка пака в in-memory `ContentRegistry` + отчёт о разрешении политик;
- **генерация документации** по контенту (Markdown-каталог на пак);
- **CI-интеграция**: единый `bun run content:check`, расширение стадий 008;
- **демо** `demo:m33`.

### 1.2. Что спецификация НЕ делает

- Не меняет доменную логику и не добавляет игровых правил.
- Не реализует визуальный редактор с UI (только CLI + dev-страница предпросмотра).
- Не задаёт балансные числа: инструмент проверяет, что числа лежат в политиках.
- Не реализует систему моддинга для игроков (только внутренний авторинг).
- Не заменяет `DEV-SPEC-003` (реестр) и `DEV-SPEC-008` (CI) — расширяет их.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `GD-07` (data-driven) | §5.1, §6.1, R01 | нет |
| `GD-08` (детальные схемы) | §6.2, R02 | нет |
| `DEV-SPEC-003` §5.1 (`ContentKind`) | §5.1 | нет |
| `DEV-SPEC-003` §6.2 (TS-типы) | §7.6, R03 | уточнён контроль рассинхрона |
| `DEV-SPEC-008` (стадии CI) | §6.5, R06 | расширение, не замена |
| `DEV-SPEC-009` (локализация) | §6.4, R04 | нет |
| `DEV-SPEC-006` (save) | §6.6 | нет |

**Расхождения:** GD-08 выносит схемы «в отдельные задачи Specifications» — здесь фиксируется процесс их поддержки (OQ-01). В DESIGN нет инструментов авторинга как контекста; спецификация вводит их как **tooling-контекст** вне `src/domain` (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001` | `Result`, DI, bootstrap |
| `DEV-SPEC-003` | `ContentKind`, `ContentPack`, `IContentRegistry`, схемы |
| `DEV-SPEC-008` | `ValidationStage`, отчёт CI |
| `DEV-SPEC-009` | ключи локализации, `t()`-контракт |

### 2.2. Мягкие

`DEV-SPEC-004` (валидация механик), `DEV-SPEC-005` (потоки RNG в контенте), все спеки-потребители (§6).

### 2.3. Внешние

Только dev-зависимости из `package.json` (`bun`, `typescript`, `ajv` уже используются). Новых рантайм-зависимостей нет.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Content Pack | Каталог `content/<pack>/` с манифестом и JSON-файлами |
| Scaffold | Сгенерированный каркас определения по `ContentKind` |
| Orphan Reference | Ссылка на несуществующий ID |
| Type Drift | Рассинхрон между JSON Schema и `content/types/*.ts` |
| Authoring Lint | Набор правил качества контента |
| Content Graph | Граф ссылок между определениями |

---

## 4. Архитектурное размещение

### 4.1. Слои

Инструменты живут **вне доменных слоёв**: `tools/content/` (CLI, библиотека) + `content/types/` (генерённые типы). Домен ничего не знает об инструментах.

### 4.2. Файлы

```text
tools/content/
  cli.ts                     // bun run content:<cmd>
  commands/
    new.ts                   // скаффолдинг
    validate.ts              // схемы + lint
    graph.ts                 // граф ссылок
    preview.ts               // in-memory загрузка пака
    docs.ts                  // Markdown-каталог
    types.ts                 // генерация TS-типов
  scaffold/
    templates.ts             // шаблоны по ContentKind
    manifest.ts              // правка манифеста пака
  lint/
    rules/
      id-kebab-case.ts
      localization-keys.ts
      orphan-references.ts
      duplicate-ids.ts
      policies-only-numbers.ts
      required-fields.ts
      naming-prefix.ts
    runner.ts
  graph/
    build.ts                 // построение графа
    report.ts                // отчёт "кто использует"
  docs/
    render.ts
content/types/               // gen: content:types
content/<pack>/manifest.json
tools/ci/stages/validate-content-authoring.ts   // стадия contracts+lint
test/content-tools/…
scripts/demo-m33.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `IContentToolkit` | `ContentToolkit` (tools) | singleton | — (вне приложения) |
| `IContentRegistry` | `ContentRegistry` (003) | singleton | `domain-init` (используется предпросмотром) |

---

## 5. Domain-модель

### 5.1. Манифест пака

```ts
export interface ContentPackManifest {
  readonly pack_id: string;                       // kebab-case
  readonly kinds: readonly ContentKind[];
  readonly files: readonly { readonly kind: ContentKind; readonly path: string }[];
  readonly depends_on: readonly string[];          // pack_id
  readonly owner: string;
  readonly version: string;                        // semver
}
```

Инварианты: `TOOLS-INV-01` — каждый `file.path` существует и лежит внутри пака; `TOOLS-INV-02` — `kind` ∈ `ContentKind`; `TOOLS-INV-03` — `depends_on` без циклов.

### 5.2. Результат валидации

```ts
export interface AuthoringIssue {
  readonly code: string;                 // tools/content/<rule>
  readonly severity: 'error' | 'warning';
  readonly file: string;
  readonly pointer: string;              // JSON Pointer
  readonly message: string;
}

export interface AuthoringReport {
  readonly packs: readonly string[];
  readonly files: number;
  readonly issues: readonly AuthoringIssue[];
  readonly passed: boolean;
}
```

Инварианты: `TOOLS-INV-04` — при `severity='error'` `passed=false`; `TOOLS-INV-05` — отчёт детерминирован (issues отсортированы по `file`, `pointer`, `code`).

### 5.3. Скаффолд

```ts
export interface ScaffoldRequest {
  readonly kind: ContentKind;
  readonly id: string;
  readonly pack_id: string;
  readonly display_name: string;
  readonly faction_id?: string;
}

export interface ScaffoldResult {
  readonly path: string;
  readonly manifest_updated: boolean;
  readonly localization_keys: readonly string[];
}
```

Инварианты: `TOOLS-INV-06` — файл не перезаписывается без `--force`; `TOOLS-INV-07` — ID соответствует kebab-case и префиксу вида.

---

## 6. Data-контракты и схемы

### 6.1. Команды CLI

| Команда | Назначение | Код возврата |
|---|---|---|
| `bun run content:new --kind=<kind> --id=<id> --pack=<pack>` | скаффолд определения | 0 / 2 |
| `bun run content:validate [--pack=<pack>]` | схемы + lint | 0 / 1 |
| `bun run content:graph [--format=text\|json]` | граф ссылок и отчёт «кто использует» | 0 / 1 |
| `bun run content:preview --pack=<pack>` | загрузка в in-memory реестр | 0 / 1 |
| `bun run content:types [--check]` | генерация/проверка TS-типов | 0 / 1 |
| `bun run content:docs --pack=<pack>` | Markdown-каталог | 0 |
| `bun run content:check` | validate + types --check + docs --check | 0 / 1 |

### 6.2. Шаблоны по `ContentKind`

Для каждого `ContentKind` (003) шаблон содержит: `id`, `display_name_key`, `description_key`, обязательные политики, пустые массивы связей и комментарий-заглушку `$schema`. Шаблон обязан проходить `content:validate` без правок.

### 6.3. Правила lint

| Правило | Код | Severity |
|---|---|---|
| ID в kebab-case | `tools/content/id-kebab-case` | error |
| Префикс ID соответствует виду | `tools/content/naming-prefix` | error |
| Дубликат ID между паками | `tools/content/duplicate-ids` | error |
| Ссылка на несуществующий ID | `tools/content/orphan-references` | error |
| `display_name_key`/`description_key` есть в локализации | `tools/content/localization-keys` | error |
| Нет «сырых» чисел баланса вне `*_policy_id` | `tools/content/policies-only-numbers` | error |
| Обязательные поля по схеме | `tools/content/required-fields` | error |
| Контент-пак без `owner` | `tools/content/pack-metadata` | warning |

### 6.4. Локализация

`localization-keys` проверяет ключи против `content/<pack>/loc/*.json` (009): каждый ключ существует; неиспользуемые ключи — warning; формат ключа — `<domain>.<entity>.<field|name|description>`.

### 6.5. CI-интеграция

Стадия `contracts` (008) дополняется шагом `content:check`. Порядок сохраняется: `schemas → graph → gameplay → events → mechanics → rng-streams → determinism → contracts`. `content:check` не заменяет стадии, а агрегирует их для авторов.

### 6.6. Предпросмотр

`content:preview` загружает пак(и) в `ContentRegistry`, разрешает все политики, строит граф и печатает: количество определений по видам, разрешённые политики, найденные orphan-ссылки, RNG-потоки, использованные контентом. Никакой записи в save/состояние.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Скаффолд**

```
[requested] --id_valid--> [generating]
[requested] --id_invalid--> [rejected] (exit 2)
[generating] --file_exists && !force--> [rejected]
[generating] --write_ok--> [manifest_updated] --> [done]
```

**(b) Проверка типов**

```
[clean] --schema_changed--> [drift] (exit 1)
[drift] --regen--> [clean]
```

### 7.2. Sequence: добавление нового напарника

```
content:new --kind=companion --id=companion-x --pack=party
  → валидация ID и префикса
  → запись content/party/companions/companion-x.json
  → обновление manifest.json
  → печать ключей локализации для добавления
content:validate --pack=party
  → schemas → lint → orphans → l10n → policies
content:preview --pack=party
  → in-memory реестр → отчёт
```

### 7.3. Производительность инструментов

`content:validate` — O(files + refs); `content:graph` — O(nodes + edges). Полный прогон на 5000 определений ≤ 10 с.

### 7.4. Детерминизм

Инструменты не используют RNG и `Date.now`. Порядок обхода файлов — сортировка по пути. Отчёты побайтово стабильны.

### 7.5. Генерация типов

`content:types` читает `content/schemas/*.json` и пишет `content/types/<kind>.ts`; `--check` сравнивает результат без записи и возвращает 1 при drift. Ручные правки в `content/types/` запрещены (header `// GENERATED — do not edit`).

### 7.6. Граф

Узлы — определения всех видов; рёбра — поля-ссылки (`*_ids`, `*_id`, `policy_id`). Отчёт: входящие/исходящие ссылки, циклы политик, «кто использует».

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 038 (tools), impl: tools/content
export interface IContentToolkit {
  scaffold(req: ScaffoldRequest): Result<ScaffoldResult, ToolError>;
  validate(packIds?: readonly string[]): Result<AuthoringReport, ToolError>;
  graph(): Result<ContentGraph, ToolError>;
  preview(packIds: readonly string[]): Result<PreviewReport, ToolError>;
  generateTypes(mode: 'write' | 'check'): Result<{ readonly drift: readonly string[] }, ToolError>;
}
```

`IContentRegistry`, `ILocalizationService` — из 003/009, только чтение.

### 8.2. Адаптеры

`ContentToolkit` (fs + ajv + 003), `DocsRenderer`, `GraphBuilder`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `TOOL_CONTENT_INVALID_ID` | ID не kebab-case/префикс не тот | да |
| `TOOL_CONTENT_FILE_EXISTS` | файл существует без `--force` | да |
| `TOOL_CONTENT_SCHEMA_INVALID` | определение не проходит схему | да |
| `TOOL_CONTENT_ORPHAN_REF` | ссылка на несуществующий ID | да |
| `TOOL_CONTENT_TYPE_DRIFT` | типы расходятся со схемами | да |
| `TOOL_CONTENT_MANIFEST_INVALID` | манифест пака невалиден | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`ContentKind`/схемы (003), ключи локализации (009), `ValidationStage` (008), dev-зависимости из `package.json`.

### 9.2. Эмитируемые

Файлы контента, `manifest.json`, `content/types/*.ts`, Markdown-каталоги, JSON-отчёты `content:graph`.

### 9.3. Мосты

`content:check → ci:validate --stage=contracts`; `content:preview → ContentRegistry` (003); `content:types → tsc -b --noEmit`; `content:docs → docs/content/*.md`.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `ScaffoldDefinition` | `ScaffoldRequest` | `ScaffoldResult` | fs | — |
| `ValidateContent` | `{packs?}` | `AuthoringReport` | Registry, L10n | — |
| `BuildContentGraph` | `{}` | `ContentGraph` | fs | — |
| `PreviewContentPack` | `{packs}` | `PreviewReport` | Registry | — |
| `GenerateTypes` | `{'write'\|'check'}` | `{drift}` | — | — |
| `RenderContentDocs` | `{pack}` | `{paths}` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| CLI | неверный ID | `TOOL_CONTENT_INVALID_ID` | exit 2, файл не создаётся |
| CLI | файл существует | `TOOL_CONTENT_FILE_EXISTS` | exit 2, подсказка `--force` |
| validate | схема | `TOOL_CONTENT_SCHEMA_INVALID` | issue error, exit 1 |
| graph | orphan | `TOOL_CONTENT_ORPHAN_REF` | issue error, exit 1 |
| types | drift | `TOOL_CONTENT_TYPE_DRIFT` | список файлов, exit 1 |
| manifest | невалиден | `TOOL_CONTENT_MANIFEST_INVALID` | exit 1, загрузка пака невозможна |

---

## 11. Критерии приёмки

### DEV-SPEC-038-R01 — Манифесты паков
Требование: каждый пак имеет манифест; файлы принадлежат паку; зависимости без циклов.
Invariant: TOOLS-INV-01…03.

- AC01: Given пак без `manifest.json`, When `content:validate`, Then `TOOL_CONTENT_MANIFEST_INVALID`.
- AC02: Given циклические `depends_on`, When `content:graph`, Then ошибка.

### DEV-SPEC-038-R02 — Скаффолдинг
Требование: шаблон по виду создаёт валидный файл и обновляет манифест.
Invariant: TOOLS-INV-06/07.

- AC03: Given `content:new --kind=companion --id=companion-x`, When выполнение, Then файл создан, манифест обновлён, `content:validate` проходит.
- AC04: Given существующий файл, When `content:new` без `--force`, Then exit 2 и файл не изменён.

### DEV-SPEC-038-R03 — Типы
Требование: TS-типы генерируются из схем; drift ловится.
Invariant: —

- AC05: Given изменённая схема, When `content:types --check`, Then exit 1 со списком файлов.
- AC06: Given ручная правка `content/types/x.ts`, When `--check`, Then drift.

### DEV-SPEC-038-R04 — Авторский lint
Требование: 7 error-правил и 1 warning; отчёт детерминирован.
Invariant: TOOLS-INV-04/05.

- AC07: Given ID `Companion_X`, When `content:validate`, Then `TOOLS_CONTENT_INVALID_ID`.
- AC08: Given `display_name_key` без записи в локализации, When validate, Then `localization-keys` error.
- AC09: Given числовой баланс вне политики, When validate, Then `policies-only-numbers` error.

### DEV-SPEC-038-R05 — Граф и предпросмотр
Требование: граф ссылок и отчёт «кто использует»; предпросмотр не пишет состояние.

- AC10: Given orphan-ссылка, When `content:graph`, Then узел помечен и exit 1.
- AC11: Given `content:preview --pack=party`, When выполнение, Then отчёт по видам/политикам и никаких записей в save.

### DEV-SPEC-038-R06 — CI
Требование: `content:check` входит в стадию `contracts` без изменения порядка стадий.

- AC12: Given сломанный контент, When `bun run ci:validate`, Then стадия `contracts` падает с тем же кодом.

### DEV-SPEC-038-R07 — Документация
Требование: Markdown-каталог по паку генерируется и стабилен.

- AC13: Given `content:docs --pack=party`, When два прогона, Then файлы побайтово идентичны.

### DEV-SPEC-038-R08 — Безопасность изменений
Требование: инструменты не перезаписывают файлы без `--force`, не трогают `src/**`.

- AC14: Given любой запуск `content:*`, When diff, Then изменения только в `content/**` и `docs/content/**`.

---

## 12. Тест-план

12.1 Unit: T01 правила lint (по одному кейсу на правило); T02 `ScaffoldRequest` валидация; T03 `buildGraph`.
12.2 Integration: T04 `content:new` → `content:validate` → `content:preview`; T05 `content:check` в CI.
12.3 Contract: T06 шаблоны всех `ContentKind` проходят схемы.
12.4 Determinism: T07 повторные прогоны отчётов побайтово равны.
12.5 E2E: T08 `demo:m33` (добавление напарника и вехи от скаффолда до предпросмотра).
12.6 CI: T09 стадия `contracts`.

---

## 13. Производительность

### 13.1. Бюджет
`content:validate` ≤ 10 с на 5000 определений; `content:graph` ≤ 5 с; `content:types --check` ≤ 3 с.

### 13.2. LOD
Не применимо.

### 13.3. Профилирование
Замер времени стадий в отчёте; регрессия > 20% — предупреждение.

---

## 14. Миграции

Версия манифеста — semver. При добавлении обязательного поля в схему — миграционный скрипт `content:migrate --from=<v>` (вне первой волны, OQ-03).

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Кто владеет схемами после GD-08 (003 или каждая спека) | R02/R03 | arch | до M33 |
| OQ-02 | Нужен ли визуальный редактор (dev-страница) в первой волне | R02 | design | до Wave 8 review |
| OQ-03 | Миграции контента между версиями пака | §14 | arch | после M39 |

---

## 16. Что остаётся вне scope

- Игровые правила и доменная логика.
- Публичный моддинг и загрузка пользовательского контента.
- Визуальный редактор с UI (кроме dev-предпросмотра).
- Балансные числа.
- Вертикальный срез → `DEV-SPEC-039`.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M33) |
|---|---|---|---|---|
| GD-07, 003 §5.1 | R01 | AC01,AC02 | T03,T09 | M33-001 |
| GD-07, 003 §6.2 | R02 | AC03,AC04 | T02,T04 | M33-002 |
| 003 §6.2, 009 | R03 | AC05,AC06 | T04 | M33-003 |
| GD-08 | R04 | AC07…AC09 | T01 | M33-004 |
| 003 §5.3, 008 | R05 | AC10,AC11 | T03,T04 | M33-005 |
| 008 (стадии) | R06 | AC12 | T05,T09 | M33-006 |
| GD-07 (каталоги) | R07 | AC13 | T07 | M33-007 |
| GD-17 (ошибки) | R08 | AC14 | T04,T08 | M33-008 |

Итог декомпозиции: 8 тикетов `TKT-M33-001…008`, демо `demo:m33`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы/контракты CLI (§6); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R08 → AC01…AC14; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
