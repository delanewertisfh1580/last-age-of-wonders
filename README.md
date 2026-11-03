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

## Отклонения от исходных спек (осознанные, Wave 0)

- DI — собственный минимальный контейнер вместо tsyringe/inversify (без декораторов под Bun).
- Logger — NoopLogger/ConsoleLogger; pino-адаптер singing позже (контракт тот же).
- AppConfig — ручная валидация вместо zod.
- пред-push hook (husky) отложен до вехи CI — под Freebuff-средой не ставится автоматически.
