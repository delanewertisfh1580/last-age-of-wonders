# DEV-SPEC-032 v1.0 — «Captain Domain (stats, skills, aging, pension, reputation, oaths)»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 6 (Captain, Narrative, Hidden Branches), первый блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-027`
**Блокирует:** `DEV-SPEC-033`, `DEV-SPEC-034`, `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `INTENT` (INT-21, INT-22, INT-24), `DESIGN v1.0 — «Сюжет и лор»` (SPEC-LORE-002 — предыстория капитана), `DESIGN v1.0 — «Менеджмент отряда»` (SPEC-PARTY-004), `GENERAL DESIGN v1.0` (GD-07, GD-09)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (корабль), `DEV-SPEC-027` (отряд, `ICaptainStatePort`), `DEV-SPEC-028` (отношения напарников), `DEV-SPEC-029/030` (капитан как дуэлянт), `DEV-SPEC-033` (трансформация), `DEV-SPEC-034` (предыстория, клятвы в нарративе), `DEV-SPEC-036` (факты эпилога)
**Порождает веху:** `TICKETS-M27`

---

## 0. Как читать эту спеку

Спека определяет **капитана как сущность**: статы, навыки, старение, пенсию, репутацию и клятвы. До этой спеки капитан присутствовал только как `captain_id`-ref (027). Спека реализует owner-контракт `ICaptainStatePort`, объявленный в 027.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`CaptainDefinition`**: базовые статы, рост, политики старения/пенсии/репутации/клятв;
- **`CaptainInstance`**: рантайм капитана — статы, навыки, возраст, репутация по фракциям, клятвы, ранения, флаг пенсии;
- **модель старения** (INT-24): возрастной тик, деградация характеристик по политике, порог пенсии как штатное завершение карьеры;
- **модель репутации**: пофракционная шкала, источники изменений (бой, торговля, катаклизмы, клятвы), влияние на 027/028;
- **клятвы**: `OathDefinition` и рантайм (дана/нарушена), последствия для репутации и напарников;
- **предыстория**: `CaptainBackgroundDefinition` — стартовые условия, клятвы, зацепки напарников (исполнение выбора — 034);
- **события** `captain.*` (10 тем);
- **сохранения**: секция `captain` в save-снимке;
- **CI**: schema/graph/gameplay lint;
- **демо** `demo:m27`.

### 1.2. Что спецификация НЕ делает

- Не реализует отряд, экипировку и мораль → `DEV-SPEC-027`.
- Не реализует отношения и предательство напарников → `DEV-SPEC-028`.
- Не реализует дуэльные действия → `DEV-SPEC-030` (здесь — статы, которые он читает).
- Не реализует скрытые ветки трансформации → `DEV-SPEC-033`.
- Не реализует диалоги, пролог и выбор предыстории как сцену → `DEV-SPEC-034`.
- Не генерирует эпилог → `DEV-SPEC-036`.
- Не содержит числовой баланс, тексты, арт/VFX/аудио.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `INT-24` (старение и пенсия) | §5.3, §7.1, R03 | нет |
| `INT-21` (правила едины) | §5.1, R01 | нет |
| `INT-22` (состояние влияет на нарратив) | §6.4, R07 | нет |
| `SPEC-LORE-002` (предыстория капитана) | §5.4, R05 | частично: выбор сцены — 034 |
| `SPEC-PARTY-004` (капитан + пул) | §5.1 | нет |
| `GD-07/GD-08` (контент как данные) | §5, §6 | нет |
| `GD-09` (Memento) | §5.5 | нет |

**Расхождения:** DESIGN не фиксирует формулу деградации статов — она полностью политика (OQ-01). Клятвы упоминаются в SPEC-LORE-002, но не имеют контракта — контракт вводится здесь (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-027` | `ICaptainStatePort` (owner 027, impl здесь), `PartyInstance` |

### 2.2. Мягкие

`DEV-SPEC-017` (класс корабля), `DEV-SPEC-028` (отношения), `DEV-SPEC-029/030` (ранения в бою), `DEV-SPEC-023` (фракции/города для репутации), `DEV-SPEC-033` (трансформация), `DEV-SPEC-034` (предыстория), `DEV-SPEC-036` (факты).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/captain/**`, `src/application/captain/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Captain Instance | Рантайм-сущность капитана: статы, возраст, репутация, клятвы |
| Aging Tick | Возрастное продвижение по календарю тактов |
| Stat Degradation | Снижение характеристик по политике старения |
| Pension | Штатное завершение карьеры по достижении порога |
| Reputation | Пофракционная шкала отношения к капитану |
| Oath | Клятва с условиями, последствиями нарушения и фактом эпилога |
| Background | Предыстория капитана: стартовые условия, клятвы, зацепки |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/captain/` — определения, рантайм, модели (`AgingModel`, `ReputationModel`, `OathModel`), ошибки, порты.
- `src/application/captain/` — use cases.
- `src/infrastructure/captain/` — store, трекеры, event-handlers, memento.
- `content/{captain,oath,captainBackground,captainPolicy}/`, `content/mechanics/captain.json`.
- `tools/ci/stages/validate-captain-graph.ts`, `validate-captain-lint.ts`.

### 4.2. Файлы

```text
src/domain/captain/
  CaptainDefinition.ts
  CaptainInstance.ts
  OathDefinition.ts
  CaptainBackgroundDefinition.ts
  CaptainErrors.ts
  AgingModel.ts
  ReputationModel.ts
  OathModel.ts
  IPartyCaptainPort.ts
  ICombatWoundPort.ts
src/application/captain/
  CreateCaptain.ts
  AdvanceCaptainAge.ts
  ChangeReputation.ts
  SwearOath.ts
  BreakOath.ts
  RetireCaptain.ts
  GetCaptainState.ts
src/infrastructure/captain/
  CaptainStore.ts
  CaptainTickHandlers.ts
  CaptainEventHandler.ts
  CaptainStateMementoProvider.ts
  CaptainStateAdapter.ts          // реализация ICaptainStatePort (027)
  NullCombatWoundPort.ts
content/schemas/
  captain-definition.json
  captain-instance.json
  oath-definition.json
  captain-background.json
content/captain/core.json
content/oath/core.json
content/captainBackground/core.json
content/mechanics/captain.json
tools/ci/stages/validate-captain-graph.ts
tools/ci/stages/validate-captain-lint.ts
test/captain/…
scripts/demo-m27.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `ICaptainStore` | `CaptainStore` | singleton | `domain-init` |
| `ICaptainStatePort` (027) | `CaptainStateAdapter` | singleton | `integration` |
| `IPartyCaptainPort` | адаптер к 027 | singleton | `integration` |
| `ICombatWoundPort` | `NullCombatWoundPort` (замена в 029) | singleton | `integration` |
| `IMementoProvider('captain')` | `CaptainStateMementoProvider` | singleton | `save-composition` |
| `captain-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. CaptainDefinition

```ts
export interface CaptainDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly base_stats: Readonly<Record<string, number>>;      // hp, strength, agility, endurance, will
  readonly growth_policy_id: string;
  readonly aging_policy_id: string;
  readonly pension_policy_id: string;
  readonly reputation_policy_id: string;
  readonly oath_policy_ids: readonly string[];
  readonly background_policy_ids: readonly string[];
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `CAPTAIN-INV-01` — `base_stats` содержит минимум `hp,strength,agility,endurance,will`; `CAPTAIN-INV-02` — все policy-id разрешаются в контент; `CAPTAIN-INV-03` — определение не хранит рантайм.

### 5.2. CaptainInstance

```ts
export interface CaptainOathRuntime {
  readonly oath_id: string;
  readonly sworn_tick: number;
  readonly status: 'active' | 'fulfilled' | 'broken';
}

export interface CaptainInstance {
  readonly captain_id: string;
  readonly definition_id: string;
  readonly background_id: string;
  readonly stats: Readonly<Record<string, number>>;
  readonly skills: Readonly<Record<string, { readonly uses: number; readonly level: number }>>;
  readonly age_ticks: number;
  readonly reputation: Readonly<Record<string, number>>;   // factionId → [-100,100]
  readonly oaths: readonly CaptainOathRuntime[];
  readonly wounds: readonly string[];
  readonly retired: boolean;
  readonly tracker_states: Readonly<Record<string, unknown>>;
}
```

Инварианты: `CAPTAIN-INV-04` — `stats[k] ≥ 0`; `CAPTAIN-INV-05` — `reputation ∈ [-100,100]`; `CAPTAIN-INV-06` — `oaths` без дублей `oath_id`; `CAPTAIN-INV-07` — `retired=true` терминально (не сбрасывается).

### 5.3. Старение и пенсия

```ts
export interface AgingPolicy {
  readonly id: string;
  readonly age_step_ticks: number;
  readonly stat_decay: Readonly<Record<string, number>>;   // на шаг
  readonly decay_start_age_step: number;
  readonly pension_age_step: number;
  readonly pension_morale_effect: number;
}
```

Правила: возраст растёт на `age_step_ticks`; после `decay_start_age_step` каждый шаг уменьшает статы на `stat_decay` (clamp ≥ policy.min); при `pension_age_step` — `RetireCaptain` (INT-24).

### 5.4. Предыстория

```ts
export interface CaptainBackgroundDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly start_resources: Readonly<Record<string, number>>;
  readonly start_faction_relations: Readonly<Record<string, number>>;
  readonly oath_ids: readonly string[];
  readonly acquisition_hook_ids: readonly string[];
  readonly narrative_hook_ids: readonly string[];
  readonly narrative_tone_key: string;
  readonly start_scene_key: string;
}
```

Инварианты: `CAPTAIN-INV-08` — `oath_ids` и `acquisition_hook_ids` разрешаются (027/028); `CAPTAIN-INV-09` — выбор фона фиксируется один раз (`background_id` неизменяем).

### 5.5. Снимок

`CaptainSnapshot` = сериализуемый `CaptainInstance` с `$id: captain-state.json`; провайдер `domainId: 'captain'`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `captain-aging-tracker` | tracker | captain | 210 | `world.tick_advanced` | `captain.age_advanced`, `captain.stat_degraded`, `captain.retired` | `{ last_age_tick }` |
| `captain-reputation-tracker` | tracker | captain | 220 | `combat.ended`, `economy.trade_executed`, `cataclysm.political_impact_applied`, `world.ruler_changed` | `captain.reputation_changed` | `{ last_tick }` |
| `captain-oath-resolver` | resolver | captain | 230 | `narrative.choice_made`, `world.event_occurred`, `combat.ended` | `captain.oath_sworn`, `captain.oath_broken` | `null` |
| `captain-wound-tracker` | tracker | captain | 200 | `combat.duel_captain_wounded`, `cataclysm.effect_applied` | `captain.wounded`, `captain.recovered` | `{ wound_ids }` |

### 6.2. JSON Schema

- `captain-definition.json` — `base_stats` required 5 ключей ≥0; `*_policy_id` required; `additionalProperties: false`.
- `captain-instance.json` — `stats` ≥0; `reputation` значения [-100,100]; `age_ticks` ≥0; `retired` boolean; `oaths` items required [oath_id, sworn_tick, status].
- `oath-definition.json` — `conditions` minItems 1; `breach_effects` minItems 1; `epilogue_fact` required.
- `captain-background.json` — `start_resources`, `start_faction_relations`, `oath_ids`, `acquisition_hook_ids` required.

### 6.3. Политики

`aging_policy_id`, `pension_policy_id`, `reputation_policy_id`, `growth_policy_id`, `oath_policy_ids`. Все числа (шаг возраста, величина деградации, порог пенсии, веса репутации) — в контенте.

### 6.4. События

`captain.created`, `captain.age_advanced`, `captain.stat_degraded`, `captain.retired`, `captain.reputation_changed`, `captain.oath_sworn`, `captain.oath_broken`, `captain.wounded`, `captain.recovered`, `captain.background_selected`.

Фракционные: `captain.industrial-steam.*`, `captain.ancient-arcane.*`, `captain.necromantic-corpse.*`, `captain.living-artifact.*`.

### 6.5. Контент первой волны

3 предыстории (`background-scholar`, `background-smuggler`, `background-officer`), 6 клятв, 1 политика старения, 1 политика пенсии, 1 политика репутации.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Возраст и пенсия**

```
[active] --age_step--> [active(age+1)]
[active(age ≥ decay_start)] --age_step--> [degraded(stats-)]
[active(age ≥ pension_age)] --age_step--> [retired] + emit captain.retired
[retired] --> [terminal]
```

**(b) Клятва**

```
[none] --oath_sworn--> [active]
[active] --condition_met--> [fulfilled] + fact
[active] --breach--> [broken] + reputation penalty + fact
[fulfilled|broken] --> [terminal]
```

### 7.2. Sequence: выбор предыстории

```
CreateCaptain{definition_id, background_id}
  → CaptainDefinition + CaptainBackgroundDefinition
  → stats = base_stats (рост — политикой)
  → reputation = start_faction_relations
  → oaths = oath_ids → CaptainOathRuntime(active)
  → emit captain.created, captain.background_selected
  → IEpilogueFactPort.publish('epilogue.captain.background')
```

### 7.3. Tick-контракт

`scope:captain` идёт после `scope:world` и до `scope:party`: отряд и бой видят актуальные статы и репутацию того же такта. Aging-трекер обрабатывает шаг только при достижении `age_step_ticks` (детерминированный догон при пропуске).

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.captain.growth` (прирост навыков при равных условиях), `rng.captain.reputation` (шум слухов о капитане). Запрет `Math.random`/`Date.now`. Повторный возрастной шаг с тем же `last_age_tick` игнорируется.

### 7.5. Деградация и репутация

```
applyAging(instance, policy):
  if instance.age_ticks % policy.age_step_ticks != 0: return unchanged
  if instance.age_ticks / step < policy.decay_start_age_step: return unchanged
  for stat in sorted(policy.stat_decay):
      stats[stat] = max(policy.min[stat], stats[stat] - policy.stat_decay[stat])
  return {stats}

applyReputation(instance, deltas, policy):
  for faction in sorted(deltas):
      value = clamp(instance.reputation[faction] + deltas[faction] * policy.weight(faction), -100, 100)
```

Сложность O(stats) / O(factions).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 027; impl: 032 (реализует контракт 027)
export interface ICaptainStatePort {
  reputationModifier(captainId: string): Result<number, AppError>;
  isPresent(): Result<boolean, AppError>;
}

// owner: 032; impl: 027
export interface IPartyCaptainPort {
  captainId(): Result<string, AppError>;
  rosterSize(captainId: string): Result<number, AppError>;
}

// owner: 032; impl: 029
export interface ICombatWoundPort {
  woundsFor(captainId: string): Result<readonly string[], AppError>;
}
```

### 8.2. Адаптеры

`CaptainStateAdapter` (реализация `ICaptainStatePort`: `reputationModifier` = средневзвешенная репутация по политике; `isPresent` = `!retired`), `NullCombatWoundPort` (`Ok([])`), `CaptainStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_CAPTAIN_UNKNOWN` | капитан не найден | да |
| `DOMAIN_CAPTAIN_RETIRED` | действие после пенсии | да |
| `DOMAIN_CAPTAIN_OATH_UNKNOWN` | клятва не найдена | да |
| `DOMAIN_CAPTAIN_OATH_VIOLATION` | нарушение без условий | да |
| `DOMAIN_CAPTAIN_REPUTATION_RANGE` | значение вне [-100,100] | нет |
| `DOMAIN_CAPTAIN_BACKGROUND_LOCKED` | повторный выбор фона | да |
| `INFRA_CAPTAIN_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`world.tick_advanced` (возраст), `combat.ended` (репутация), `combat.duel_captain_wounded` (ранения), `economy.trade_executed` (репутация), `cataclysm.political_impact_applied`, `world.ruler_changed`, `narrative.choice_made`.

### 9.2. Эмитируемые

Темы §6.4. Consumers: 027 (модификатор морали/зарплат), 028 (отношения), 029/030 (статы в бою), 033 (трансформация), 034 (нарратив), 036 (факты).

### 9.3. Мосты

`captain.retired → 036 (epilogue.captain.retired)`; `captain.oath_broken → 028 (реакции напарников)`; `captain.wounded → 027 (штрафы)`; `captain.reputation_changed → 023 (политические последствия)`, `→ 020 (цены/доступ)`.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `CreateCaptain` | `{definition_id, background_id}` | `{captain_id}` | Content, Party | `captain.created`, `background_selected` |
| `AdvanceCaptainAge` | `{captain_id}` | `{age_ticks, stats}` | — | `age_advanced`, `stat_degraded`, `retired` |
| `ChangeReputation` | `{captain_id, faction_id, delta, source}` | `{value}` | — | `reputation_changed` |
| `SwearOath` | `{captain_id, oath_id}` | `{status}` | — | `oath_sworn` |
| `BreakOath` | `{captain_id, oath_id, reason}` | `{penalties}` | Party | `oath_broken` |
| `RetireCaptain` | `{captain_id, reason}` | `{retired}` | Party | `retired` |
| `GetCaptainState` | `{captain_id}` | `CaptainInstance` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_CAPTAIN_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | значение репутации вне диапазона | `DOMAIN_CAPTAIN_REPUTATION_RANGE` | `Err`, значение не меняется |
| application | действие после пенсии | `DOMAIN_CAPTAIN_RETIRED` | `Err` |
| application | повторный выбор фона | `DOMAIN_CAPTAIN_BACKGROUND_LOCKED` | `Err` |
| save | снимок невалиден | `INFRA_CAPTAIN_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-032-R01 — Контракт капитана
Требование: капитан — сущность со статами, навыками и политиками; правила едины для всех (INT-21).
Invariant: CAPTAIN-INV-01…03.

- AC01: Given `CaptainDefinition` без `will`, When `ci:validate --stage=schemas`, Then ошибка.
- AC02: Given валидное определение, When `CreateCaptain`, Then `captain.created` и статы = `base_stats`.

### DEV-SPEC-032-R02 — Рантайм и инварианты
Требование: статы ≥0, репутация в диапазоне, клятвы без дублей, пенсия терминальна.
Invariant: CAPTAIN-INV-04…07.

- AC03: Given `reputation=-150` в снимке, When загрузка, Then `Err(INFRA_CAPTAIN_SCHEMA_INVALID)`.
- AC04: Given `retired=true`, When `RetireCaptain` повторно, Then состояние не меняется.

### DEV-SPEC-032-R03 — Старение и пенсия
Требование: возраст растёт шагами; после порога статы деградируют; на пороге пенсии — штатное завершение.
Invariant: —

- AC05: Given `age_ticks` достигает `decay_start`, When шаг, Then `captain.stat_degraded` и статы уменьшены на политику.
- AC06: Given `age_ticks` достигает `pension_age_step`, When шаг, Then `captain.retired` и `isPresent() = false`.

### DEV-SPEC-032-R04 — Репутация
Требование: пофракционная шкала; изменения только через use case/механику; влияние на 027/028.
Invariant: CAPTAIN-INV-05.

- AC07: Given `reputation[faction]=95` и `delta=+20`, When `ChangeReputation`, Then значение `100` (clamp) и `captain.reputation_changed`.
- AC08: Given репутация изменилась, When `reputationModifier`, Then возвращается значение по политике (не 0).

### DEV-SPEC-032-R05 — Предыстория
Требование: фон задаёт стартовые ресурсы, отношения, клятвы и зацепки; выбор фиксируется один раз.
Invariant: CAPTAIN-INV-08/09.

- AC09: Given `background-officer`, When `CreateCaptain`, Then оффы и зацепки напарников созданы.
- AC10: Given фон уже выбран, When повторный выбор, Then `Err(DOMAIN_CAPTAIN_BACKGROUND_LOCKED)`.

### DEV-SPEC-032-R06 — Клятвы
Требование: клятва имеет условия, последствия нарушения и факт эпилога.
Invariant: CAPTAIN-INV-06.

- AC11: Given `SwearOath`, When вызов, Then `captain.oath_sworn` и `status='active'`.
- AC12: Given нарушение условия, When `BreakOath`, Then `captain.oath_broken`, штраф репутации и факт в `IEpilogueFactPort`.

### DEV-SPEC-032-R07 — Событийная модель
Требование: 10 тем зарегистрированы; фракционные namespace'ы без коллизий.

- AC13: Given перечень §6.4, When `--stage=events`, Then все темы присутствуют.

### DEV-SPEC-032-R08 — Сохранения
Требование: снимок капитана валидируется и восстанавливается.

- AC14: Given save→load, When сравнение, Then deep-equal и идентичное продолжение 10 тактов.

### DEV-SPEC-032-R09 — CI
Требование: schema + graph + lint.

- AC15: Given negative-fixtures (нет политики старения, клятва без последствий, фон без зацепок), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `AgingModel`; T03 `ReputationModel`; T04 `OathModel`.
12.2 Integration: T05 use cases + recording bus; T06 `ICaptainStatePort` в 027.
12.3 Contract: T07 определения против схем; T08 события.
12.4 Determinism: T09 save/load + RNG-изоляция.
12.5 E2E: T10 `demo:m27`.
12.6 CI: T11 graph; T12 lint.

---

## 13. Производительность

### 13.1. Бюджет
Возраст — O(stats) на шаг; репутация — O(factions). Фаза `scope:captain` в общем tick budget.

### 13.2. LOD
Возрастные шаги батчатся с детерминированным догоном; пенсия и клятвы — никогда.

### 13.3. Профилирование
Счётчики `captain.*`; сценарий: 5000 тактов старения.

---

## 14. Миграции

`captain-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Формула деградации: линейная или по таблице возрастов | R03 | balance | до M27 |
| OQ-02 | Клятвы: отдельный ContentKind или запись в `captainPolicy` | R06 | arch | до M27 |
| OQ-03 | Влияние пенсии на отряд: роспуск или наследование | R03 | design | до Wave 6 review |

---

## 16. Что остаётся вне scope

- Отряд и экипировка → `DEV-SPEC-027`.
- Отношения напарников → `DEV-SPEC-028`.
- Дуэльные действия → `DEV-SPEC-030`.
- Трансформация → `DEV-SPEC-033`.
- Диалоги и пролог → `DEV-SPEC-034`.
- Эпилог → `DEV-SPEC-036`.
- Баланс, тексты, арт/VFX/аудио.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M27) |
|---|---|---|---|---|
| INT-21, SPEC-PARTY-004 | R01 | AC01,AC02 | T01,T05 | M27-001 |
| GD-09 | R02 | AC03,AC04 | T01,T09 | M27-002 |
| INT-24 | R03 | AC05,AC06 | T02,T05 | M27-003 |
| INT-22 | R04 | AC07,AC08 | T03,T06 | M27-004 |
| SPEC-LORE-002 | R05 | AC09,AC10 | T05 | M27-005 |
| SPEC-LORE-002 | R06 | AC11,AC12 | T04,T05 | M27-006 |
| SPEC-LORE-014 | R07 | AC13 | T08 | M27-007 |
| SPEC-LORE-016 | R08 | AC14 | T09 | M27-008 |
| SPEC-LORE-017 | R09 | AC15 | T11,T12 | M27-008 |
| SPEC-COMBAT-080 (интеграция) | — | AC02,AC08 | T06,T10 | M27-009 |

Итог декомпозиции: 9 тикетов `TKT-M27-001…009`, демо `demo:m27`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R09 → AC01…AC15; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
