# DEV-SPEC-031 v1.0 — «Party Battlefield & Combat Resolution»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 5 (Party, Companions & Combat), пятый блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-027`, `DEV-SPEC-028`, `DEV-SPEC-029`, `DEV-SPEC-030`
**Блокирует:** `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Бой команд на фоне дуэли»` (SPEC-COMBAT-002, 004, 005, 006, 009, 010, 011, 013, 014, 015, 016, 020, 025, 030…032, 040/041, 050/051, 060…063, 080)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (размер экипажа), `DEV-SPEC-027` (мораль, экипировка), `DEV-SPEC-028` (элитные юниты, реакции на потери), `DEV-SPEC-029` (урон, оркестратор), `DEV-SPEC-030` (дуэль), `DEV-SPEC-036` (факты эпилога)
**Порождает веху:** `TICKETS-M26`

---

## 0. Как читать эту спеку

Здесь — второе пространство боя (`party_battlefield`): состав отряда, мораль, потери, элитные юниты, асимметричное влияние дуэли и развязка (бегство/сдача/переговоры). Оркестрация — 029, дуэль — 030.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`PartyBattlefield`**: рантайм боя отрядов — два состава, мораль, потери, элитные юниты, активные эффекты окружения;
- **гибридный размер отряда**: базовое число от класса корабля (017) + модификаторы политики + модель «элитных» напарников (028);
- **асимметричное влияние**: дуэль → поле боя (сильное, через `duel_to_party_impact_policy`), поле боя → дуэль (слабое, через окружение и `party_to_duel_impact_policy`);
- **мораль поля боя и каскад потерь**: потеря бойца → мораль → риск бегства;
- **развязка**: rout / surrender / negotiation с проверяемыми условиями и событиями;
- **элитные юниты**: напарник на поле боя с уникальными механиками 028;
- **события** `combat.party_*`, `combat.rout_occurred`, `combat.surrender_occurred`, `combat.negotiation_started`;
- **RNG**: `rng.combat.party`, `rng.combat.resolution`;
- **CI**: schema/graph/gameplay lint для поля боя и развязки;
- **демо** `demo:m26`.

### 1.2. Что спецификация НЕ делает

- Не реализует дуэльные действия → `DEV-SPEC-030`.
- Не реализует оркестрацию фаз и модель урона → `DEV-SPEC-029`.
- Не определяет отношения и предательство напарников → `DEV-SPEC-028`.
- Не определяет морской бой и абордаж как перемещение → `DEV-SPEC-017/018`.
- Не генерирует эпилог → `DEV-SPEC-036`.
- Не содержит числовой баланс, тексты, арт/VFX/аудио.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-COMBAT-002` (нарративная развязка) | §5.4, §7.1, R05 | нет |
| `SPEC-COMBAT-004` (гибридный размер) | §5.1, §7.5, R02 | нет |
| `SPEC-COMBAT-005` (элитные напарники) | §5.2, R03 | нет |
| `SPEC-COMBAT-006` (асимметричное влияние) | §5.3, §7.2, R04 | нет |
| `SPEC-COMBAT-009` (урон) | §7.2 (вызов 029), R06 | нет |
| `SPEC-COMBAT-010` (механики) | §6.1, R07 | нет |
| `SPEC-COMBAT-011` (события) | §6.4, R08 | нет |
| `SPEC-COMBAT-013` (снимки) | §5.5, R09 | нет |
| `SPEC-COMBAT-014` (CI) | §12.6, R10 | нет |
| `SPEC-COMBAT-016` (доставка) | §6.3 | нет |
| `SPEC-COMBAT-020/025` (контракты, `CombatInstance`) | §5.1, §5.5 | нет |
| `SPEC-COMBAT-030/032` (события, мосты) | §6.4, §9.3 | нет |
| `SPEC-COMBAT-040/041` (детерминизм) | §7.4 | нет |
| `SPEC-COMBAT-050/051` (снимки) | §5.5, §14 | нет |
| `SPEC-COMBAT-060…063` (валидация) | §12.6 | нет |
| `SPEC-COMBAT-080` (срез) | §11 R11 | нет |

**Расхождения:** `combat.party_casualties_counted` не входит в ядро DESIGN; нормативно — расширение (OQ-01). Условия развязки в DESIGN описаны нарративно; здесь — декларативная политика (OQ-02).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-017` | класс корабля, базовый размер экипажа |
| `DEV-SPEC-027` | `PartyInstance`, мораль, экипировка |
| `DEV-SPEC-028` | элитные напарники, реакции на потери |
| `DEV-SPEC-029` | `CombatInstance`, `PartyState`, `DamageModel` |
| `DEV-SPEC-030` | исход дуэли, влияние на мораль |

### 2.2. Мягкие

`DEV-SPEC-020/022` (трофеи/награды), `DEV-SPEC-025/026` (окружение), `DEV-SPEC-036` (факты).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/battlefield/**`, `src/application/battlefield/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Party Battlefield | Пространство боя отрядов внутри `CombatInstance` |
| Crew Composition | Итоговый состав бойцов: база от корабля + модификаторы + элитные юниты |
| Elite Unit | Напарник, участвующий в поле боя как боец с механиками 028 |
| Battlefield Morale | Мораль отряда в бою, отдельная от глобальной морали отряда (027) |
| Rout | Бегство отряда |
| Surrender | Сдача отряда |
| Negotiation | Переговоры как исход боя |
| Asymmetric Influence | Дуэль влияет на поле боя сильнее, чем поле боя на дуэль |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/battlefield/` — `BattlefieldState`, `CrewComposition`, `ResolutionModel`, `MoraleModel`, ошибки, порты.
- `src/application/battlefield/` — use cases (такт, бегство, сдача, переговоры, влияние дуэли).
- `src/infrastructure/battlefield/` — трекеры, event-handlers, memento-секция.
- `content/battlefieldPolicy/`, `content/mechanics/battlefield.json`.

### 4.2. Файлы

```text
src/domain/battlefield/
  BattlefieldState.ts
  CrewComposition.ts
  ResolutionPolicy.ts
  BattlefieldErrors.ts
  BattlefieldMoraleModel.ts
  ResolutionModel.ts
  IEliteCompanionPort.ts
  IDuelOutcomePort.ts
src/application/battlefield/
  AdvanceBattlefieldTick.ts
  AttemptRout.ts
  OfferSurrender.ts
  StartNegotiation.ts
  ApplyDuelImpact.ts
  GetBattlefieldState.ts
src/infrastructure/battlefield/
  BattlefieldTracker.ts
  BattlefieldEventHandler.ts
  NullEliteCompanionPort.ts
  NullDuelOutcomePort.ts
content/schemas/battlefield-policy.json
content/battlefieldPolicy/core.json
content/mechanics/battlefield.json
tools/ci/stages/validate-battlefield-lint.ts
test/battlefield/…
scripts/demo-m26.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `IBattlefieldTracker` | `BattlefieldTracker` | singleton | `domain-init` |
| `IEliteCompanionPort` | адаптер к 028 | singleton | `integration` |
| `IDuelOutcomePort` | адаптер к 030 | singleton | `integration` |
| `IMementoSection('battlefield')` | секция в `combat-state.json` | singleton | `save-composition` |

---

## 5. Domain-модель

### 5.1. BattlefieldState

```ts
export interface SideState {
  readonly party_id: string;
  readonly crew_ids: readonly string[];
  readonly elite_ids: readonly string[];
  readonly morale: number;          // [0,1]
  readonly casualties: number;
  readonly routed: boolean;
  readonly surrendered: boolean;
}

export interface BattlefieldState {
  readonly sides: Readonly<Record<string, SideState>>;
  readonly active_effects: readonly { readonly id: string; readonly expires_tick: number }[];
  readonly round: number;
}
```

Инварианты: `BF-INV-01` — `morale ∈ [0,1]`; `BF-INV-02` — `elite_ids ⊆ crew_ids`; `BF-INV-03` — `routed` и `surrendered` взаимоисключающие.

### 5.2. CrewComposition

```ts
export interface CrewCompositionInput {
  readonly shipClassId: string;
  readonly modifiers: Readonly<Record<string, number>>;
  readonly eliteIds: readonly string[];
}

export interface CrewCompositionResult {
  readonly base_size: number;
  readonly total_size: number;
  readonly elite_count: number;
  readonly factors: readonly string[];
}
```

Правила: `base_size` — из `base_crew_size_policy_id` по классу корабля; `total_size = base_size + Σ modifiers`; элитные юниты входят в `total_size` и учитываются отдельно (SPEC-COMBAT-004).

### 5.3. Асимметричное влияние

```ts
export interface DuelImpact {
  readonly duel_outcome: 'captain_1_won' | 'captain_2_won' | 'draw';
  readonly morale_delta_by_side: Readonly<Record<string, number>>;
  readonly factors: readonly string[];
}
```

Правила: `duel_to_party_impact_policy` задаёт сильное влияние (поражение капитана → падение морали стороны); `party_to_duel_impact_policy` — слабое (окружение/отвлечение → модификатор к действиям дуэлянта). Сумма модификаторов ограничена политикой.

### 5.4. ResolutionPolicy

```ts
export type CombatOutcome = 'victory' | 'rout' | 'surrender' | 'negotiation' | 'draw';

export interface ResolutionPolicy {
  readonly id: string;
  readonly rout_condition: string;         // выражение над morale/casualties
  readonly surrender_condition: string;
  readonly negotiation_allowed: boolean;
  readonly negotiation_cost_policy_id?: string;
}
```

Инварианты: `BF-INV-04` — условия не пересекаются по приоритету (rout проверяется первым); `BF-INV-05` — `negotiation_allowed=false` ⇒ `negotiation_cost_policy_id` отсутствует.

### 5.5. Снимок

Секция `battlefield` внутри `combat-state.json` (029): `{ battlefield: BattlefieldState | null }`. Валидация — расширение `combat-instance.json` + BF-INV-01…03.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `battlefield-morale-tracker` | tracker | combat | 95 | `combat.party_tick_advanced`, `combat.crew_casualty_occurred`, `combat.duel_captain_defeated` | `combat.party_morale_changed`, `combat.rout_occurred` | `{ morale_by_side, casualties_by_side }` |
| `battlefield-casualty-tracker` | tracker | combat | 85 | `combat.crew_wounded`, `combat.crew_died` | `combat.party_casualties_counted` | `{ counted_ids }` |
| `battlefield-elite-resolver` | resolver | combat | 105 | `combat.party_action_executed` | `combat.party_damage_dealt` | `null` |
| `battlefield-resolution-resolver` | resolver | combat | 60 | `combat.party_morale_changed`, `combat.rout_occurred` | `combat.resolution_triggered`, `combat.surrender_occurred`, `combat.negotiation_started` | `null` |

### 6.2. JSON Schema

- `battlefield-policy.json` — `rout_condition`/`surrender_condition` required; `negotiation_allowed` boolean; if/then для `negotiation_cost_policy_id`.
- Расширение `combat-instance.json` — `battlefield` с `sides`, `morale` 0–1, `elite_ids` array.

### 6.3. Политики

`base_crew_size_policy_id`, `duel_to_party_impact_policy_id`, `party_to_duel_impact_policy_id`, `resolution_policy_id`, `narrative_delivery_policy_id`. Все числа — в контенте; политика развязки декларативна.

### 6.4. События

Эмиссия: `combat.party_tick_advanced`, `combat.party_action_executed`, `combat.party_damage_dealt`, `combat.party_morale_changed`, `combat.party_casualties_counted`, `combat.rout_occurred`, `combat.surrender_occurred`, `combat.negotiation_started`, `combat.resolution_triggered`.

Потребление: `combat.crew_wounded/died`, `combat.duel_captain_defeated`, `cataclysm.effect_applied`.

### 6.5. Контент первой волны

2 политики развязки (`narrative-resolution`, `harsh-resolution`), 2 политики размера экипажа (по 2 классам корабля), 2 политики влияния дуэли, 3 эффекта окружения.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Поле боя**

```
[formed] --party_tick_advanced--> [fighting]
[fighting] --casualty--> [fighting(morale-)]
[fighting] --morale < rout_threshold--> [routing] + emit rout_occurred
[fighting] --surrender_condition--> [surrendered] + emit surrender_occurred
[fighting] --negotiation_started--> [negotiating]
[routing|surrendered|negotiating] --resolution_triggered--> [resolved]
```

**(b) Влияние дуэли**

```
[duel_resolved] --duel_to_party_policy--> [morale_applied(side)]
[morale_applied] --recompute--> [rout?] 
```

### 7.2. Sequence: такт поля боя

```
AdvanceBattlefieldTick{instance_id}
  → battlefield-elite-resolver: действия элитных юнитов (механики 028)
  → DamageModel.apply(...) [029] → combat.party_damage_dealt
  → battlefield-casualty-tracker → combat.crew_wounded|died → party_casualties_counted
  → battlefield-morale-tracker: пересчёт морали → party_morale_changed
  → battlefield-resolution-resolver: проверка условий → resolution_triggered
```

### 7.3. Tick-контракт

Исполняется в фазе `scope:combat` (029) с priority §6.1; порядок сторон — стабильный по `party_id`. Пропуск такта не допускается для активного поля боя.

### 7.4. Идемпотентность и детерминизм

`rng.combat.party` (действия отряда), `rng.combat.resolution` (выбор исхода при равных условиях). Порядок потерь — по `(tick, seq, crew_id)`. Повторный такт с тем же `round` игнорируется.

### 7.5. Расчёт состава

```
compose(input, policy):
  base = policy.baseSize(input.shipClassId)
  mods = sum(policy.apply(m, base) for m in sorted(input.modifiers))
  total = base + mods
  if total < policy.minSize: total = policy.minSize
  elites = input.eliteIds ∩ allowed
  return {base_size: base, total_size: total, elite_count: elites.length, factors}
```

Сложность O(modifiers).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 031; impl: 028
export interface IEliteCompanionPort {
  elites(partyId: string): Result<readonly string[], AppError>;
  onEliteLoss(partyId: string, companionId: string): Result<void, AppError>;
}

// owner: 031; impl: 030
export interface IDuelOutcomePort {
  outcome(combatInstanceId: string): Result<'captain_1_won'|'captain_2_won'|'draw', AppError>;
}
```

### 8.2. Адаптеры

`NullEliteCompanionPort` (`Ok([])`), `NullDuelOutcomePort` (`Ok('draw')`), `BattlefieldMementoSection`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_BF_UNKNOWN` | поле боя не найдено | да |
| `DOMAIN_BF_ALREADY_RESOLVED` | такт после развязки | да |
| `DOMAIN_BF_RESOLUTION_INVALID` | условия политики некорректны | нет |
| `DOMAIN_BF_MORALE_RANGE` | мораль вне [0,1] | нет |
| `DOMAIN_BF_NEGOTIATION_FORBIDDEN` | переговоры запрещены политикой | да |
| `INFRA_BF_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`combat.crew_wounded`, `combat.crew_died` → потери/мораль; `combat.duel_captain_defeated` → влияние; `cataclysm.effect_applied` → эффекты окружения; `combat.tick_advanced` → такт.

### 9.2. Эмитируемые

Темы §6.4. Consumers: 029 (развязка), 027/028 (мораль, реакции на потери), 020/022 (трофеи), 036 (факты).

### 9.3. Мосты

`combat.duel_captain_defeated → combat.party_morale_changed` (029); `combat.rout_occurred → economy.loot_acquired` (через 029); `combat.ended → companion.reaction_triggered` (028); факты `epilogue.combat.party_routed|party_surrendered|companion_died_in_combat` → 036.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `AdvanceBattlefieldTick` | `{instance_id}` | `{morale, casualties}` | Elite | `party_tick_advanced`, `party_morale_changed` |
| `AttemptRout` | `{instance_id, party_id}` | `{routed}` | — | `rout_occurred` |
| `OfferSurrender` | `{instance_id, party_id}` | `{accepted}` | — | `surrender_occurred` |
| `StartNegotiation` | `{instance_id, party_id}` | `{started}` | — | `negotiation_started` |
| `ApplyDuelImpact` | `{instance_id, duel_outcome}` | `{deltas}` | DuelOutcome | `party_morale_changed` |
| `GetBattlefieldState` | `{instance_id}` | `BattlefieldState` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_BF_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | мораль вне диапазона | `DOMAIN_BF_MORALE_RANGE` | `Err`, состояние не меняется |
| domain | некорректная политика | `DOMAIN_BF_RESOLUTION_INVALID` | падение загрузки контента |
| application | такт после развязки | `DOMAIN_BF_ALREADY_RESOLVED` | `Err` |
| application | переговоры запрещены | `DOMAIN_BF_NEGOTIATION_FORBIDDEN` | `Err` пользователю |
| save | снимок невалиден | `INFRA_BF_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-031-R01 — Состояние поля боя
Требование: две стороны, мораль, потери, флаги; элитные входят в состав.
Invariant: BF-INV-01…03.

- AC01: Given `BattlefieldState` с `elite_ids ⊄ crew_ids`, When валидация, Then `Err`.
- AC02: Given `routed=true` и `surrendered=true`, When валидация, Then `Err`.

### DEV-SPEC-031-R02 — Гибридный размер отряда
Требование: состав = базовый размер корабля + модификаторы, с минимумом политики.
Invariant: —

- AC03: Given base=12 и модификатор +2, When `compose`, Then `total_size=14` и `factors` содержит модификатор.
- AC04: Given отрицательные модификаторы ниже минимума, When `compose`, Then `total_size=policy.minSize`.

### DEV-SPEC-031-R03 — Элитные юниты
Требование: элитный напарник действует на поле боя и его потеря отражается в 028.
Invariant: BF-INV-02.

- AC05: Given элитный юнит в составе, When такт, Then `combat.party_action_executed{elite:true}`.
- AC06: Given смерть элитного юнита, When такт, Then `onEliteLoss` и `party.companion_died`.

### DEV-SPEC-031-R04 — Асимметричное влияние
Требование: поражение капитана влияет на мораль стороны; поле боя влияет на дуэль только через политику и ограниченно.
Invariant: —

- AC07: Given `duel_captain_defeated` для стороны 1, When `ApplyDuelImpact`, Then мораль стороны 1 падает на величину политики и `party_morale_changed`.
- AC08: Given суммарный модификатор поля боя на дуэль выше лимита политики, When пересчёт, Then модификатор клэмпится.

### DEV-SPEC-031-R05 — Развязка
Требование: rout/surrender/negotiation с проверяемыми условиями; rout проверяется первым.
Invariant: BF-INV-04/05.

- AC09: Given мораль ниже `rout_threshold`, When такт, Then `combat.rout_occurred` и `resolution_triggered{outcome:'rout'}`.
- AC10: Given `negotiation_allowed=false`, When `StartNegotiation`, Then `Err(DOMAIN_BF_NEGOTIATION_FORBIDDEN)`.
- AC11: Given условия rout и surrender выполнены одновременно, When такт, Then исход `rout` (приоритет).

### DEV-SPEC-031-R06 — Урон и потери
Требование: урон применяется через 029; потери учитываются ровно один раз.

- AC12: Given 3 ранения одного бойца, When такты, Then `party_casualties_counted` учитывает его один раз.
- AC13: Given смерть бойца, When такт, Then `combat.crew_died` и `party_casualties_counted`.

### DEV-SPEC-031-R07 — Механики
Требование: контракт 004; `role_tags ∋ 'combat'`; tracker персистит.

- AC14: Given `battlefield-morale-tracker`, When `--stage=mechanics`, Then `persisted=true`.

### DEV-SPEC-031-R08 — События
Требование: темы §6.4 эмитятся по одному разу на переход.

- AC15: Given один переход в rout, When такт, Then ровно одно `rout_occurred`.

### DEV-SPEC-031-R09 — Сохранения
Требование: снимок поля боя входит в снимок боя и восстанавливается.

- AC16: Given save→load посреди боя, When продолжение, Then `BattlefieldState` deep-equal.

### DEV-SPEC-031-R10 — CI
Требование: lint для политики развязки и состава.

- AC17: Given политика с пересекающимися условиями, When gameplay lint, Then ошибка.

### DEV-SPEC-031-R11 — Вертикальный срез
Требование: сценарий SPEC-COMBAT-080 воспроизводится как `demo:m26`.

- AC18: Given `bun run demo:m26`, When завершение, Then `Ok`: состав → такт → потери → влияние дуэли → rout → save/load → идентичный исход.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `CrewComposition`; T03 `BattlefieldMoraleModel`; T04 `ResolutionModel` (приоритеты).
12.2 Integration: T05 use cases + recording bus; T06 влияние 030→031; T07 потери 029→031→028.
12.3 Contract: T08 политики против схем; T09 события.
12.4 Determinism: T10 save/load + RNG-изоляция.
12.5 E2E: T11 `demo:m26`.
12.6 CI: T12 `validate-battlefield-lint.ts`.

---

## 13. Производительность

### 13.1. Бюджет
Такт — O(|crew| + |effects|); мораль — O(sides). В общем бюджете `scope:combat`.

### 13.2. LOD
При перегрузке: действия неэлитных бойцов батчатся; потери и мораль — никогда.

### 13.3. Профилирование
Счётчики `combat.party_*`; сценарий: 2×16 бойцов × 200 тактов.

---

## 14. Миграции

Секция `battlefield` в `combat-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | `combat.party_casualties_counted` — ядро или расширение | R08 | design | до M26 |
| OQ-02 | Формат условий развязки (DSL или теги) | R05 | arch | до M26 |
| OQ-03 | Кто владеет `combat.order_issued`: 028, 029 или 031 | R03 | arch | до M26 |

---

## 16. Что остаётся вне scope

- Дуэльные действия → `DEV-SPEC-030`.
- Оркестрация и модель урона → `DEV-SPEC-029`.
- Отношения и предательство → `DEV-SPEC-028`.
- Морской бой → `DEV-SPEC-017/018`.
- Эпилог → `DEV-SPEC-036`.
- Баланс, тексты, арт/VFX/аудио.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M26) |
|---|---|---|---|---|
| SPEC-COMBAT-004/005/025 | R01 | AC01,AC02 | T01 | M26-001 |
| SPEC-COMBAT-004 | R02 | AC03,AC04 | T02 | M26-002 |
| SPEC-COMBAT-005 | R03 | AC05,AC06 | T05,T07 | M26-003 |
| SPEC-COMBAT-006 | R04 | AC07,AC08 | T06 | M26-004 |
| SPEC-COMBAT-002/016 | R05 | AC09…AC11 | T04,T05 | M26-005 |
| SPEC-COMBAT-009 | R06 | AC12,AC13 | T07 | M26-006 |
| SPEC-COMBAT-010 | R07 | AC14 | T09 | M26-007 |
| SPEC-COMBAT-011/030 | R08 | AC15 | T09 | M26-007 |
| SPEC-COMBAT-013/050/051 | R09 | AC16 | T10 | M26-008 |
| SPEC-COMBAT-060…063 | R10 | AC17 | T12 | M26-008 |
| SPEC-COMBAT-080 | R11 | AC18 | T11 | M26-009 |

Итог декомпозиции: 9 тикетов `TKT-M26-001…009`, демо `demo:m26`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R11 → AC01…AC18; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
