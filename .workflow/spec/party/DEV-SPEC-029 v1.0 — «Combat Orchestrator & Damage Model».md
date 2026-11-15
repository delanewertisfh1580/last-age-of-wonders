# DEV-SPEC-029 v1.0 — «Combat Orchestrator & Damage Model»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 5 (Party, Companions & Combat), третий блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-017`, `DEV-SPEC-027`, `DEV-SPEC-028`
**Блокирует:** `DEV-SPEC-030`, `DEV-SPEC-031`, `DEV-SPEC-036`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Бой команд на фоне дуэли»` (SPEC-COMBAT-001, 002, 004, 005, 008, 009, 010, 011, 012, 013, 014, 015, 016, 020…025, 030…032, 040/041, 050/051, 060…063, 070/071, 080)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (морской бой, `combat.*`-ядро), `DEV-SPEC-027` (отряд, мораль), `DEV-SPEC-028` (приказы, потери), `DEV-SPEC-030` (дуэль), `DEV-SPEC-031` (поле боя отряда), `DEV-SPEC-036` (факты эпилога)
**Порождает веху:** `TICKETS-M24`

---

## 0. Как читать эту спеку

Секции 1–17 фиксированы шаблоном. Спека задаёт **оркестрацию боя и модель урона**; механика дуэли — 030, механика поля боя отряда и развязки — 031. `combat.*`-ядро событий частично регистрируется в 017 (морской бой); 029 расширяет его до полного перечня SPEC-COMBAT-030.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`CombatDefinition`**: тип боя, два пространства (`duel_arena`, `party_battlefield`), политики перехода, влияния, урона и нарративной доставки;
- **`CombatInstance`**: рантайм активного боя — участники, пространства, состояние, трекеры, журнал;
- **оркестратор `CombatOrchestrator`**: старт боя, такт, переходы между пространствами, завершение, разрешение;
- **многослойная модель урона** (`DamageModel`): HP → раны (`wound`) → травмы (`trauma`) → смерть, с детерминированным расчётом и записью факторов;
- **`CrewMemberDefinition`** и рантайм бойцов: статы, навыки, экипировка, перманентная смерть;
- **гибридный размер отряда**: базовый размер от корабля + модификаторы + модель «элитных» напарников;
- **событийное ядро** `combat.*` (22 темы) + фракционные namespace'ы;
- **RNG**: четыре изолированных потока `rng.combat.*`;
- **сохранения**: снимок активных боёв + журнал завершённых;
- **CI**: schema/graph/gameplay lint для боевого контента;
- **контент первой волны**: 3 типа боя, базовая модель отряда (~12 бойцов), демо `demo:m24`.

### 1.2. Что спецификация НЕ делает

- Не реализует дуэльные механики, стили и абордажные средства → `DEV-SPEC-030`.
- Не реализует мораль поля боя, бегство, сдачу, переговоры как механику → `DEV-SPEC-031` (здесь — только события и точки вызова).
- Не определяет морское движение и корабельный урон → `DEV-SPEC-017/018`.
- Не определяет отношения напарников и предательство → `DEV-SPEC-028` (здесь — `combat.order_issued` и потери).
- Не генерирует эпилог → `DEV-SPEC-036`.
- Не содержит числовой баланс, тексты, арт/VFX/аудио, мобильный UX.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-COMBAT-001` (два пространства) | §5.1, §7.1, R01 | нет |
| `SPEC-COMBAT-002` (нарративная развязка) | §6.4, R06 | исполнение — 031 |
| `SPEC-COMBAT-004` (гибридный размер отряда) | §5.4, R04 | нет |
| `SPEC-COMBAT-005` (роль напарников) | §5.4, R04 | нет |
| `SPEC-COMBAT-008` (гибридный переход) | §7.1, R05 | нет |
| `SPEC-COMBAT-009` (многослойный урон) | §5.3, R03 | нет |
| `SPEC-COMBAT-010` (переиспользование механик) | §6.1, R07 | нет |
| `SPEC-COMBAT-011` (событийная модель) | §6.4, R08 | нет |
| `SPEC-COMBAT-012` (RNG) | §7.4, R09 | нет |
| `SPEC-COMBAT-013` (сохранения) | §5.5, R10 | нет |
| `SPEC-COMBAT-014` (CI) | §12.6, R11 | нет |
| `SPEC-COMBAT-015` (масштаб) | §6.5, R12 | нет |
| `SPEC-COMBAT-016` (нарративная доставка) | §6.3, R06 | нет |
| `SPEC-COMBAT-020/021` (`CombatDefinition`) | §5.1 | нет |
| `SPEC-COMBAT-023` (`CrewMemberDefinition`) | §5.4 | нет |
| `SPEC-COMBAT-024` (механики) | §6.1 | нет |
| `SPEC-COMBAT-025` (`CombatInstance`) | §5.2 | нет |
| `SPEC-COMBAT-030/031` (ядро и расширения) | §6.4 | нет |
| `SPEC-COMBAT-032` (мосты) | §9.3 | нет |
| `SPEC-COMBAT-040/041` (детерминизм) | §7.4 | нет |
| `SPEC-COMBAT-050/051` (снимки) | §5.5, §14 | нет |
| `SPEC-COMBAT-060…063` (валидация) | §12.6, R11 | нет |
| `SPEC-COMBAT-070/071` (скелеты) | §6.5 | частично: доктрины — 030 |
| `SPEC-COMBAT-080` (срез) | §11 R13 | нет |

**Расхождения:** `combat.duel_*`-события регистрируются здесь, но эмитятся 030; `combat.party_*` — здесь, эмитятся 031. `combat.environment_changed` (мост с катаклизмами) не входит в ядро DESIGN — добавлен как нормативное расширение (OQ-01).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-017` | `combat.*`-ядро морского боя, `ShipRuntime`, `EncounterStateMachine` |
| `DEV-SPEC-027` | `PartyInstance`, мораль, экипировка, `IPartyPersonnelPort` |
| `DEV-SPEC-028` | `ICombatOrderPort`, отношения, предательство, потери |

### 2.2. Мягкие

`DEV-SPEC-030` (дуэльные действия), `DEV-SPEC-031` (мораль поля боя, развязка), `DEV-SPEC-020/022` (награды), `DEV-SPEC-025/026` (окружение), `DEV-SPEC-036` (факты).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/combat/**`, `src/application/combat/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Combat Instance | Активный бой с двумя пространствами и собственным состоянием |
| Duel Arena | Пространство поединка капитанов |
| Party Battlefield | Пространство боя отрядов |
| Wound | Обратимая рана с TTL и штрафом к статам |
| Trauma | Перманентная травма, снимаемая только политикой/событием |
| Casualty | Потеря бойца: ранение, травма или смерть |
| Transition | Переход между пространствами (naval → boarding → duel) |
| Resolution | Развязка боя: победа, бегство, сдача, переговоры |
| Elite Unit | Напарник как боец с уникальными механиками |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/combat/` — определения, рантайм, чистые модели (`DamageModel`, `CrewModel`, `TransitionModel`), ошибки, порты.
- `src/application/combat/` — use cases (старт, такт, переход, завершение).
- `src/infrastructure/combat/` — оркестратор, трекеры, event-handlers, memento.
- `content/{combat,crewMember,combatPolicy}/`, `content/mechanics/combat.json`, `content/events/combat-core.json`.
- `tools/ci/stages/validate-combat-graph.ts`, `validate-combat-lint.ts`.

### 4.2. Файлы

```text
src/domain/combat/
  CombatDefinition.ts
  CrewMemberDefinition.ts
  CombatInstance.ts
  CombatErrors.ts
  DamageModel.ts
  CrewModel.ts
  TransitionModel.ts
  ICombatPartyPort.ts
  ICombatFleetPort.ts
  ICombatEnvironmentPort.ts
src/application/combat/
  StartCombat.ts
  AdvanceCombatTick.ts
  TransitionCombatSpace.ts
  ResolveCombat.ts
  GetCombatState.ts
src/infrastructure/combat/
  CombatOrchestrator.ts
  CombatStore.ts
  CombatTickHandlers.ts
  CombatEventHandler.ts
  CombatStateMementoProvider.ts
  NullCombatPartyPort.ts
  NullCombatFleetPort.ts
  NullCombatEnvironmentPort.ts
content/schemas/
  combat-definition.json
  crew-member.json
  combat-instance.json
content/combat/core.json
content/crewMember/core.json
content/mechanics/combat.json
content/events/combat-core.json
tools/ci/stages/validate-combat-graph.ts
tools/ci/stages/validate-combat-lint.ts
test/combat/…
scripts/demo-m24.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `ICombatStore` | `CombatStore` | singleton | `domain-init` |
| `ICombatOrchestrator` | `CombatOrchestrator` | singleton | `domain-init` |
| `ICombatPartyPort` | адаптер к 027 | singleton | `integration` |
| `ICombatFleetPort` | адаптер к 017 | singleton | `integration` |
| `ICombatEnvironmentPort` | адаптер к 025/026 | singleton | `integration` |
| `IMementoProvider('combat')` | `CombatStateMementoProvider` | singleton | `save-composition` |
| Механики `scope: combat` | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. CombatDefinition

```ts
export type CombatType = 'naval_combat_with_duel' | 'boarding_raid' | 'duel_only';

export interface CombatSpaceConfig {
  readonly enabled: boolean;
  readonly transition_policy_id?: string;
  readonly base_crew_size_policy_id?: string;
}

export interface CombatDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly combat_type: CombatType;
  readonly spaces: {
    readonly duel_arena: CombatSpaceConfig;
    readonly party_battlefield: CombatSpaceConfig;
  };
  readonly resolution_policy_id: string;
  readonly duel_to_party_impact_policy_id: string;
  readonly party_to_duel_impact_policy_id: string;
  readonly damage_model_policy_id: string;
  readonly narrative_delivery_policy_id: string;
  readonly mechanic_ids: readonly string[];
}
```

Инварианты: `COMBAT-INV-01` — минимум одно пространство `enabled`; `COMBAT-INV-02` — `duel_only` ⇒ `party_battlefield.enabled=false`; `COMBAT-INV-03` — все policy-id разрешаются в контент.

### 5.2. CombatInstance

```ts
export interface DuelState {
  readonly captain_1_id: string;
  readonly captain_2_id: string;
  readonly captain_1_hp: number;
  readonly captain_1_stamina: number;
  readonly captain_2_hp: number;
  readonly captain_2_stamina: number;
}

export interface PartyState {
  readonly party_1_crew_ids: readonly string[];
  readonly party_2_crew_ids: readonly string[];
  readonly party_1_morale: number;
  readonly party_2_morale: number;
  readonly party_1_casualties: number;
  readonly party_2_casualties: number;
}

export interface CombatInstance {
  readonly instance_id: string;
  readonly definition_id: string;
  readonly start_tick: number;
  readonly phase: 'approach' | 'duel' | 'battlefield' | 'boarding' | 'resolution' | 'ended';
  readonly spaces: {
    readonly duel_arena?: DuelState;
    readonly party_battlefield?: PartyState;
  };
  readonly active_tracker_states: Readonly<Record<string, unknown>>;
  readonly journal: readonly CombatJournalEntry[];
}
```

Инварианты: `COMBAT-INV-04` — `phase='ended'` ⇒ бой удаляется из активных; `COMBAT-INV-05` — журнал монотонен по `(tick, seq)`; `COMBAT-INV-06` — `hp ∈ [0, max]`, `stamina ∈ [0, max]`.

### 5.3. Модель урона

```ts
export type DamageLayer = 'hp' | 'wound' | 'trauma' | 'death';

export interface DamageInput {
  readonly target_id: string;
  readonly base_damage: number;
  readonly damage_tags: readonly string[];
  readonly source_topic: string;
  readonly modifiers: Readonly<Record<string, number>>;
}

export interface DamageResult {
  readonly hp_delta: number;
  readonly wound?: { readonly id: string; readonly ttl_ticks: number; readonly stat_penalty: number };
  readonly trauma?: { readonly id: string; readonly permanent: true };
  readonly died: boolean;
  readonly factors: readonly string[];
}
```

Правила: урон применяется слоями последовательно (hp → wound → trauma → death) по `damage_model_policy_id`; каждый слой декларативен; `factors` фиксирует все модификаторы для журнала и реплея.

### 5.4. CrewMemberDefinition и рантайм

```ts
export interface CrewMemberDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly base_stats: Readonly<Record<string, number>>;
  readonly skill_ids: readonly string[];
  readonly progression_policy_id: string;
  readonly equipment_policy_id: string;
  readonly death_policy: 'permanent';
  readonly elite_companion_def_id?: string;   // если боец — напарник
}

export interface CrewRuntime {
  readonly crew_id: string;
  readonly definition_id: string;
  readonly hp: { readonly current: number; readonly max: number };
  readonly wounds: readonly string[];
  readonly traumas: readonly string[];
  readonly alive: boolean;
}
```

Инварианты: `COMBAT-INV-07` — `death_policy='permanent'` ⇒ воскрешение запрещено; `COMBAT-INV-08` — `elite_companion_def_id` разрешается в 028.

### 5.5. Снимок

`CombatSnapshot` = `{ active_combats: CombatInstance[], completed_combats_journal: CompletedCombatEntry[] }`, `$id: combat-state.json`. Журнал завершённых боёв append-only, используется только эпилогом (036), не для восстановления поведения.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `combat-duel-resolver` | resolver | combat | 100 | `combat.duel_action_executed`, `combat.duel_tick_advanced` | `combat.duel_damage_dealt`, `combat.duel_stamina_changed` | `null` |
| `combat-party-tracker` | tracker | combat | 90 | `combat.party_tick_advanced`, `combat.crew_casualty_occurred` | `combat.party_morale_changed`, `combat.party_casualties_counted` | `{ morale, casualties, active_crew_ids }` |
| `combat-damage-resolver` | resolver | combat | 120 | `combat.duel_damage_dealt`, `combat.party_damage_dealt` | `combat.crew_wounded`, `combat.crew_traumatized`, `combat.crew_died` | `null` |
| `combat-transition-tracker` | tracker | combat | 80 | `combat.tick_advanced`, `fleet.boarding_initiated` | `combat.transition_to_boarding`, `combat.transition_to_duel` | `{ last_transition_tick }` |

### 6.2. JSON Schema

- `combat-definition.json` — `combat_type` enum 3; `spaces` required; `mechanic_ids` minItems 1; if/then для `duel_only`.
- `crew-member.json` — `base_stats` required [hp,strength,agility,endurance] ≥0; `death_policy` enum ['permanent'].
- `combat-instance.json` — `phase` enum 6; `spaces` object; `journal` items required [tick, seq, topic]; `hp`/`stamina` ≥0.
- `combat-state.json` — `active_combats` array; `completed_combats_journal` array; `additionalProperties: false`.

### 6.3. Политики

`damage_model_policy_id` (слои и пороги), `resolution_policy_id` (условия развязки), `duel_to_party_impact_policy_id` (асимметрия влияния), `party_to_duel_impact_policy_id`, `narrative_delivery_policy_id` (≥2 канала), `base_crew_size_policy_id`. Все числа — в контенте.

### 6.4. События

Ядро (22): `combat.started`, `combat.ended`, `combat.tick_advanced`, `combat.duel_action_executed`, `combat.duel_damage_dealt`, `combat.duel_stamina_changed`, `combat.duel_captain_wounded`, `combat.duel_captain_defeated`, `combat.party_tick_advanced`, `combat.party_action_executed`, `combat.party_damage_dealt`, `combat.party_morale_changed`, `combat.crew_casualty_occurred`, `combat.crew_wounded`, `combat.crew_traumatized`, `combat.crew_died`, `combat.transition_to_boarding`, `combat.transition_to_duel`, `combat.resolution_triggered`, `combat.rout_occurred`, `combat.surrender_occurred`, `combat.negotiation_started`.

Расширение: `combat.environment_changed` (мост с 025/026), `combat.party_casualties_counted`, `combat.order_issued`.

Фракционные: `combat.industrial-steam.*`, `combat.ancient-arcane.*`, `combat.necromantic-corpse.*`, `combat.living-artifact.*`.

### 6.5. Контент первой волны

3 типа боя (`naval-combat-with-duel`, `boarding-raid`, `duel-only`), 6 шаблонов бойцов (включая 2 элитных напарника), 4 политики урона, 3 политики развязки.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Фазы боя**

```
[approach] --distance < engage_range--> [duel|battlefield]
[duel] --boarding_initiated--> [boarding]
[boarding] --duel_started--> [duel]
[duel|battlefield|boarding] --resolution_condition--> [resolution]
[resolution] --outcome_applied--> [ended]
```

**(b) Урон**

```
[healthy] --damage: hp>0--> [wounded(hp)]
[wounded] --damage: hp<=0 ∧ wound_policy--> [wounded+trauma]
[wounded+trauma] --damage: hp<=0 ∧ death_policy--> [dead]
[wounded] --heal--> [healthy]
```

### 7.2. Sequence: старт и такт

```
StartCombat{definition_id, party_1, party_2}
  → CombatDefinition (spaces, policies)
  → ICombatPartyPort.roster(party_1/2) → crew ids
  → CombatStore.create(CombatInstance{phase:'approach'})
  → emit combat.started
AdvanceCombatTick{instance_id}
  → phase switch: duel → 030 resolver; battlefield → 031 tracker
  → combat-damage-resolver: DamageModel.apply(...)
  → emit combat.tick_advanced
```

### 7.3. Tick-контракт

Фаза `scope:combat` идёт после `scope:companion` (028). Внутри — очередь механик по priority desc. Бюджет — контракт 007/016. Пропуск фазы не допускается для активных боёв (бой не «догоняется» батчем, кроме `approach`-фазы).

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.combat.duel`, `rng.combat.party`, `rng.combat.damage`, `rng.combat.resolution`. Порядок обработки участников — стабильный (по `crew_id`), порядок слоёв урона — фиксированный. `load(save@N) → tick(N+1)` ≡ непрерывный прогон.

### 7.5. Расчёт урона

```
applyDamage(input, policy):
  dmg = input.base_damage
  for m in sorted(input.modifiers): dmg = policy.apply(m, dmg)
  hp_delta = -min(dmg, target.hp.current)
  if target.hp.current - dmg <= 0:
      if policy.wound_on_zero: wound = policy.wound(target)
      if policy.trauma_on_zero: trauma = policy.trauma(target)
      if policy.death_on_zero: died = true
  return DamageResult{...factors}
```

Сложность O(modifiers); результат полностью определяется входом и политикой.

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 029; impl: 027
export interface ICombatPartyPort {
  roster(partyId: string): Result<readonly string[], AppError>;
  morale(partyId: string): Result<number, AppError>;
  applyCasualty(partyId: string, crewId: string, kind: 'wounded'|'traumatized'|'died'): Result<void, AppError>;
}

// owner: 029; impl: 017
export interface ICombatFleetPort {
  shipClass(partyId: string): Result<string, AppError>;
  boardingInitiated(combatInstanceId: string): Result<void, AppError>;
}

// owner: 029; impl: 025/026
export interface ICombatEnvironmentPort {
  activeEffects(nodeId: string): Result<readonly string[], AppError>;
}
```

### 8.2. Адаптеры

`NullCombatPartyPort` (roster из фикстуры, morale 1.0), `NullCombatFleetPort` (`Ok('default')`), `NullCombatEnvironmentPort` (`Ok([])`), `CombatStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_COMBAT_UNKNOWN` | instance/definition не найден | да |
| `DOMAIN_COMBAT_ALREADY_ENDED` | такт по завершённому бою | да |
| `DOMAIN_COMBAT_INVALID_TRANSITION` | переход не разрешён политикой | да |
| `DOMAIN_COMBAT_NO_SPACE` | у боя нет активного пространства | нет |
| `DOMAIN_COMBAT_CREW_UNKNOWN` | боец не найден | да |
| `DOMAIN_COMBAT_DAMAGE_RANGE` | отрицательный урон/HP вне диапазона | нет |
| `INFRA_COMBAT_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые события

| Topic | Реакция |
|---|---|
| `fleet.combat_started` | `StartCombat` |
| `fleet.boarding_initiated` | `combat.transition_to_boarding` |
| `cataclysm.effect_applied` | `combat.environment_changed` |
| `party.companion_died` | потеря элитного юнита |
| `combat.order_issued` (эмит 029) | проверка 028 |

### 9.2. Эмитируемые события

Все темы §6.4. Consumers: 017 (морской бой), 027/028 (потери, реакции), 030/031 (пространства), 020/022 (награды), 036 (факты).

### 9.3. Мосты

`fleet.combat_started → combat.started`; `combat.transition_to_boarding → fleet.boarding_initiated`; `combat.ended → fleet.combat_ended`; `combat.ended → economy.loot_acquired`; `combat.resolution_triggered → economy.reward_distributed`; `cataclysm.effect_applied → combat.environment_changed`; `combat.ended → cataclysm.combat_impact_recorded`; `combat.crew_died → companion.reaction_triggered`; факты `epilogue.combat.*` → 036.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `StartCombat` | `{definition_id, party_1, party_2, node_id}` | `{instance_id}` | Party, Fleet, Environment | `combat.started` |
| `AdvanceCombatTick` | `{instance_id}` | `{phase, events[]}` | — | `combat.tick_advanced` |
| `TransitionCombatSpace` | `{instance_id, to_space}` | `{phase}` | Fleet | `transition_to_*` |
| `ResolveCombat` | `{instance_id, outcome}` | `{resolution}` | Party, Economy | `resolution_triggered`, `combat.ended` |
| `GetCombatState` | `{instance_id}` | снимок | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема не проходит | `INFRA_COMBAT_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | недопустимый переход | `DOMAIN_COMBAT_INVALID_TRANSITION` | `Err`, фаза не меняется |
| domain | урон вне диапазона | `DOMAIN_COMBAT_DAMAGE_RANGE` | `Err`, HP не меняется |
| application | такт по завершённому бою | `DOMAIN_COMBAT_ALREADY_ENDED` | `Err` |
| save | снимок невалиден | `INFRA_COMBAT_SCHEMA_INVALID` | reject load |
| runtime | дубль доставки | — | идемпотентный skip |

---

## 11. Критерии приёмки

### DEV-SPEC-029-R01 — Определение боя и пространства
Требование: бой декларирует тип и пространства; минимум одно пространство активно; `duel_only` не имеет поля боя.
Invariant: COMBAT-INV-01…03.

- AC01: Given `duel-only`, When загрузка, Then `party_battlefield.enabled=false` и схема валидна.
- AC02: Given определение без активных пространств, When `ci:validate --stage=schemas`, Then ошибка.

### DEV-SPEC-029-R02 — Жизненный цикл боя
Требование: бой проходит фазы approach → duel/battlefield → resolution → ended; завершённый бой уходит из активных.
Invariant: COMBAT-INV-04.

- AC03: Given `StartCombat`, When вызов, Then `combat.started` и `phase='approach'`.
- AC04: Given `ResolveCombat`, When вызов, Then `combat.ended` и бой отсутствует в `active_combats`.

### DEV-SPEC-029-R03 — Многослойный урон
Требование: урон применяется слоями hp → wound → trauma → death по политике; факторы фиксируются.
Invariant: COMBAT-INV-06.

- AC05: Given урон меньше HP, When `applyDamage`, Then только `hp_delta`, без раны.
- AC06: Given урон ≥ HP и `wound_on_zero`, When `applyDamage`, Then `wound` с TTL и `stat_penalty`.
- AC07: Given урон ≥ HP и `death_on_zero`, When `applyDamage`, Then `died=true` и `combat.crew_died`.
- AC08: Given одинаковый вход и seed, When два прогона, Then `DamageResult` идентичен (включая `factors`).

### DEV-SPEC-029-R04 — Бойцы и потери
Требование: боец имеет статы и перманентную смерть; потеря элитного юнита отражается в отряде.
Invariant: COMBAT-INV-07/08.

- AC09: Given `death_policy='permanent'`, When попытка воскрешения, Then `Err`.
- AC10: Given смерть элитного юнита, When `applyCasualty`, Then `party.companion_died` и `combat.crew_died`.

### DEV-SPEC-029-R05 — Переходы пространств
Требование: переход разрешён только политикой; переход эмитит событие и меняет фазу.
Invariant: COMBAT-INV-04.

- AC11: Given `naval_combat_with_duel` и `boarding_initiated`, When `TransitionCombatSpace`, Then `combat.transition_to_boarding` и `phase='boarding'`.
- AC12: Given `duel_only` и попытка перехода в battlefield, When вызов, Then `Err(DOMAIN_COMBAT_INVALID_TRANSITION)`.

### DEV-SPEC-029-R06 — Развязка и нарративная доставка
Требование: развязка объявляется событием; доставка идёт минимум по двум каналам; факты публикуются.
Invariant: —

- AC13: Given `ResolveCombat{outcome:'rout'}`, When вызов, Then `combat.rout_occurred` + `combat.resolution_triggered`.
- AC14: Given политика с одним каналом доставки, When `ci:validate --stage=gameplay`, Then ошибка.

### DEV-SPEC-029-R07 — Переиспользование механик
Требование: контракт 004 не расширяется; `role_tags ∋ 'combat'`; tracker персистит.

- AC15: Given `combat-party-tracker`, When `--stage=mechanics`, Then `persisted=true` и `state_schema` присутствует.
- AC16: Given механика без `role_tags ∋ 'combat'`, When CI, Then ошибка.

### DEV-SPEC-029-R08 — Событийное ядро
Требование: 22 темы зарегистрированы; фракционные namespace'ы без коллизий.

- AC17: Given перечень §6.4, When `--stage=events`, Then все темы присутствуют.
- AC18: Given фракционное событие с ID ядра, When graph, Then `Err`.

### DEV-SPEC-029-R09 — RNG
Требование: ровно 4 потока `rng.combat.*`, изолированы.

- AC19: Given fixture-прогон, When `--stage=rng-streams`, Then 4 потока, изоляция подтверждена.

### DEV-SPEC-029-R10 — Сохранения
Требование: снимок активных боёв + журнал завершённых; загрузка валидирует схему.

- AC20: Given save→load, When сравнение, Then deep-equal и идентичное продолжение 10 тактов.
- AC21: Given снимок с `phase='ended'` в активных, When загрузка, Then `Err(INFRA_COMBAT_SCHEMA_INVALID)`.

### DEV-SPEC-029-R11 — CI
Требование: schema + graph + gameplay lint для боевого контента.

- AC22: Given negative-fixtures (нет пространства, нет механик, битая политика, дубль ID), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-029-R12 — Контент первой волны
Требование: 3 типа боя, ~12 бойцов, 2 элитных напарника.

- AC23: Given пакет `combat-core`, When загрузка, Then 3 типа боя и ≥12 шаблонов бойцов.

### DEV-SPEC-029-R13 — Вертикальный срез
Требование: сценарий SPEC-COMBAT-080 воспроизводится как `demo:m24`.

- AC24: Given `bun run demo:m24`, When завершение, Then `Ok`: старт → такт → урон → потеря → переход → развязка → save/load → идентичное продолжение.

---

## 12. Тест-план

### 12.1. Unit
T01 схемы; T02 `DamageModel` (слои, факторы); T03 `CrewModel` (потери, перманентность); T04 `TransitionModel` (разрешённые переходы).

### 12.2. Integration
T05 use cases + recording bus; T06 фаза `scope:combat`; T07 мосты fleet/party/cataclysm/economy.

### 12.3. Contract
T08 пакет контента против схем; T09 перечень тем §6.4; T10 механики против `mechanic-definition.json`.

### 12.4. Determinism
T11 save/load/replay; T12 изоляция 4 потоков + grep.

### 12.5. E2E
T13 `demo:m24`.

### 12.6. CI
T14 `validate-combat-graph.ts`; T15 `validate-combat-lint.ts`.

---

## 13. Производительность

### 13.1. Бюджет
Такт боя — O(|crew| + |modifiers|); урон — O(modifiers). Фаза `scope:combat` в общем tick budget (007/016).

### 13.2. LOD
При перегрузке: `approach`-фаза может батчиться; расчёт урона и смерти — никогда.

### 13.3. Профилирование
Счётчики `combat.*`, длительность фазы; нагрузочный сценарий: 2×12 бойцов × 200 тактов.

---

## 14. Миграции

`combat-state.json` v1. Breaking-изменения — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | `combat.environment_changed` — расширение ядра или фракционное событие | нет | design | до review Wave 5 |
| OQ-02 | Кто владеет `combat.order_issued` — 029 или 031 | R05 | arch | до M24 |
| OQ-03 | Формат `condition` в политиках развязки (DSL или теги) | R06 | arch | до M24 |

---

## 16. Что остаётся вне scope

- Дуэльные стили и доктрины → `DEV-SPEC-030`.
- Мораль поля боя, бегство, сдача, переговоры → `DEV-SPEC-031`.
- Морское движение и корабельный урон → `DEV-SPEC-017/018`.
- Эпилог → `DEV-SPEC-036`.
- Баланс, тексты, арт/VFX/аудио, мобильный UX.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | Ожидаемый TKT (M24) |
|---|---|---|---|---|
| SPEC-COMBAT-001/021 | R01 | AC01,AC02 | T01,T08 | M24-001 |
| SPEC-COMBAT-008/025 | R02 | AC03,AC04 | T05,T06 | M24-002 |
| SPEC-COMBAT-009 | R03 | AC05…AC08 | T02,T05 | M24-003 |
| SPEC-COMBAT-004/005/023 | R04 | AC09,AC10 | T03,T07 | M24-004 |
| SPEC-COMBAT-008 | R05 | AC11,AC12 | T04,T05 | M24-005 |
| SPEC-COMBAT-002/016 | R06 | AC13,AC14 | T05,T15 | M24-006 |
| SPEC-COMBAT-010/024 | R07 | AC15,AC16 | T10 | M24-007 |
| SPEC-COMBAT-011/030/031 | R08 | AC17,AC18 | T09 | M24-007 |
| SPEC-COMBAT-012/041 | R09 | AC19 | T12 | M24-008 |
| SPEC-COMBAT-013/050/051 | R10 | AC20,AC21 | T11 | M24-009 |
| SPEC-COMBAT-014/060…063 | R11 | AC22 | T14,T15 | M24-010 |
| SPEC-COMBAT-015/071 | R12 | AC23 | T08 | M24-011 |
| SPEC-COMBAT-080 | R13 | AC24 | T13 | M24-012 |

Итог декомпозиции: 12 тикетов `TKT-M24-001…012`, демо `demo:m24`.

---

## Приложение A. Чек-лист Definition of Done

- ✅ секции 1–17; ✅ TS-интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result`-ошибки (§8.3, §10); ✅ R01…R13 → AC01…AC24; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ DESIGN-трассировка (§1.3).
