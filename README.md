# «Наука против Магии» — walking skeleton (Wave 0)

Скелет по тикетам Wave 0 (вехи M1–M4). TypeScript, vitest, собственные форк примитивов (Result/AppError/Brand), ajv для JSON Schema.

## Скрипты

```bash
bun run t:type      # typecheck (tsc -b --noEmit)
bun run t:test      # unit + contract тесты
bun run t:check     # typecheck + тесты

bun run ci:validate         # все 8 стадий CI-конвейера
bun run ci:validate -- --stage=schemas   # одна стадия
bun run ci:validate -- --reporter=json   # JSON-отчёт

bun run demo:m2     # контент → механика реагирует
bun run demo:m3     # 50 тиков → save → load → идентичное продолжение
bun run demo:full   # полный E2E walking skeleton

bun run trace:build # карта трассировки .workflow → trace/dist/index.html
bun run trace:check # то же + код 1 при разрывах уровня error
```

## Как проверить M2

```bash
bun run demo:m2
```
Ожидаемый вывод: bootstrap → content loaded (hash) → mechanics registered → publish world.tick_advanced → state { count: 1 }.

## Как проверить M3

```bash
bun run demo:m3
```
Ожидаемый вывод: эталон 50 тиков → save slot demo → load → 50 тиков → rng identical: true / runtime identical: true → DEMO M3 OK.

## Как проверить M4 (полный скелет)

```bash
bun run demo:full
bun run ci:validate
```
Ожидается: bootstrap → контент → локализация → 20 тиков → save → load → 20 тиков → identical; затем отчёт стадий schemas/graph/gameplay/events/mechanics/rng-streams/determinism/contracts — все ✅.

## Структура

```
src/
  domain/         # контракты: events, content, mechanics, rng, save, clock, localization, config
  infrastructure/ # реализации: eventbus, ajv-валидатор, json/md in-memory реестры, rng, save-репозитории, clock, локализация, механики
  application/    # use cases (Save/Load/List/Delete)
  bootstrap/      # GameBootstrap + загрузка схем
  shared/         # Logger, EventType/DomainEvent/DeliveryPolicy, бренды потока
  scripts → scripts/ # демо M2/M3/full
content/          # packs, events/core.json (30 событий), mechanics/stubs.json (3 stub), schemas (8), locales (en/ru), cross-refs
tools/ci/         # кли ci:validate, reporters, стадии, правила gameplay, fixtures
tools/trace/      # сборка карты трассировки .workflow
.workflow/        # INTENT → GENERAL DESIGN → DESIGN (10) → DEV-SPEC (27) → тикеты (Wave 0 + Wave 3)
test/             # unit + contract тесты
```

## CI-стадии

- **schemas** — AJV-валидация всех JSON контента.
- **graph** — перекрёстные ссылки (cross-refs.json).
- **gameplay** — 11 правил Wave 0 (fleet/economy/cataclysm/combat/party/companion/transformation/narrative/epilogue/art + localization).
- **events** — core-события, namespace faction_extension, fixture design-events.json.
- **mechanics** — инварианты инвариантов mechanic-definition (AC01..03), roleTags, priority, уникальность id.
- **rng-streams** — fixture design-rng-streams.json, дубли, запрет Math.random() в src/domain и src/application.
- **determinism** — 100 тиков сценария + сравнение с expected.snapshot.json (`--update` для регенерации).
- **contracts** — bootstrap, content, EventBus публикует core-события, memento-провайдеры, Result-контракт use cases.

## Состояние документации

Статусы `.workflow` актуализированы по коду 2026-11-14:

- `INTENT` и `GENERAL DESIGN` — утверждены;
- 10 документов `DESIGN v1.0` — ✅ утверждено;
- `DEV-SPEC-001…009` (Wave 0) — ✅ реализовано, подтверждено `bun run t:check` и `bun run ci:validate`;
- тикеты M1–M4 (82) — ✅ выполнено, M5–M7 (56) — ⏳ не начато;
- `DEV-SPEC-010…027` остаются draft: реализации ещё нет.

Подробности и отклонения реализации — в `TICKETS-OVERVIEW` (§12) и `DEV-SPEC-OVERVIEW` (§9).

## Трассировка документации

`bun run trace:build` читает всю папку `.workflow` и строит сквозную цепочку по идентификаторам:

```
TICKET (TKT-M1-001) → DEV-SPEC (DEV-SPEC-001, §…) → DESIGN-блок (GD-01 / SPEC-ECON-001)
  → DESIGN-документ → INT-xx → INTENT
```

Результат — автономная страница `trace/dist/index.html`: дерево с корнем `INTENT` и тикетами на листьях, поиск по ID, карточка узла с цепочкой и ссылками на исходные документы, отчёт о разрывах. Рядом пишется `trace/dist/trace-data.json`.

```bash
bun run trace:build   # собрать визуализацию
bun run trace:check   # то же + ненулевой код при разрывах уровня error
```

Публикация — только вручную: workflow **Traceability Map** (`.github/workflows/trace.yml`, `workflow_dispatch`) собирает карту и деплоит её на GitHub Pages. Перед первым запуском включите Pages: **Settings → Pages → Source = GitHub Actions**.

## Отклонения от исходных спек (осознанные, Wave 0)

- DI — собственный минимальный контейнер вместо tsyringe/inversify (без декораторов под Bun).
- Logger — NoopLogger/ConsoleLogger; pino-адаптер singing позже (контракт тот же).
- AppConfig — ручная валидация вместо zod.
- пред-push hook (husky) отложен до вехи CI — под Freebuff-средой не ставится автоматически.
