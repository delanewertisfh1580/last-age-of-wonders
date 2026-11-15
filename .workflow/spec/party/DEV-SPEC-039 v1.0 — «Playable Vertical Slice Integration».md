# DEV-SPEC-039 v1.0 — «Playable Vertical Slice Integration»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 8 (Tooling & Vertical Slice), второй блок
**Зависит от:** `DEV-SPEC-001…038`
**Блокирует:** — (терминальная веха первой сборки)
**Основана на:** `GENERAL DESIGN v1.0` (GD-05, GD-06, GD-09, GD-10, GD-14), интеграционные сценарии `SPEC-FLEET-080`, `SPEC-COMBAT-080`, `SPEC-PARTY-080`, `SPEC-COMP-080`, `SPEC-CATA-080/090/100`, `SPEC-ECON-080/090/100`, `SPEC-TRANS-080`, `SPEC-LORE-080/090`, `SPEC-EPI-080`, `SPEC-ART-080/090`
**Связанные DEV-SPEC:** все `DEV-SPEC-001…038`
**Порождает веху:** `TICKETS-M34`

---

## 0. Как читать эту спеку

Спека **не добавляет новых механик**. Она собирает все предыдущие домены в один проходимый забег и фиксирует, что считается «первой сборкой»: маршрут, швы между доменами, бюджет производительности, сохранения в контрольных точках, золотой прогон и release-чеклист.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **маршрут забега** (sлиц-сценарий): пролог → торговля в городе → морской бой → бой команд + дуэль → катаклизм → трансформация → нарратив → пенсия/финал → эпилог → мета-угроза;
- **сборочный слой** (`src/app/slice/`): композиция DI, порядок `scope:*`, регистрация всех механик и обработчиков;
- **контракт контрольных точек**: 6 точек сохранения/загрузки внутри забега;
- **золотой прогон**: детерминированный прогон из seed с хешем состояния на каждой контрольной точке;
- **бюджет производительности** сборки (тик, кадр, память, размер save);
- **наблюдаемость**: локальные счётчики, структурированные логи, отчёт прогона;
- **release-чеклист** и **демо** `demo:m34` (полный забег);
- **матрица покрытия**: какие AC/сценарии предыдущих спек проверяются в срезе.

### 1.2. Что спецификация НЕ делает

- Не переопределяет механику доменов — только композиция и проверка швов.
- Не добавляет баланс и контент сверх первой волны.
- Не реализует финальные ассеты, тексты и полировку.
- Не заменяет доменные демо (`demo:m23`…`demo:m33`) — срез вызывает их контракты.
- Не реализует мобильный UX сверх бюджета 016.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `GD-05/GD-06` (такт) | §5.4, §7.3, R02 | нет |
| `GD-09/GD-10` (Memento, сейвы) | §5.5, §7.4, R04 | нет |
| `GD-14` (мобильная адаптация) | §6.4, R06 | нет |
| `GD-17` (ошибки) | §10 | нет |
| `SPEC-FLEET-080` (торговый рейс) | §5.1 шаг 2, §11 R03 | нет |
| `SPEC-COMBAT-080` (бой команд) | §5.1 шаг 4, §11 R03 | нет |
| `SPEC-CATA-080/090/100` (цикл катаклизма) | §5.1 шаг 5, §11 R05 | нет |
| `SPEC-ECON-080/090/100` (экономика) | §5.1 шаг 2, §11 R03 | нет |
| `SPEC-TRANS-080` (трансформация) | §5.1 шаг 6, §11 R05 | нет |
| `SPEC-LORE-080/090` (пролог и финал) | §5.1 шаги 1 и 8, §11 R05 | нет |
| `SPEC-EPI-080` (эпилог) | §5.1 шаг 9, §11 R05 | нет |
| `SPEC-ART-080/090` (визуал) | §6.3, R06 | ассеты вне первой сборки |

**Расхождения:** интеграционные сценарии предыдущих спек описаны по отдельности и местами используют разные имена событий; сборочный слой фиксирует **единственные** канонические топики (R01) и регистрирует адаптеры на границах (OQ-01). Полный золотой прогон требует всех демо-скриптов предыдущих вех (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-017…022` | флот, бой, доктрины, экономика |
| `DEV-SPEC-023…026` | мир, события, катаклизмы |
| `DEV-SPEC-027…031` | отряд, напарники, бой команд, дуэль |
| `DEV-SPEC-032…037` | капитан, трансформация, нарратив, лор, эпилог, мета |
| `DEV-SPEC-038` | `content:check` как входная проверка |

### 2.2. Мягкие

`DEV-SPEC-010…016` (рендер, UI, ввод, аудио, мобильный бюджет) — срез работает в headless-режиме без них.

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/app/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Slice | Проходимый вертикальный срез первой сборки |
| Checkpoint | Контрольная точка save/load внутри забега |
| Golden Run | Детерминированный прогон из фиксированного seed с хешами состояния |
| Seam | Шов между доменами (событие/порт), проверяемый в срезе |
| Run Report | Отчёт прогона: шаги, события, тайминги, хеши |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/app/slice/` — композиция и сценарий среза (единственное место, где домены собираются вместе).
- `src/app/slice/scenarios/` — шаги маршрута.
- `src/app/slice/checkpoints/` — контрольные точки и хеши.
- `scripts/demo-m34.ts` — headless-прогон среза.

### 4.2. Файлы

```text
src/app/slice/
  bootstrap.ts                // композиция DI всех доменов
  SliceRunner.ts              // прогон маршрута
  SliceConfig.ts              // seed, режим, бюджет
  scenarios/
    s1-prologue.ts
    s2-trade.ts
    s3-sea-battle.ts
    s4-party-duel.ts
    s5-cataclysm.ts
    s6-transformation.ts
    s7-narrative.ts
    s8-ending.ts
    s9-epilogue.ts
    s10-meta.ts
  checkpoints/
    CheckpointRegistry.ts
    stateHash.ts
  report/
    RunReportBuilder.ts
test/slice/
  golden-run.test.ts
  checkpoints.test.ts
  seams.test.ts
scripts/demo-m34.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `SliceRunner` | сборочный | singleton | после `integration` |
| `ICheckpointRegistry` | `CheckpointRegistry` | singleton | `save-composition` |
| `IRunReportBuilder` | `RunReportBuilder` | singleton | — |

Все доменные токены — из `DEV-SPEC-001…038`; срез **не** создаёт новых доменных портов.

---

## 5. Domain-модель

### 5.1. Маршрут забега

| Шаг | Сценарий | Домены | Ключевые события |
|---|---|---|---|
| 1 | Пролог и предыстория | 032, 034 | `captain.created`, `narrative.prologue_completed` |
| 2 | Торговля в городе | 020, 021, 023 | `economy.trade_executed`, `captain.reputation_changed` |
| 3 | Морской бой | 017, 018 | `fleet.ship_changed`, `combat.ended` |
| 4 | Бой команд + дуэль | 027…031 | `combat.crew_died`, `combat.duel_captain_wounded` |
| 5 | Катаклизм | 025, 026 | `cataclysm.triggered`, `cataclysm.effect_applied` |
| 6 | Трансформация | 033 | `hidden_branch.activated`, `hidden_branch.final_state_reached` |
| 7 | Нарратив и лор | 034, 035 | `narrative.story_beacon_completed`, `narrative.lore_layer_revealed` |
| 8 | Пенсия или финал | 032, 034 | `captain.retired` / `narrative.ending_reached` |
| 9 | Эпилог | 036 | `epilogue.text_composed`, `epilogue.final_choice_made` |
| 10 | Мета-угроза | 037 | `epilogue.meta_threat_generated`, `meta.run_armed` |

### 5.2. Контрольные точки

| ID | После шага | Что проверяется |
|---|---|---|
| `cp-1` | 1 | капитан, фон, пролог, клятвы |
| `cp-2` | 2 | экономика, репутация, отряд |
| `cp-3` | 4 | ранения, потери, отношения |
| `cp-4` | 6 | ветка, состояние древа, узлы |
| `cp-5` | 8 | вехи, лор, финал |
| `cp-6` | 10 | эпилог, выбор, угроза, мета-перенос |

### 5.3. Конфигурация прогона

```ts
export interface SliceConfig {
  readonly seed: string;
  readonly mode: 'headless' | 'interactive';
  readonly checkpoints: readonly string[];
  readonly perf_budget_id: string;
  readonly content_packs: readonly string[];
}
```

Инварианты: `SLICE-INV-01` — `seed` обязателен; `SLICE-INV-02` — все `content_packs` проходят `content:check`; `SLICE-INV-03` — режим `headless` не обращается к DOM/Canvas.

### 5.4. Порядок такта

`scope:world → scope:captain → scope:narrative → scope:party → scope:combat → scope:economy`, затем внеочередные пост-финальные фазы `scope:epilogue → scope:meta`. Порядок фиксирован срезом и проверяется тестом.

### 5.5. Снимок

Снимок среза = композиция всех `IMementoProvider` (001–037), `$id: slice-state.json`; срез не хранит собственного доменного состояния, только `slice_meta` (seed, шаг, индекс чекпоинта).

---

## 6. Data-контракты и схемы

### 6.1. Run Report

```ts
export interface RunReport {
  readonly seed: string;
  readonly steps: readonly { readonly id: string; readonly tick: number; readonly duration_ms: number; readonly state_hash: string }[];
  readonly checkpoints: readonly { readonly id: string; readonly state_hash: string }[];
  readonly events_count: number;
  readonly errors: readonly string[];
  readonly perf: { readonly max_tick_ms: number; readonly avg_tick_ms: number; readonly save_bytes: number };
  readonly passed: boolean;
}
```

### 6.2. Хеш состояния

`stateHash` — детерминированный хеш канонизированного снимка (сортировка ключей, без таймстемпов). Один и тот же seed + те же действия ⇒ тот же хеш.

### 6.3. Визуальный минимум сборки

Срез обязан запускаться с рендером 010 при наличии ассетов; при их отсутствии — headless с текстовым отчётом. Визуальный минимум: город, корабль, бой команд, катаклизм, сцена эпилога (SPEC-ART-080).

### 6.4. Бюджет производительности

| Метрика | Бюджет (mobile tier) |
|---|---|
| Средний тик мира | ≤ 8 мс |
| Максимальный тик | ≤ 25 мс |
| Кадр | ≤ 16.6 мс (60 fps target), деградация по 011 |
| Размер save | ≤ 2 МБ |
| Время загрузки save | ≤ 1.5 с |

### 6.5. Наблюдаемость

Счётчики по доменам (`tick.*`, `events.*`, `rng.*`, `save.*`), структурированные логи с `tick`, `scope`, `topic`; отчёт пишется в `artifacts/slice/run-<seed>.json` (локально, не в git).

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Прогон**

```
[idle] --start--> [running(step 1)]
[running(step n)] --step_ok--> [checkpoint?] --> [running(step n+1)]
[running(step 10)] --> [completed] + report
[running] --error--> [failed] + report(errors)
```

**(b) Контрольная точка**

```
[pending] --save--> [saved(hash)]
[saved] --load--> [restored] --verify_hash--> [ok|mismatch]
```

### 7.2. Sequence: полный забег

```
SliceRunner.start(seed)
  → bootstrap(): ContentRegistry (все паки), MechanicRegistry, EventBus, RNG, Memento
  → S1 Prologue → cp-1
  → S2 Trade → cp-2
  → S3 SeaBattle
  → S4 PartyDuel → cp-3
  → S5 Cataclysm
  → S6 Transformation → cp-4
  → S7 Narrative
  → S8 Ending → cp-5
  → S9 Epilogue
  → S10 Meta → cp-6
  → RunReport
```

### 7.3. Tick-контракт

Все `scope:*` вызываются срезом в порядке §5.4; домены не вызывают тик друг друга напрямую. Нарушение порядка — `SLICE_ORDER_VIOLATION`.

### 7.4. Детерминизм и сохранения

Один seed + одинаковые действия ⇒ одинаковые хеши на всех чекпоинтах. Загрузка чекпоинта и продолжение даёт тот же финальный хеш, что и непрерывный прогон (`SLICE-INV-04`).

### 7.5. Деградация

При превышении бюджета: отключаются VFX/анимации по 011/016, механики не меняются. При отсутствии ассетов — headless.

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 039
export interface ISliceRunner {
  start(config: SliceConfig): Promise<Result<RunReport, AppError>>;
  resumeFrom(checkpointId: string): Promise<Result<RunReport, AppError>>;
}

export interface ICheckpointRegistry {
  save(id: string): Result<{ readonly hash: string }, AppError>;
  load(id: string): Result<{ readonly hash: string }, AppError>;
  list(): readonly string[];
}
```

### 8.2. Адаптеры

`SliceRunner` (композиция), `CheckpointRegistry` (обёртка над `SaveLoadService` 006), `RunReportBuilder`, `HeadlessPresenter` (пустой презентер для тестов).

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `SLICE_ORDER_VIOLATION` | нарушен порядок `scope:*` | нет |
| `SLICE_CHECKPOINT_UNKNOWN` | чекпоинт не найден | да |
| `SLICE_HASH_MISMATCH` | хеш после load не совпал | нет |
| `SLICE_CONTENT_INVALID` | пак не прошёл `content:check` | нет |
| `SLICE_SEAM_MISSING` | обязательное событие/порт не сработали | нет |
| `SLICE_BUDGET_EXCEEDED` | превышен бюджет §6.4 | да (деградация) |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

Все доменные события и порты 001–038; `content:check` (038); `ci:validate` (008).

### 9.2. Эмитируемые

`slice.run_started`, `slice.step_completed`, `slice.checkpoint_saved`, `slice.run_completed`, `slice.run_failed`, `slice.budget_exceeded`.

### 9.3. Швы (обязательные для среза)

| Шов | Проверка |
|---|---|
| 032 ↔ 027 | репутация/ранения влияют на мораль и зарплаты |
| 034 ↔ 025 | `cataclysm.triggered` активирует веху |
| 033 ↔ 036 | финал ветки публикует факт эпилога |
| 035 ↔ 023 | смена локации раскрывает лор |
| 036 ↔ 037 | выбор порождает мета-угрозу |
| 038 ↔ 003 | контент-паки проходят проверку до загрузки |

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `RunSlice` | `SliceConfig` | `RunReport` | все | `slice.run_started`… |
| `SaveCheckpoint` | `{id}` | `{hash}` | Checkpoint | `slice.checkpoint_saved` |
| `ResumeCheckpoint` | `{id}` | `RunReport` | Checkpoint | `slice.run_completed` |
| `BuildRunReport` | `{run}` | `RunReport` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| bootstrap | контент невалиден | `SLICE_CONTENT_INVALID` | прогон не стартует |
| runner | порядок фаз | `SLICE_ORDER_VIOLATION` | fail-fast |
| checkpoint | хеш не совпал | `SLICE_HASH_MISMATCH` | прогон помечен failed |
| seam | обязательное событие не пришло | `SLICE_SEAM_MISSING` | шаг failed, отчёт |
| perf | бюджет превышен | `SLICE_BUDGET_EXCEEDED` | деградация + warning |

---

## 11. Критерии приёмки

### DEV-SPEC-039-R01 — Канонические швы
Требование: срез использует единственные канонические топики и порты; адаптеры только на границах.
Invariant: SLICE-INV-01…03.

- AC01: Given `cataclysm.activated` в контенте, When bootstrap среза, Then `SLICE_SEAM_MISSING` (канон — `cataclysm.triggered`).
- AC02: Given полный список швов §9.3, When `test/slice/seams.test.ts`, Then все 6 срабатывают.

### DEV-SPEC-039-R02 — Маршрут
Требование: 10 шагов §5.1 проходятся в порядке.
Invariant: SLICE-INV-03.

- AC03: Given `RunSlice` с seed, When прогон, Then все 10 шагов отмечены в отчёте.
- AC04: Given нарушенный порядок фаз, When прогон, Then `SLICE_ORDER_VIOLATION`.

### DEV-SPEC-039-R03 — Экономика и бой в срезе
Требование: торговля и бой команд реально меняют состояние (не заглушки).

- AC05: Given шаг 2, When `economy.trade_executed`, Then изменены деньги, товары и репутация.
- AC06: Given шаг 4, When бой, Then `combat.crew_died` влияет на отряд и отношения.

### DEV-SPEC-039-R04 — Контрольные точки
Требование: 6 чекпоинтов; save/load восстанавливает состояние.
Invariant: SLICE-INV-04.

- AC07: Given `cp-3`, When save→load→продолжение, Then финальный хеш равен непрерывному прогону.
- AC08: Given повреждённый снимок, When load, Then `SLICE_HASH_MISMATCH`.

### DEV-SPEC-039-R05 — Катаклизм → трансформация → эпилог
Требование: цепочка 025 → 033 → 034 → 036 → 037 проходит без ручных подстановок.

- AC09: Given шаги 5–10, When прогон, Then факты эпилога содержат ≥1 факт из каждого домена-источника.

### DEV-SPEC-039-R06 — Бюджет производительности
Требование: §6.4 соблюдается, деградация не меняет механику.

- AC10: Given прогон на mobile tier, When отчёт, Then `max_tick_ms ≤ 25` и `save_bytes ≤ 2 МБ`; иначе `SLICE_BUDGET_EXCEEDED`.
- AC11: Given деградация, When сравнение хешей, Then состояние идентично non-degraded прогону.

### DEV-SPEC-039-R07 — Детерминизм
Требование: одинаковый seed ⇒ одинаковые хеши; повторный прогон побайтово равен.

- AC12: Given два прогона с одним seed, When сравнение отчётов, Then хеши и события совпадают.

### DEV-SPEC-039-R08 — Отчёт и наблюдаемость
Требование: RunReport содержит шаги, хеши, тайминги, ошибки.

- AC13: Given прогон, When отчёт, Then `passed=true` и все секции заполнены.

### DEV-SPEC-039-R09 — Релизный чеклист
Требование: `content:check`, `ci:validate`, `t:check`, все доменные демо и срез — зелёные.

- AC14: Given релизный прогон §12.6, When выполнение, Then все проверки проходят.

---

## 12. Тест-план

12.1 Unit: T01 `stateHash`; T02 `SliceConfig`; T03 `CheckpointRegistry`.
12.2 Integration: T04 шаги 1–10; T05 швы §9.3.
12.3 Contract: T06 отчёт против схемы; T07 канонические топики.
12.4 Determinism: T08 `golden-run` (фиксированный seed и хеши).
12.5 E2E: T09 `demo:m34`; T10 load с каждого чекпоинта.
12.6 CI/релиз: T11 релизный чеклист: `content:check` → `ci:validate` → `t:check` → `demo:m23…m34`.

---

## 13. Производительность

### 13.1. Бюджет
§6.4. Замер на mobile tier и desktop tier; регрессия > 10% — блокер релиза.

### 13.2. LOD
VFX/анимации/аудио деградируют первыми (011/016); симуляция и сейвы — никогда.

### 13.3. Профилирование
Пошаговые тайминги в `RunReport`; профиль тика по `scope:*`.

---

## 14. Миграции

`slice-state.json` v1. При breaking-изменении любого доменного снимка — bump major и миграция чекпоинтов; срез обязан отклонять снимки несовместимой версии с понятной ошибкой.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Кто владеет адаптерами расхождений имён событий | R01 | arch | до M34 |
| OQ-02 | Достаточно ли демо предыдущих вех для золотого прогона | R09 | qa | до M34 |
| OQ-03 | Нужен ли интерактивный режим среза в первой сборке | R02 | design | до Wave 8 review |
| OQ-04 | Целевой tier для бюджета (mobile/desktop) как основной | R06 | perf | до M34 |

---

## 16. Что остаётся вне scope

- Новые механики и контент.
- Финальные ассеты, тексты, звук и полировка.
- Мобильный UX сверх бюджета 016.
- Маркетинговые и онбординговые сценарии.
- Публичный билд и дистрибуция.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M34) |
|---|---|---|---|---|
| все `SPEC-*-080/090/100` (швы) | R01 | AC01,AC02 | T05,T07 | M34-001 |
| GD-05/GD-06 | R02 | AC03,AC04 | T04,T06 | M34-002 |
| SPEC-FLEET-080, SPEC-ECON-090, SPEC-COMBAT-080 | R03 | AC05,AC06 | T04 | M34-003 |
| GD-09/GD-10 | R04 | AC07,AC08 | T03,T10 | M34-004 |
| SPEC-CATA-100, SPEC-TRANS-080, SPEC-EPI-080 | R05 | AC09 | T04 | M34-005 |
| GD-14 | R06 | AC10,AC11 | T09 | M34-006 |
| GD-09, SPEC-*-080 | R07 | AC12 | T08 | M34-007 |
| GD-17 | R08 | AC13 | T06 | M34-008 |
| GD-01…GD-17 (релиз) | R09 | AC14 | T11 | M34-009 |
| SPEC-ART-080 | §6.3 | AC13 | T09 | M34-010 |

Итог декомпозиции: 10 тикетов `TKT-M34-001…010`, демо `demo:m34`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5, §8); ✅ схемы/контракты (§6); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R09 → AC01…AC14; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
