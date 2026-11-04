# DEV-SPEC-027 v1.0 — «Party Management (roster, equipment, morale, salary)»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-04
**Статус:** draft
**Волна:** Wave 5 (Party, Companions & Combat), первый блок
**Зависит от:** `DEV-SPEC-001…007`, `DEV-SPEC-020`
**Блокирует:** `DEV-SPEC-028`, `DEV-SPEC-029`, `DEV-SPEC-030`, `DEV-SPEC-031`, `DEV-SPEC-033`, `DEV-SPEC-034`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Менеджмент отряда»` (SPEC-PARTY-001…017, 020…024, 030…032, 040…041, 050…051, 060…063, 070…071, 080), `GENERAL DESIGN v1.0` (GD-07, GD-08, GD-09), `INTENT` (INT-21, INT-22, INT-30, INT-33.5)
**Связанные DEV-SPEC:** `DEV-SPEC-008` (CI-стадии), `DEV-SPEC-009` (локализация display-ключей), `DEV-SPEC-017` (реализация `IPartyPersonnelPort`, события `fleet.*`), `DEV-SPEC-025/026` (шрамы катаклизмов → party-реакции), `DEV-SPEC-036` (`IEpilogueFactPort` — будущий владелец контракта), `DEV-SPEC-021/022` (прецедент port-stub'ов в экономике)
**Порождает веху:** `TICKETS-M8` (см. §17 и `TICKET-TEMPLATE v1.0`)

---

## 0. Как читать эту спеку

Документ построен по `DEV-SPEC-TEMPLATE v1.0` (секции 1–17 фиксированы). Каждое требование имеет ID `DEV-SPEC-027-R{NN}`, каждый критерий приёмки — `DEV-SPEC-027-AC{NN}`; трассировка на DESIGN — §1.3 и §17. Балансовые числа отсутствуют (правило шаблона §0.7): все числовые эффекты вынесены в политики контента (`morale_policy_id`, `salary_policy_id` и т.п.). Числа, приведённые в JSON-примерах и таблицах приоритетов, иллюстративны либо являются контрактными параметрами очереди исполнения, не балансиромыми.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

Спецификация переводит доменный контекст `Party` из DESIGN-решений в реализационный контракт:

- **границы bounded context `Party`**: отряд владеет только боевым составом из напарников; капитан, корабль, экипаж, трюм — внешние контексты (SPEC-PARTY-001…004);
- **рантайм-агрегат `PartyInstance`**: реестр напарников (`CompanionInstance`), глобальная мораль, журнал ключевых событий `party_events_journal`;
- **контракты определений**: `CompanionDefinition`, `EquipmentDefinition`, переиспользование `MechanicDefinition` (scope `companion`/`party`), политики найма/прокачки/экипировки/содержания/зарплаты/реакций/арок/структуры;
- **гибридная модель морали**: глобальная мораль + индивидуальные настроения (mood effects с TTL) + перманентные шрамы; вывод морали — чистая функция состояния и политик;
- **цикл содержания и зарплаты**: тактовый расход через фазу `scope:party`, просрочка → каскад морали → сигнал дезертирства (событие; решение о дезертирстве принимает `DEV-SPEC-028`);
- **экипировка по слотам** (`weapon/armor/helmet/accessory/consumable`) с мостом в экономику (`good_id` → `ITradeService` 020);
- **прокачка через использование**: счётчики применения навыков → порог повышения → событие; пул перков data-driven (выбор перка — 028);
- **нарративные реакции**: правила `(триггер-событие → эффект)` из reaction-политик: настроения, мораль, шрамы, публикация фактов эпилога;
- **хуки скрытых веток**: точка расширения ContentKind `acquisitionHook` (объявлен в Wave 0) без реализации логики трансформаций;
- **событийная модель**: ядро `party.*` (§6.4) + namespace'ы фракционных расширений;
- **RNG**: четыре именованных потока `rng.party.*`;
- **сохранения**: полный снимок `PartyInstance` через Memento (`domainId: 'party'`) + схема `party-state.json`;
- **CI**: расширение стадий schema/graph/gameplay-lint на контент отряда (`validate-party-graph.ts`, `validate-party-lint.ts`);
- **контент первой волны**: 3 напарника (industrial-steam / ancient-arcane / necromantic-corpse), 10 предметов экипировки, вертикальный срез SPEC-PARTY-080, демо `demo:m8`.

### 1.2. Что спецификация НЕ делает

- Не определяет личность, статы, старение, пенсию, репутацию и клятвы капитана → `DEV-SPEC-032` (здесь — только `captain_id` и порт `ICaptainStatePort`).
- Не реализует механику отношений, synergy, recruitment-квесты, permadeath legacy и само дезертирство → `DEV-SPEC-028` (здесь — хранение полей `relationship_with_captain`, `permanent_scars`, сигнальные события и контракты политик).
- Не моделирует бой, раны, травмы, смерть в бою, дуэли и battlefield → `DEV-SPEC-029…031` (здесь — обработчики входящих combat-событий и эмит исходных `party.companion_died/wounded/traumatized`).
- Не реализует диалоги, story beacons и тексты личных арок → `DEV-SPEC-034` (здесь — машина состояний арки и событие `party.personal_arc_advanced`).
- Не реализует `IEpilogueFactPort` → `DEV-SPEC-036` (здесь — owner-стаб интерфейса; прецедент `ICargoCapacityPort` из 020).
- Не применяет шрамы катаклизмов как источник и не порождает `cataclysm.scar_recorded` → `DEV-SPEC-025/026` (здесь — потребление `cataclysm.effect_applied` и эмит `party.companion_scar_applied`).
- Не покупает/продаёт товары на рынках и не хранит инвентарь узлов → `DEV-SPEC-020` (здесь — вызовы `ITradeService` и мост `economy.expense_recorded`).
- Не содержит числовой баланс, финальные тексты, арт/VFX/аудио, мобильный UX, миграции сохранений (полный стоп-лист — §16).

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-PARTY-001` (границы контекста) | §1.1/§1.2, R01, PARTY-INV-01…04 | нет |
| `SPEC-PARTY-002` (только напарники) | §5.2, R01 | нет |
| `SPEC-PARTY-003` (разделение экипажа/отряда) | §8.1 personnel-port, R02 | нет |
| `SPEC-PARTY-004` (капитан + пул) | §5.3 `PartyInstance`, R03 | нет |
| `SPEC-PARTY-005` (найм через нарратив/пленных) | §5.1 `acquisition_policy_id`, §7.2(a), R04 | частично: конверсия пленных решается в 028; здесь контракт и hook-точки (OQ-02) |
| `SPEC-PARTY-006` (бесклассовая прокачка) | §5.2 skills, §7.5, R05 | нет |
| `SPEC-PARTY-007` (экипировка по слотам) | §5.1 `EquipmentDefinition`, R06 | нет |
| `SPEC-PARTY-008` (гибридная мораль) | §5.3, §7.1(a), R07 | нет |
| `SPEC-PARTY-009` (контракт напарника) | §5.1 `CompanionDefinition`, R08 | нет |
| `SPEC-PARTY-010` (содержание/зарплата) | §7.2(c), §7.3, R09 | нет |
| `SPEC-PARTY-011` (нарративный слой) | §5.1 policies, §7.1(c), §7.2(d), R10 | нет |
| `SPEC-PARTY-012` (переиспользование механик) | §6.1, R11 | нет |
| `SPEC-PARTY-013` (ядро + фракционные расширения) | §6.4, §9.1/9.2, R12 | нет |
| `SPEC-PARTY-014` (RNG-потоки) | §7.4, R13 | нет |
| `SPEC-PARTY-015` (снимки + журнал) | §5.4, §6.2, R14 | нет |
| `SPEC-PARTY-016` (CI: schema+graph+lint) | §12 CI, R15 | нет |
| `SPEC-PARTY-017` (масштаб первой волны) | контент-пакеты §4.2, R16 | нет |
| `SPEC-PARTY-020…024` (JSON-контракты) | §5, §6 | нет |
| `SPEC-PARTY-030…032` (события и мосты) | §6.4, §9.3 | см. п.1–2 ниже |
| `SPEC-PARTY-040/041` (детерминизм, RNG) | §7.4, R13/R17 | нет |
| `SPEC-PARTY-050/051` (сохранения, валидация загрузки) | §5.4, §8.3, R14 | нет |
| `SPEC-PARTY-060…063` (валидация) | §12.6/T15-T16, R15 | нет |
| `SPEC-PARTY-070/071` (скелеты первой волны) | пакет `party-core`, R16 | нет |
| `SPEC-PARTY-080` (вертикальный срез) | §12.5 demo:m8, R16 | нет |
| `GD-07/GD-08` (контент как данные) | §4, §6 | нет |
| `GD-09` (Memento) | §5.4 | нет |
| `INT-21/22/30/33.5` | весь документ | нет |

**Зафиксированные расхождения с DESIGN (для реализации нормативна спека):**

1. В таблице мостов SPEC-PARTY-032 использованы имена `party.companion_reaction_triggered` и `combat.crew_died`, отсутствующие в каноническом ядре SPEC-PARTY-030. Нормативно: мост катаклизма использует каноническое `party.reaction_triggered` (payload `{ companion_id, trigger_topic }`); событие `combat.crew_died` в namespace `combat.*` регистрирует `DEV-SPEC-029`, а Party эмитит каноническое `party.companion_died`. Записано как OQ-01 (не блокирует тикеты 027).
2. `party.ship_changed` (мост fleet→party) отсутствует в ядре SPEC-PARTY-030; добавлен в ядро §6.4 как нормативное событие.
3. SPEC-PARTY-030 перечисляет 16 ядерных событий; контракт требует также тем для внутридоменных механизмов (`party.desertion_risk_elevated`, `party.maintenance_charged`, `party.companion_action_executed`, `party.prisoner_conversion_requested`) — они включены в ядро §6.4 как расширение (не противоречие: DESIGN запрещает лишь удаление ядерных событий, но не запрещает дополнения на уровне DEV-SPEC).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Потребляемый контракт |
|---|---|
| `DEV-SPEC-001` | `Result<T,E>`, `AppError`, `Brand`, DI-токены, bootstrap-стадии |
| `DEV-SPEC-002` | `IEventBus`, `EventDefinition`, реестр событий, delivery policy |
| `DEV-SPEC-003` | `IContentRegistry`, `ContentKind` (значения `companion`, `equipment`, `relationshipThresholds`, `acquisitionHook`, `reactionGranularity` уже объявлены в Wave 0; новые kinds политик — см. §4.2 примечание), маппинг `schemaNameForKind`, правило kind-по-директории |
| `DEV-SPEC-004` | `MechanicDefinition` (scopes `party`/`companion` уже в `MechanicScope` Wave 0), `IMechanicRuntime`, правила resolver/tracker |
| `DEV-SPEC-005` | `IRngService`, именованные потоки, rng-streams CI |
| `DEV-SPEC-006` | `IMementoProvider(domainId)`, композиция save-snapshot, валидация при загрузке |
| `DEV-SPEC-007` | `TickPhase = 'scope:party'` (уже в перечне Wave 0), `IGameClock`, порядок скоупов |
| `DEV-SPEC-020` | `ITradeService` (покупка экипировки, списания казны), `ICargoCapacityPort`, события `economy.expense_recorded`/`economy.item_acquired` |

### 2.2. Мягкие

| Спека | Характер стыка |
|---|---|
| `DEV-SPEC-017` (Fleet) | consumes `fleet.ship_acquired/ship_lost`; реализация `IPartyPersonnelPort`. Без неё — `NullPartyPersonnelPort` (всегда `Ok(true)`) |
| `DEV-SPEC-025/026` (Cataclysms) | consumes `cataclysm.effect_applied`, emits `party.companion_scar_applied`. Тестируется на recording bus с synthetic-событием |
| `DEV-SPEC-029` (Combat) | consumes `combat.encounter_started/resolved` (зарегистрированы в 017-ядре `combat.*`); proxy ранений до детальной wound-модели 029 — OQ-03 |
| `DEV-SPEC-032` (Captain) | `StubCaptainStatePort` (модификатор = 0) |
| `DEV-SPEC-036` (Epilogue) | `NoopEpilogueFactPort` (collector для contract-тестов) |

### 2.3. Внешние

Новых npm-зависимостей нет: `ajv` (схемы), `vitest` (тесты), рантайм Bun/Node как в Wave 0. Запреты: `Math.random`, `Date.now` в `src/domain/party/**` и `src/application/party/**` (CI-стадия rng-streams, расширение каталогов — §12.6 T13).

---

## 3. Термины

| Термин | Определение |
|---|---|
| Party (Отряд) | Рантайм-агрегат боевого состава из напарников под командованием одного капитана; не включает экипаж и корабль |
| Companion (Напарник) | Экземпляр `CompanionInstance` — единственный тип члена отряда |
| Global Morale | Скаляр `[0,1]` агрегатной морали, выводимый из настроений, шрамов, зарплатных дефолтов и событий по `MoralePolicy` |
| Mood Effect | Короткоживущий модификатор настроения напарника с TTL в тактах и весом в мораль |
| Permanent Scar | Перманентный тег-эффект напарника, снимаемый только политиками/событиями; влияет на мораль и реакции |
| Maintenance | Фиксированное содержание напарника за такт, накапливаемое как `accrued_maintenance` |
| Salary | Периодическая выплата по контракту; невыплата копит `salary_overdue_periods` |
| Desertion Signal | Событие `party.desertion_risk_elevated`; решение об уходе принимает 028 |
| Acquisition Hook | Контент-декларация условий открытия напарника (kind `acquisitionHook`); исполнители — квесты/нарратив (028/034) |
| Personal Arc | Линейная машина состояний личной сюжетной линии напарника; продвижение — `party.personal_arc_advanced` |
| Reaction Policy | Данные: набор правил `(триггер-событие, условие) → (эффекты настроения/морали/шрама/факта)` |
| Effective Stats | `current_stats` + суммарные `stat_modifiers` надетой экипировки; производная величина, не хранится в снимке |
| Vertical Slice | Нормативный срез SPEC-PARTY-080, собираемый в `demo:m8` |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/party/` — типы определений и рантайм-агрегат, чистые функции моделей (Morale/Progression/Salary/Equipment), ошибки, owner-порты. Импорты — только primitives и domain-типы Wave 0 (прецедент `domain/economy`).
- `src/application/party/` — use cases (команды игрока и системные запросы).
- `src/infrastructure/party/` — адаптеры: tick-обработчики, memento-provider, заглушки портов, event-handler мостов.
- `content/{kind}/*.json` — контент-пакет `party-core` (kind определяется именем директории — действующее правило `JsonContentRegistry.kindForPath`).
- `tools/ci/stages/` — новые graph/lint-стадии.

Правило направления зависимостей сохраняется: `domain/party ↛ application|infrastructure`; в экономику — только через порты и события.

### 4.2. Файлы

```text
src/
├── domain/party/
│   ├── CompanionDefinition.ts
│   ├── EquipmentDefinition.ts
│   ├── PartyPolicies.ts               // morale/maintenance/salary/reaction/arc/progression/acquisition/structure policy types
│   ├── PartyInstance.ts               // runtime aggregate + CompanionInstance + journal entry
│   ├── PartyErrors.ts
│   ├── MoraleModel.ts                 // чистый вывод морали/настроений
│   ├── ProgressionModel.ts            // skill usage → level up
│   ├── EquipmentModel.ts              // слоты, effective stats
│   ├── SalaryModel.ts                 // начисление/просрочка/каскад
│   ├── ITradePricePort.ts             // owner-стаб (impl — 020)
│   ├── IPartyPersonnelPort.ts         // owner-стаб (impl — 017)
│   ├── ICaptainStatePort.ts           // owner-стаб (impl — 032)
│   └── IEpilogueFactPort.ts           // owner-стаб (impl — 036)
├── application/party/
│   ├── RecruitCompanion.ts
│   ├── DismissCompanion.ts
│   ├── EquipCompanion.ts
│   ├── UnequipCompanion.ts
│   ├── BuyEquipment.ts                // через ITradeService(020)
│   ├── PaySalaries.ts
│   ├── GetPartyRoster.ts              // query
│   ├── GetPartyStatus.ts              // query
│   └── AdvancePersonalArc.ts          // вход из 028/034
├── infrastructure/party/
│   ├── PartyStore.ts                  // holder PartyInstance (единственная точка мутации)
│   ├── PartyTickHandlers.ts           // регистрация механик scope:party
│   ├── PartyEventHandler.ts           // consumes combat/cataclysm/fleet/world events
│   ├── PartyStateMementoProvider.ts   // domainId 'party'
│   ├── EconomyTradePriceAdapter.ts    // делегат к 020
│   ├── NullPartyPersonnelPort.ts
│   ├── StubCaptainStatePort.ts
│   └── NoopEpilogueFactPort.ts        // in-memory collector для тестов
content/
├── companion/core.json
├── equipment/core.json
├── partyStructurePolicy/core.json
├── partyPolicy/core.json              // контейнер политик (см. примечание registry)
├── mechanics/party.json
├── events/party-core.json
└── schemas/
    ├── companion-definition.json
    ├── equipment-definition.json
    ├── party-structure-policy.json
    ├── party-policy.json
    └── party-state.json
tools/ci/stages/
├── validate-party-graph.ts
└── validate-party-lint.ts
test/party/                            // unit/integration/contract/determinism + fixtures/negative/
scripts/demo-m8.ts                     // bun run demo:m8
```

> **Примечание registry (обязательно к исполнению, аналог Q-04 в 020).** Действующий `JsonContentRegistry` определяет kind по имени директории и валидирует неизвестные kinds generic-схемой. Для 027: расширить `DIR_TO_KIND` директориями `companion`, `equipment`, `partyStructurePolicy`, `partyPolicy`; расширить `schemaNameForKind`: `companion → companion-definition`, `equipment → equipment-definition`, `partyStructurePolicy → party-structure-policy`, `partyPolicy → party-policy`. Политики (morale/maintenance/salary/reaction/personalArc/skillProgression/acquisition/relationshipThresholds) хранятся как записки kind `partyPolicy` с дискриминатором `kind` внутри (generic-обёртка по прецеденту §6.3 020) — это сознательное упрощение против отдельных kinds ради минимального диффа registry; при необходимости разнесётся в Wave 6 (OQ-09). Новые значения `ContentKind` (`partyStructurePolicy`, `partyPolicy`) добавляются в enum Wave 0 — additive change. `party-state.json` валидируется memento-путём (006), не registry.

### 4.3. DI (GameContainer)

| Токен | Реализация | Жизненный цикл | Стадия bootstrap |
|---|---|---|---|
| `IPartyStore` | `PartyStore` | singleton | `domain-init` |
| `ITradePricePort` | `EconomyTradePriceAdapter` | singleton | `integration` (после 020) |
| `IPartyPersonnelPort` | `NullPartyPersonnelPort` (замена на 017) | singleton | `integration` |
| `ICaptainStatePort` | `StubCaptainStatePort` | singleton | `domain-init` |
| `IEpilogueFactPort` | `NoopEpilogueFactPort` | singleton | `domain-init` |
| `IMementoProvider('party')` | `PartyStateMementoProvider` | singleton | `save-composition` |
| Механики scope `party`/`companion` | регистрация в `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. Определения (content-типы)

```ts
// src/domain/party/CompanionDefinition.ts
import type { Brand } from '../../core/primitives/Brand.js';

export type CompanionDefId = Brand<string, 'CompanionDefId'>;
export type MechanicRefId  = Brand<string, 'MechanicRefId'>;

export interface CompanionBaseStats {
  readonly hp: number;
  readonly strength: number;
  readonly agility: number;
  readonly endurance: number;
  readonly [stat: string]: number;          // расширяемо данными; допустимые ключи фиксирует схема
}

export interface CompanionDefinition {
  readonly id: CompanionDefId;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly faction_id?: string;                     // weak ref FactionDefinition (017)
  readonly base_stats: CompanionBaseStats;
  readonly mechanic_ids: readonly MechanicRefId[];  // ≥2 (SPEC-PARTY-009), role_tags ⊇ ['companion']
  readonly relationship_tree_policy_id: string;     // семантика — DEV-SPEC-028
  readonly personal_arc_policy_id: string;
  readonly acquisition_policy_id: string;
  readonly conversion_policy_id?: string;           // пленные → напарники (исполнение — 028)
  readonly progression_policy_id: string;
  readonly equipment_policy_id: string;
  readonly maintenance_policy_id: string;
  readonly salary_policy_id: string;
  readonly reaction_policy_id: string;
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];     // ≥1 (gameplay lint)
}
```

```ts
// src/domain/party/EquipmentDefinition.ts
export type EquipmentSlot = 'weapon' | 'armor' | 'helmet' | 'accessory' | 'consumable';

export interface EquipmentDefinition {
  readonly id: string;                              // kebab-case
  readonly display_name_key: string;
  readonly slot: EquipmentSlot;
  readonly stat_modifiers: Readonly<Record<string, number>>;
  readonly tags: readonly string[];
  readonly good_id: string;                         // ссылка GoodDefinition (020)
  readonly durability_policy_id?: string;
  readonly required_skill?: string;                 // weak ref skill-id
}
```

```ts
// src/domain/party/PartyPolicies.ts — формы политик (числа — только в контенте)
export type PartyPolicyKind =
  | 'morale' | 'maintenance' | 'salary' | 'reaction' | 'personalArc'
  | 'skillProgression' | 'acquisition' | 'relationshipThresholds';

export interface MoralePolicyBody {
  readonly initial_morale: number;                  // [0,1]
  readonly mood_decay_per_tick: number;
  readonly global_weights: Readonly<{ moods: number; salaries: number; scars: number; events: number }>;
  readonly thresholds: readonly { level: 'low' | 'medium' | 'high'; at: number }[];
  readonly recompute_epsilon: number;               // порог эмита party.morale_changed
}
export interface MaintenancePolicyBody { readonly cost_per_tick: number; readonly currency: 'coin' | 'guild-credit'; }
export interface SalaryPolicyBody {
  readonly amount: number;
  readonly period_ticks: number;
  readonly overdue_morale_penalty: Readonly<{ per_period: number; max: number }>;
  readonly desertion_risk_threshold: number;        // сигнал, не решение (028)
}
export interface ReactionRule {
  readonly rule_id: string;
  readonly trigger_event: string;                   // зарегистрированный topic
  readonly condition?: Record<string, unknown>;     // простой предикат над payload/state
  readonly effects: readonly (
    | { kind: 'mood'; mood_tag: string; ttl_ticks: number; weight: number }
    | { kind: 'global_morale_delta'; sign: '+' | '-' }
    | { kind: 'scar'; scar_id: string }
    | { kind: 'epilogue_fact'; fact_key: string }
  )[];
}
export interface ReactionPolicyBody { readonly rules: readonly ReactionRule[]; }
export interface PersonalArcStage { readonly stage_id: string; readonly advance_condition_policy_id: string; readonly on_advance_effects: readonly ReactionRule['effects']; }
export interface PersonalArcPolicyBody { readonly stages: readonly PersonalArcStage[]; }   // линейная цепочка; ветвление — OQ-05
export interface SkillProgressionPolicyBody {
  readonly skills: readonly string[];
  readonly usage_to_level_base: Readonly<Record<string, number>>;   // базовый порог; кривая — функция уровня в коде модели
  readonly perk_pool_ids: readonly string[];
}
export interface AcquisitionPolicyBody { readonly requires: readonly { kind: 'quest' | 'reputation' | 'event' | 'hook'; ref: string }[]; }
export interface RelationshipThresholdsBody { readonly thresholds: readonly { at: number; tag: string }[]; } // данные; поведение — 028

export interface PartyPolicy {
  readonly id: string;
  readonly kind: PartyPolicyKind;
  readonly body: Record<string, unknown>;           // shape по kind — if/then в схеме
}
```

```ts
// partyStructurePolicy (отдельный kind, не partyPolicy)
export interface PartyStructurePolicy {
  readonly id: string;
  readonly max_companions: number;                  // ≥1
  readonly journal_cap: number;                     // INV-07
  readonly slots_by_tier?: Readonly<Record<string, number>>;  // резерв под 028
}
```

Инварианты определений:

- `PARTY-INV-01` — `CompanionDefinition.mechanic_ids.length ≥ 2`; каждая механика существует в реестре и имеет `role_tags ∋ 'companion'`.
- `PARTY-INV-02` — `EquipmentDefinition.good_id` разрешается в `GoodDefinition`; `slot` ∈ нормативных 5 значений.
- `PARTY-INV-03` — все `*_policy_id` разрешаются в записи `partyPolicy`/`partyStructurePolicy` соответствующего `kind` (graph integrity).
- `PARTY-INV-04` — определения не хранят рантайм-состояние (только данные).

### 5.2. Runtime: CompanionInstance

```ts
// src/domain/party/PartyInstance.ts
export type CompanionInstanceId = Brand<string, 'CompanionInstanceId'>;

export interface MoodEffect {
  readonly tag: string;
  readonly remaining_ticks: number;                 // TTL; ≤0 ⇒ expunge на ближайшем тике
  readonly morale_weight: number;                   // застывший на момент наложения вес
}

export interface SkillRuntime { readonly uses: number; readonly level: number; }

export interface CompanionInstance {
  readonly instance_id: CompanionInstanceId;
  readonly definition_id: CompanionDefId;
  readonly current_stats: Readonly<Record<string, number>>;  // base + прогрессия (без экипировки — INV-08)
  readonly hp: { current: number; max: number };
  readonly skills: Readonly<Record<string, SkillRuntime>>;
  readonly equipment: Readonly<Partial<Record<EquipmentSlot, string>>>; // equipment-instance ids
  readonly relationship_with_captain: number;       // [-1,1]; пишет 028, хранилище здесь
  readonly moods: readonly MoodEffect[];
  readonly permanent_scars: readonly string[];
  readonly arc_stage_index: number;                 // -1 = не начата; монотонно растёт
  readonly salary_overdue_periods: number;
  readonly tracker_states: Readonly<Record<string, unknown>>;  // persisted companion-механики
}
```

Эффективные статы считаются функцией `EquipmentModel.effectiveStats(companion, defs)`; в снимке не сериализуются (риск рассинхрона — INV-08).

### 5.3. Runtime: PartyInstance (корень агрегата)

```ts
export interface PartyJournalEntry {
  readonly event_id: string;                        // topic из ядра party.*
  readonly tick: number;
  readonly companion_id?: CompanionInstanceId;
  readonly epilogue_facts: readonly string[];       // fact_keys, опубликованные в IEpilogueFactPort
}

export type MoraleLevel = 'low' | 'medium' | 'high';

export interface PartyInstance {
  readonly party_id: string;
  readonly captain_id: string;                      // внешний ref; сущность — 032
  readonly structure_policy_id: string;
  readonly roster: readonly CompanionInstanceId[];  // порядок = порядок отображения
  readonly companions: Readonly<Record<CompanionInstanceId, CompanionInstance>>;
  readonly global_morale: number;                   // [0,1] — вывод INV-05
  readonly accrued_maintenance: number;             // накопленный неоплаченный расход
  readonly salary_due_tick: number;                 // следующий плановый день выплаты
  readonly journal: readonly PartyJournalEntry[];   // append-only, cap INV-07
}
```

Поле `morale_level` не хранится — это проекция `global_morale` по `MoralePolicy.thresholds` (пересчёт при чтении/загрузке).

Инварианты рантайма:

- `PARTY-INV-05` — `global_morale ∈ [0,1]` всегда; пересчёт — чистая идемпотентная функция `MoraleModel.recompute(state, policy)`.
- `PARTY-INV-06` — `roster` без дублей; ключи `companions` = ровно `roster`; погибшие удаляются из обоих (факт остаётся в журнале).
- `PARTY-INV-07` — журнал монотонен по `tick`; размер ≤ `journal_cap`; старые записи сворачиваются в summary-запись (`event_id: 'party.journal_summary'`, детали — Balance doc, OQ-08).
- `PARTY-INV-08` — `current_stats` не включают экипировочные модификаторы.
- `PARTY-INV-09` — `|roster| ≤ max_companions` (нарушение при загрузке ⇒ `Err(DOMAIN_PARTY_STATE_CORRUPTED)`).
- `PARTY-INV-10` — `hp.current ∈ [0, hp.max]`; `hp.current = 0` допустим только между событием ранения и обработкой смерти в одном тике.
- `PARTY-INV-11` — `arc_stage_index` не убывает; `salary_overdue_periods ≥ 0`.

### 5.4. Снимок (memento)

`PartySnapshot` = сериализуемый `PartyInstance` (форма §5.3 + companion-формы §5.2) с `$id` схемы `party-state.json`. Провайдер `PartyStateMementoProvider implements IMementoProvider`, `domainId: 'party'`; интеграция в композицию save-snapshot (006) без изменений протокола. При загрузке конвейер: JSON Schema → реструктуризация типов → проверка INV-05…11 → пересчёт производных. Провал любого шага: `Err(INFRA_PARTY_SCHEMA_INVALID)` или `Err(DOMAIN_PARTY_STATE_CORRUPTED)` (SPEC-PARTY-051). Журнал участвует в снимке, но никогда не используется для восстановления поведения replay'ом (только нарратив/эпилог).

---

## 6. Data-контракты и схемы

### 6.1. Механики (plugin'ы)

Контракт `MechanicDefinition` (004) без изменений. Нормативный набор core-механик пакета `party-core` (priorities — контрактные параметры очереди, tie-breaker по id как INV-10 004; окончательные значения фиксирует контент-тиккет):

| id | kind | lifecycle.scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `party-morale-tracker` | tracker | party | 300 | `world.tick_advanced`, `party.companion_mood_changed`, `party.companion_scar_applied`, `party.salary_overdue` | `party.morale_changed` | `{ last_decay_tick }` |
| `party-maintenance-charger` | tracker | party | 200 | `world.tick_advanced` | `party.maintenance_charged` | `{ last_charged_tick }` |
| `party-salary-scheduler` | tracker | party | 100 | `world.tick_advanced`, `party.salary_paid` | `party.salary_paid`, `party.salary_overdue`, `party.desertion_risk_elevated` | `{ next_due_tick }` |
| `party-reaction-resolver` | resolver | party | 400 | `cataclysm.effect_applied`, `combat.encounter_resolved`, `world.event_occurred`, `economy.price_shock` | `party.reaction_triggered`, `party.companion_mood_changed`, `party.companion_scar_applied` | `null` |
| `party-progression-resolver` | resolver | party | 350 | `party.companion_action_executed`, `combat.duel_action_executed` | `party.companion_skill_improved` | `null` |
| `companion-steam-pressure-boost-resolver` | resolver | companion | 100 | `combat.duel_action_executed`, `party.companion_action_executed` | `party.companion_pressure_boosted` | `null` |
| `companion-steam-repair-tracker` | tracker | companion | 90 | `world.tick_advanced`, `party.companion_action_executed` | `party.companion_repair_ready` | `{ repair_charges, last_used_tick }` |

Правила: persisted-состояния companion-трекеров живут в `CompanionInstance.tracker_states` и персистятся общим memento (отдельного провайдера нет); резолверы не имеют persisted state (INV 004); `role_tags` companion-механик ⊇ `['companion']`; namespace событий механик — `party.*` (SPEC-PARTY-012/023). Локальная тема `party.tick_advanced` не вводится — механики слушают `world.tick_advanced` (решение по alias — OQ-04).

### 6.2. JSON Schema (`content/schemas/`)

Ключевые ограничения (полные тела — artifact тикета `TKT-M8-001`; стиль — 020 §6.2):

- `companion-definition.json`: `required: [id, display_name_key, description_key, base_stats, mechanic_ids, relationship_tree_policy_id, personal_arc_policy_id, acquisition_policy_id, progression_policy_id, equipment_policy_id, maintenance_policy_id, salary_policy_id, reaction_policy_id, vulnerability_tags, counterplay_tags]`; `additionalProperties: false`; `mechanic_ids.minItems: 2`; `counterplay_tags.minItems: 1`; `id: {"pattern": "^[a-z0-9][a-z0-9-]*$"}`; `base_stats.required: [hp, strength, agility, endurance]`, значения `≥ 0`.
- `equipment-definition.json`: `slot: {"enum": ["weapon","armor","helmet","accessory","consumable"]}`; `good_id` обязателен; `stat_modifiers` — object of numbers; `additionalProperties: false`.
- `party-structure-policy.json`: `max_companions ≥ 1`, `journal_cap ≥ 1`, `additionalProperties: false`.
- `party-policy.json`: `{ id, kind: enum[8 значений], body }`, `additionalProperties: false`; `allOf/if-then` по `kind` — обязательные поля body (формы §5.1); `reaction.rules[].trigger_event` — pattern topic'а; `effects[].kind` enum.
- `party-state.json`: снимок §5.3/5.4; `global_morale: {"minimum":0,"maximum":1}`; `moods[].remaining_ticks ≥ 0`; `salary_overdue_periods ≥ 0`; `arc_stage_index ≥ -1`; `hp: current/max ∈ [0, …]`, `current ≤ max`; `journal.items.required: [event_id, tick]`; `additionalProperties: false` на всех уровнях.

### 6.3. Политики

Все числовые значения (стоимость содержания, суммы/периодичность зарплат, веса морали, TTL настроений, штрафы просрочки, пороги навыков, cap журнала) — только в контенте политик; код читает их через `IContentRegistry.getByKind('partyPolicy')`. Значения среза первой волны задаются файлом `content/partyPolicy/core.json` и правятся балансиром без изменения кода (Balance & Tuning — OVERVIEW §8). Переопределение политик контент-паками — механизм 003 (topo-порядок паков).

### 6.4. Событийный контракт

Ядро — регистрация в `content/events/party-core.json`, `source: core`, обязательный payload_schema:

| Topic | Payload (минимум) | Семантика |
|---|---|---|
| `party.companion_recruited` | companion_id, definition_id, tick | включён в roster |
| `party.companion_dismissed` | companion_id, reason_policy_id | уволен (решение — игрок/028) |
| `party.companion_died` | companion_id, cause_topic | погиб (cause — внешний topic) |
| `party.companion_wounded` | companion_id, severity | ранен |
| `party.companion_traumatized` | companion_id, trauma_tag | травма (стык wound-модели 029) |
| `party.companion_equipment_changed` | companion_id, slot, old_ref, new_ref | экипировка изменена |
| `party.companion_skill_improved` | companion_id, skill, new_level | навык повышен |
| `party.companion_relationship_changed` | companion_id, delta, to | отношение изменено (семантика — 028) |
| `party.companion_mood_changed` | companion_id, mood_tag, ttl_ticks, applied: bool | настроение наложено/снято |
| `party.companion_scar_applied` | companion_id, scar_id, source_topic | шрам наложен |
| `party.companion_scar_removed` | companion_id, scar_id | шрам снят |
| `party.morale_changed` | from, to, level | глобальная мораль изменилась (Δ > ε) |
| `party.salary_paid` | total_amount, currency, companion_ids | выплата произведена |
| `party.salary_overdue` | companion_ids, periods | просрочка наступила |
| `party.reaction_triggered` | companion_id, rule_id, trigger_topic | реакция сработала |
| `party.personal_arc_advanced` | companion_id, from_stage, to_stage | арка продвинулась |
| `party.desertion_risk_elevated` | companion_id, risk_score | сигнал риска (решает 028) |
| `party.maintenance_charged` | amount, currency | содержание начислено/списано |
| `party.ship_changed` | ship_class_id, personnel_limit | мост fleet→party (§1.3 п.2) |
| `party.companion_action_executed` | companion_id, action_tag, tick | внутренняя тема прогрессии/механик |
| `party.prisoner_conversion_requested` | prisoner_ref, conversion_policy_id | хук конверсии (исполнение — 028) |
| `party.journal_summary` | folded_from_tick, folded_to_tick | свёртка журнала (INV-07) |
| `party.companion_repair_ready`, `party.companion_pressure_boosted` | companion_id, … | примеры companion-механик (§6.1) |

Фракционные расширения (SPEC-PARTY-031): `party.industrial-steam.*`, `party.ancient-arcane.*`, `party.necromantic-corpse.*`, `party.living-artifact.*` — обязательная регистрация, payload schema, запрет коллизий ID с ядром, запрет переопределения ядерной семантики.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Настроение напарника:**

```
[clean] --reaction(mood)--> [mooded(tag,ttl)]
[mooded] --tick: ttl==0--> [clean]
[mooded] --scar applied--> [mooded_scarred]
[mooded_scarred] --scar removed--> [mooded]
[*] --dismissed / died--> [terminal]
```

Каждый переход — следствие конкретного события/тика и данных политики; недетерминированных переходов нет.

**(b) Зарплата напарника:**

```
[paid] --period elapsed--> [accruing]
[accruing] --wallet ok--> [paid]
[accruing] --period elapsed, funds short--> [overdue(n+1)]
[overdue(n)] --n ≥ threshold--> [risk-signalled]   (решение об уходе — 028 → dismissed/died)
[overdue(n)] --wallet ok--> [paid]
```

**(c) Личная арка:** `[-1 none] → [0 stage_1] → … → [k completed]`; продвижение исключительно через `AdvancePersonalArc` (доказательства выполнения `advance_condition_policy_id`) или `on_advance_effects` реакций; возврат стадии запрещён (INV-11).

### 7.2. Sequence diagrams

**(a) Найм:**
```
actor(028/квест) → RecruitCompanion.execute({definition_id, origin_evidence})
  → Content: CompanionDefinition + AcquisitionPolicy (все requires доказаны?)
      нет → Err(DOMAIN_PARTY_ACQUISITION_NOT_UNLOCKED)
  → PartyStructurePolicy: |roster| < max?  нет → Err(DOMAIN_PARTY_SLOT_FULL)
  → IPartyPersonnelPort.canAdd(captain, +1)  false → Err(DOMAIN_PARTY_PERSONNEL_LIMIT)
  → PartyStore: создать CompanionInstance (stats=base, moods=[], arc=-1, morale-вклад init)
  → EventBus.emit party.companion_recruited; journal.append
  → IEpilogueFactPort.publish('epilogue.party.recruited_companion', tick)
```

**(b) Покупка и экипировка:**
```
BuyEquipment({companion_id, equipment_id, market_node_id})
  → EquipmentDefinition (slot, good_id) ; ITradePricePort.quote(good_id, node, 1)
  → ITradeService.buy(...) [020]  Err(ECON_FUNDS_SHORT…) транзитом
  → EquipCompanion(slot): старый item → cargo (ICargoCapacityPort.release/commit)
  → emit party.companion_equipment_changed + мост economy.item_acquired
  → journal + (опц.) reaction-rules на покупку
```

**(c) Такт содержания/зарплаты (фаза `scope:party`):**
```
world.tick_advanced(t)
  → party-maintenance-charger: accrued += Σ maintenance.cost_per_tick → party.maintenance_charged
  → party-salary-scheduler: t == salary_due_tick ?
      да → попытка оплаты Σ salary.amount из казны [020 wallet]
          успех → party.salary_paid, overdue=0, due += period
          отказ → party.salary_overdue(periods+1) для каждого непровыплаченного
      → party-morale-tracker: recompute(weights + penalties + expired moods)
          Δ > ε → party.morale_changed
      → periods ≥ threshold → party.desertion_risk_elevated (per companion)
```

**(d) Катаклизм → реакция/шрам:**
```
cataclysm.effect_applied{node_id, effect_tags}
  → party-reaction-resolver: матч правил reaction_policy присутствующих напарников
      (локационный фильтр — слабый через world-ref, OQ-06)
  → совпало → party.reaction_triggered
      effect mood → party.companion_mood_changed (ttl, weight)
      effect scar → party.companion_scar_applied (+ mirror cataclysm.scar_recorded — consumer 026)
      effect epilogue_fact → IEpilogueFactPort.publish
  → party-morale-tracker пересчитает мораль на ближайшем тике
```

### 7.3. Tick-контракт

Фаза `scope:party` (значение `TickPhase` уже в Wave 0), позиция после `scope:economy` и `scope:cataclysm`, до `scope:combat` — боевые системы видят актуальную мораль того же такта (029 читает `GetPartyStatus`). Внутри фазы — очередь механик по убыванию priority, tie-breaker id (INV-10 004). Бюджет такта — контракт `TickBudgetPort` (цифры — DEV-SPEC-016). Пропуск фазы (LOD) допустим только для maintenance/scheduler-механик с детерминированным догоном по числу пропущенных тактов (курсоры `last_charged_tick`/`next_due_tick` в state трекеров).

### 7.4. Идемпотентность и детерминизм

- Потоки RNG (SPEC-PARTY-014): `rng.party.morale` (шум морали/оценка риска), `rng.party.progression` (вердикт повышения при равных условиях), `rng.party.reactions` (выбор из нескольких применимых эффектов одного правила — детерминированный выбор по потоку), `rng.party.recruitment` (вариация стартовых параметров при найме). Смешение запрещено; новых потоков спека не вводит.
- Модели (Morale/Progression/Salary/Equipment) — чистые функции; единственная точка мутации — `PartyStore` под замком use case / tick-обработчика.
- Правило воспроизведения: `load(save@N) → tick(N+1)` ≡ непрерывный прогон до `N+1` (CI determinism, расширение fixtures Wave 0).
- Идемпотентность доставки: повтор того же события игнорируется по ключу `(topic, tick, companion_id)` с warn-логом; журнал не удваивается (delivery-гарантии — 002, здесь — защита потребителя).

### 7.5. Прочие алгоритмы

**Прокачка через использование (SPEC-PARTY-006):**
```
onSkillUsed(c, skill, tick):
  s = c.skills[skill] ?? {uses:0, level:0}
  s.uses += 1
  need = policy.usage_to_level_base[skill] * curve(s.level)   // curve — фиксированная функция модели
  if s.uses >= need:
      s.level += 1; s.uses = 0
      emit party.companion_skill_improved(c, skill, s.level)  // выбор перка — 028
```
Сложность O(1) на событие. Буфер боя: во время активного энкаунтера (`combat.encounter_started` без `resolved`) события `party.companion_action_executed` копятся в упорядоченный буфер и применяются в первой фазе `scope:party` после `combat.encounter_resolved` — иначе нарушается INV-05 в бою (детерминизм порядка: буфер сортируется по (tick, seq)).

**Конвертация пленных:** контракт `conversion_policy_id` + эмит `party.prisoner_conversion_requested`; проверка слота и лимитов personnel — здесь; бросок риска/семантика обращения — 028 (OQ-02).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// domain/party/ITradePricePort.ts — owner: 027, impl: 020 (EconomyTradePriceAdapter)
export interface ITradePricePort {
  quote(good_id: string, node_id: string, quantity: number): Promise<Result<number, AppError>>;
}

// domain/party/IPartyPersonnelPort.ts — owner: 027, impl: 017
export interface IPartyPersonnelPort {
  canAdd(captain_id: string, headcount_delta: number): Promise<Result<boolean, AppError>>; // лимит «всего людей на борту» (SPEC-PARTY-003)
  currentTotal(captain_id: string): Promise<Result<number, AppError>>;
}

// domain/party/ICaptainStatePort.ts — owner: 027, impl: 032
export interface ICaptainStatePort {
  reputationModifier(captain_id: string): Result<number, AppError>;  // входит в weights реакций/зарплат
  isPresent(): Result<boolean, AppError>;
}

// domain/party/IEpilogueFactPort.ts — owner: 027 до передачи владельцем в 036 (OQ-07)
export interface IEpilogueFactPort {
  publish(fact_key: string, payload: Readonly<Record<string, unknown>>, tick: number): Result<void, AppError>;
}
```

### 8.2. Адаптеры

- `EconomyTradePriceAdapter` — делегат к MarketEngine 020 (прямых импортов экономики в domain нет).
- `NullPartyPersonnelPort` — `canAdd → Ok(true)`, `currentTotal → Ok(roster.length)` (dev/тесты до интеграции 017).
- `StubCaptainStatePort` — modifier 0, present true.
- `NoopEpilogueFactPort` — no-op в проде до 036; в тестах — in-memory collector (паттерн RecordingEventBus) для contract-тестов фактов.

### 8.3. Ошибки (`src/domain/party/PartyErrors.ts`)

| Код | Условие | recoverable? |
|---|---|---|
| `DOMAIN_PARTY_NOT_FOUND` | запрос несуществующего отряда | да |
| `DOMAIN_COMPANION_UNKNOWN` | instance/definition ref не найден | да |
| `DOMAIN_PARTY_SLOT_FULL` | превышение `max_companions` | да |
| `DOMAIN_PARTY_PERSONNEL_LIMIT` | отказ personnel-порта | да |
| `DOMAIN_PARTY_ACQUISITION_NOT_UNLOCKED` | acquisition-условия не выполнены | да |
| `DOMAIN_PARTY_EQUIPMENT_UNKNOWN` | equipment ref не найден | да |
| `DOMAIN_PARTY_EQUIPMENT_SLOT_MISMATCH` | `item.slot ≠ целевой слот` | да |
| `DOMAIN_PARTY_MORALE_RANGE` | внутренний баг вывода морали | нет (fail fast, INV-05) |
| `DOMAIN_PARTY_STATE_CORRUPTED` | инварианты снимка не проходят | нет (recovery-flow 006) |
| `APP_PARTY_SALARY_UNPAID` | ручная выплата при пустой казне | да |
| `INFRA_PARTY_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

Транзитные ошибки экономики (`ECON_*`) пробрасываются без обёртки (контракт 020). Все методы возвращают `Result`; throw запрещён кроме bootstrap fail-fast (001). Ключи локализации: `errors.party.*` (009).

---

## 9. Интеграционные точки

### 9.1. Потребляемые события

| Topic | Реакция | Канал |
|---|---|---|
| `world.tick_advanced` | драйвер maintenance/salary/mood-decay | фаза scope:party |
| `cataclysm.effect_applied` | reaction-rules (mood/scar/fact) | event-loop (resolver) |
| `combat.encounter_started` / `combat.encounter_resolved` | буфер прогрессии; потери → wounded/died; мораль-делта | event-loop |
| `fleet.ship_acquired` / `fleet.ship_lost` | emit `party.ship_changed`, пересчёт personnel-лимита | event-loop |
| `world.event_occurred` | общие реакции (репутация, слухи) | event-loop |
| `economy.price_shock` | экономические реакции настроений | event-loop |

### 9.2. Эмитируемые события

Все topics §6.4. Основные consumers: 028 (relationships, desertion decisions, conversion), 029–031 (roster/effective stats/мораль в бою), 034 (arc/reaction hooks), 036 (journal → эпилог), 020-side listener (`party.salary_paid → economy.expense_recorded`), 026-side listener (`party.companion_scar_applied → cataclysm.scar_recorded`).

### 9.3. Мосты к другим доменам

Реализация SPEC-PARTY-032 с поправками §1.3: `fleet.ship_acquired/lost → party.ship_changed`; `party.salary_paid → economy.expense_recorded`; `party.companion_equipment_changed → economy.item_acquired`; `cataclysm.effect_applied → party.reaction_triggered`; `party.companion_scar_applied → cataclysm.scar_recorded`; `combat.started/ended → party.*` (через encounter-topics 017-ядра до нормализации 029); факты `epilogue.party.*` в `IEpilogueFactPort`. Мосты декларативны; сторона-получатель регистрирует listener; внутренняя логика смежных доменов не раскрывается.

### 9.4. Use cases (`src/application/party/`)

| Use case | Вход (DTO) | Выход | Порты | События |
|---|---|---|---|---|
| `RecruitCompanion` | `{definition_id, origin_evidence[]}` | `CompanionInstance` DTO | Personnel, Content, Fact | recruited |
| `DismissCompanion` | `{instance_id, reason_policy_id}` | void | Content | dismissed |
| `EquipCompanion` | `{instance_id, slot, equipment_instance_id}` | effective stats DTO | Content | equipment_changed |
| `UnequipCompanion` | `{instance_id, slot}` | effective stats DTO | Cargo(020) | equipment_changed |
| `BuyEquipment` | `{instance_id, equipment_id, market_node_id}` | purchase receipt | TradePrice, ITradeService(020) | equipment_changed + econ bridge |
| `PaySalaries` | `{mode: 'full' \| 'arrears'}` | `{paid, failed[]}` | ITradeService | salary_paid / salary_overdue |
| `GetPartyRoster` | — | roster + effective stats | — | — |
| `GetPartyStatus` | — | `{morale, level, accrued, risks[]}` | Captain | — |
| `AdvancePersonalArc` | `{instance_id, evidence[]}` | `{from_stage, to_stage}` | Content | personal_arc_advanced |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие системы | l10n-ключ |
|---|---|---|---|---|
| content | схема пакета не проходит при загрузке | `INFRA_PARTY_SCHEMA_INVALID` | fail-fast bootstrap (стадия content) | `errors.party.schema` |
| domain | вывод морали вне `[0,1]` | `DOMAIN_PARTY_MORALE_RANGE` | остановка тика + panic-лог (INV-05) | — |
| application | найм сверх слота / personnel-лимит | `SLOT_FULL` / `PERSONNEL_LIMIT` | `Err` пользователю, состояние не изменено | `errors.party.slot_full`, `errors.party.personnel_limit` |
| integration | экономика: `ECON_FUNDS_SHORT` при автовыплате | транзит `ECON_*` | не платить → overdue-каскад (§7.2c) | `errors.econ.funds_short` |
| save | снимок не валиден при загрузке | `STATE_CORRUPTED` / schema-invalid | reject load, backup-политика 006 | `errors.party.corrupted` |
| runtime | duplicate доставка события | — | идемпотентный skip + warn | — |

Рассинхрон `roster ↔ companions` (INV-06) трактуется как corrupted. Превышение бюджета такта — LOD-догон (§7.3), пользовательская ошибка не эмитится.

---

## 11. Критерии приёмки

### `DEV-SPEC-027-R01` — Границы контекста
Требование: Party владеет только roster напарников; в состоянии/схеме нет полей корабля/экипажа/трюма/капитана; взаимодействие — только события/порты.
Invariant: PARTY-INV-01…04.
- AC01: запись-попытка `{ship_state: …}` в снимок → `Err(INFRA_PARTY_SCHEMA_INVALID)` (`additionalProperties:false`).
- AC02: CI-grep: в `src/domain/party/**` нет import'ов `domain/fleet`, `domain/economy`, `infrastructure/*` (кроме primitives и собственных портов).

### `DEV-SPEC-027-R02` — Разделение экипажа и отряда
Требование: пересечение только через лимит людей на борту (`IPartyPersonnelPort`); напарники не обслуживают корабль (нет таких механик/policy в пакете).
- AC03: при `canAdd=false` найм → `Err(DOMAIN_PARTY_PERSONNEL_LIMIT)`, roster не изменён.

### `DEV-SPEC-027-R03` — Структура отряда
Требование: капитан — внешний ref; `|roster| ≤ PartyStructurePolicy.max_companions`.
Invariant: PARTY-INV-09.
- AC04: найм сверх лимита → `Err(DOMAIN_PARTY_SLOT_FULL)`.

### `DEV-SPEC-027-R04` — Модель найма
Требование: только acquisition-политики (quest/reputation/event/hook); рыночного найма нет; пленные — через контракт конверсии (exec — 028).
- AC05: `RecruitCompanion` без доказанных `requires` → `Err(DOMAIN_PARTY_ACQUISITION_NOT_UNLOCKED)`.
- AC06: graph-lint: ни одна acquisition-политика пакета не имеет `kind:'market'`; прямой денежный найм невозможен (unit-тест use case без evidence всегда `Err`).

### `DEV-SPEC-027-R05` — Прокачка через использование
Требование: классов нет; `uses → порог → level+1 → событие`; повышения в бою буферизуются до конца энкаунтера.
- AC07: накопление `uses` до порога `usage_to_level_base * curve(level)` ⇒ ровно один `party.companion_skill_improved`, `level+1`, `uses=0`.
- AC08: 10 событий `party.companion_action_executed` внутри активного энкаунтера ⇒ ни одного повышения до `combat.encounter_resolved`; после — применения в порядке (tick, seq).

### `DEV-SPEC-027-R06` — Экипировка по слотам
Требование: 5 нормативных слотов; effective stats = base + modifiers; `good_id` обязателен; смена — событие.
Invariant: PARTY-INV-02, INV-08.
- AC09: `EquipCompanion(weapon ← armor-item)` → `Err(DOMAIN_PARTY_EQUIPMENT_SLOT_MISMATCH)`, слот не изменён.
- AC10: unit-тест `effectiveStats`: экипировка предмета с `{strength:+5}` даёт ровно +5; снятие — возврат baseline.

### `DEV-SPEC-027-R07` — Гибридная мораль
Требование: `global_morale = f(events, moods(TTL), scars, salary-defaults)` по `MoralePolicy`; уровень — проекция; всё data-driven.
Invariant: PARTY-INV-05.
- AC11: fixture-политика: 3 негативных mood ⇒ мораль падает и `level='low'` (GetPartyStatus).
- AC12: истечение TTL на следующем тике возвращает мораль к baseline ± ε политики; эмита нет, если Δ ≤ ε.

### `DEV-SPEC-027-R08` — Контракт напарника
Требование: definition = ≥2 mechanics + relationship policy + arc + reactions + counterplay; рантайм-состояния в definition нет.
- AC13: definition с 1 механикой → `Err(INFRA_PARTY_SCHEMA_INVALID)` (minItems 2).
- AC14: companion-механика без `role_tags ∋ 'companion'` → падение `validate-party-graph` (ci:validate красный).

### `DEV-SPEC-027-R09` — Содержание и зарплата
Требование: maintenance начисляется каждый такт; salary периодическая; просрочка → penalty морали (clamp) → `desertion_risk_elevated` (решает 028); выплата → экономический мост.
- AC15: нулевая казна, `period_ticks*k` ⇒ `salary_overdue_periods=k`, мораль ≥ clamp `overdue_morale_penalty.max`.
- AC16: успешная `PaySalaries` эмитит `party.salary_paid` и порождает `economy.expense_recorded` (bridge test на recording bus).

### `DEV-SPEC-027-R10` — Нарративный слой
Требование: reaction-rules матчат триггер-события; арка монотонна; факты публикуются.
- AC17: synthetic `cataclysm.effect_applied`, совпадающее правило ⇒ `party.reaction_triggered` + `party.companion_mood_changed` + факт `epilogue.party.*` в коллекторе Noop-port.
- AC18: `AdvancePersonalArc` с evidences ⇒ `party.personal_arc_advanced` + journal; попытка «назад» → `Err` (INV-11).

### `DEV-SPEC-027-R11` — Переиспользование механик
Требование: контракт `MechanicDefinition` не расширяется; companion-механики в общем реестре; ссылки только на зарегистрированные события.
- AC19: все механики `content/mechanics/party.json` проходят `mechanic-definition.json` + INV-01…05 (004); contract-тест зелёный.

### `DEV-SPEC-027-R12` — Событийная модель
Требование: ядро §6.4 зарегистрировано полностью; фракционные namespace'ы без коллизий.
- AC20: CI-сверка: список topics §6.4 ⊆ `content/events/party-core.json` (иначе ci:graph красный).
- AC21: negative-fixture фракционное событие с ID ядерного topic → `Err` graph-стадии.

### `DEV-SPEC-027-R13` — RNG
Требование: ровно 4 потока `rng.party.*`; запрет `Math.random`/`Date.now` в layer'ах party.
- AC22: rng-streams CI-стадия: в fixture-прогоне задействованы ровно 4 party-потока, изоляция подтверждена (diff-проверка состояний при независимом потреблении).

### `DEV-SPEC-027-R14` — Сохранения
Требование: полный снимок + журнал; валидация схемы и инвариантов при загрузке; журнал не восстанавливает поведение.
Invariant: PARTY-INV-06…11.
- AC23: save→load→deep-equal снимка (кроме пересчитываемых производных); 20 тактов после load ≡ контрольный прогон.
- AC24: negative-fixture (`global_morale: 1.5`, `reserved` аналог — дубль в roster) → `Err(DOMAIN_PARTY_STATE_CORRUPTED)`/schema-invalid; загрузка отклонена.

### `DEV-SPEC-027-R15` — CI
Требование: schema + graph + gameplay lint для party-контента (SPEC-PARTY-060…063).
- AC25: negative-fixtures ловятся: отсутствие arc-policy, 0 counterplay tags, битый `good_id`, циклическая ссылка companion→companion, дубликат ID в реестре — каждая стадия `ci:validate` даёт ожидаемую ошибку.

### `DEV-SPEC-027-R16` — Вертикальный срез первой волны
Требование: 3 напарника × (механики, экипировка 10 предметов, мораль, шрамы, арки, реакции) + мосты combat/economy/cataclysm/narrative собираются в демо (SPEC-PARTY-070/071/080).
- AC26: `bun run demo:m8` завершается `Ok`: найм 3 → покупка/экипировка 10 предметов → 20 тактов (maintenance/salary) → synthetic cataclysm-effect (mood+scar) → synthetic combat-loss (wounded→died одного) → save/load → идентичное продолжение 10 тактов; журнал содержит ≥1 запись каждого ключевого topic среза.

### `DEV-SPEC-027-R17` — Детерминизм
Требование: одинаковый seed ⇒ идентичный прогон независимо от пути загрузки (SPEC-PARTY-040).
- AC27: determinism-CI сценарий party (10 тактов + save + load + 10 ≡ 20) зелёный; снапшот-хэш совпадает.

---

## 12. Тест-план

| Подход | ID | Покрывает | Инструмент |
|---|---|---|---|
| Unit | T01 | схемы definitions/policies positive/negative | vitest + ajv |
| Unit | T02 | MoraleModel: recompute/decay/clamp/ε | vitest |
| Unit | T03 | ProgressionModel: пороги, curve, боевой буфер | vitest |
| Unit | T04 | SalaryModel: overdue/penalty/threshold-signal | vitest |
| Unit | T05 | EquipmentModel: effective stats, slot mismatch | vitest |
| Integration | T06 | use cases + EventBus recording (recruit→equip→pay→dismiss) | vitest |
| Integration | T07 | фаза scope:party через GameClock/MechanicRuntime (007/004) | vitest |
| Integration | T08 | мосты: cataclysm→scar; combat→casualty; fleet→ship_changed | vitest |
| Contract | T09 | пакет `party-core` против всех схем | ci:schemas |
| Contract | T10 | полный перечень topics §6.4 зарегистрирован, payloads валидны | ci:graph |
| Contract | T11 | companion-mechanics против `mechanic-definition.json` | ci:graph |
| Determinism | T12 | save/load/replay party-сценария | ci:determinism |
| Determinism | T13 | изоляция 4 rng-потоков; grep Math.random/Date.now | ci:rng-streams |
| E2E | T14 | demo:m8 (сценарий AC26) | script |
| CI | T15 | `validate-party-graph.ts` | tools/ci |
| CI | T16 | `validate-party-lint.ts` (counterplay≥1, arc exists, reaction≥1, dup ids, cycle refs) | tools/ci |

Покрытие: каждый AC01…AC27 присутствует минимум в одном тесте; матрица AC↔T ведётся в `TICKETS-M8`. Negative-fixtures — `test/party/fixtures/negative/`.

---

## 13. Производительность

### 13.1. Бюджет
Фаза `scope:party` укладывается в общий tick budget (контракт 007/016; цифры — DEV-SPEC-016). Нормативная асимптотика: morale recompute — O(|roster|·|moods|); подбор реакций — O(подписок по topic) с pre-index-map `trigger_event → rules` (полное сканирование journals/правил запрещено); salary scheduler — O(|roster|) только в день выплаты, иначе O(1).

### 13.2. LOD
При перегрузке такта: mood-decay батчится (раз в k тиков с детерминированным догоном); reaction-resolver может пропускать правила с флагом `non_critical` в политике; critical-эффекты (scar, death, desertion signal) — никогда.

### 13.3. Профилирование
Счётчики событий `party.*`, длительность фазы, размер боевого буфера — в `ci:validation-report` (json-репортёр, паттерн 020 §13.3). Нагрузочный сценарий: 12 напарников × 200 активных настроений × 500 тактов + 1000 реакций/такт-пик.

---

## 14. Миграции

`party-state.json` v1. Breaking-изменения формата снимка — только через major bump save-формата; регламент — будущий документ Save Migrations (OVERVIEW §8). Контент-политики версируются пакетами (003). Поля определений — additive-only в minor; удаление поля определения — только major контента + lint-миграция в 038.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому назначен | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Поправка DESIGN SPEC-PARTY-032 (имена мостовых событий, §1.3 п.1) | нет (спека нормативна) | design | до review Wave 5 |
| OQ-02 | Полная семантика конверсии пленных — объём 028 | нет | arch | при генерации 028 |
| OQ-03 | Источник ранений до выхода 029 (proxy `combat.encounter_resolved`) — подтвердить контрактом 029 | TKT-M8-016 (мост-тесты) частично | arch | до Wave 5 review |
| OQ-04 | Вводить ли ядерную тему `party.tick_advanced` вместо прямого consumption `world.tick_advanced` | нет | arch | до Wave 5 |
| OQ-05 | Нелинейные (ветвящиеся) личные арки — перенести формализм в 034 | нет | design | до Wave 6 |
| OQ-06 | Локационный фильтр реакций (напарник рядом с узлом катаклизма) зависит от world-position контракта 023 | AC17 partial-реализация | arch | до Wave 5 review |
| OQ-07 | Передача владельца `IEpilogueFactPort` в 036 (сейчас owner-стаб в 027; прецедент Q-01 020) | нет | arch | при генерации 036 |
| OQ-08 | Cap и формат свёртки журнала (INV-07) — балансировочное значение | нет | balance | Balance & Tuning |
| OQ-09 | Разнесение `partyPolicy`-контейнера на отдельные ContentKind при росте числа политик | нет | arch | до Wave 6 |

Правило шаблона: ни один тикет не открывается с незакрытым OQ, указанным в его поле «Блокирует».

---

## 16. Что остаётся вне scope

- Числовой баланс: статы, цены, веса морали, TTL, пороги, штрафы, периоды — контент + Balance & Tuning (OVERVIEW §8).
- Отношения, synergy, recruitment-квесты, permadeath legacy, решение о дезертирстве, обращение пленных → `DEV-SPEC-028`.
- Wound/trauma-модель, смерть в бою, дуэли, battlefield, распределение урона → `DEV-SPEC-029…031`.
- Капитан: возраст, пенсия, репутация, клятвы → `DEV-SPEC-032`.
- Скрытые ветки трансформации (здесь только контракт `acquisitionHook`) → `DEV-SPEC-033`.
- Диалоги, тексты арок, story beacons → `DEV-SPEC-034`; environmental storytelling → `DEV-SPEC-035`.
- Чтение журнала и генерация эпилога → `DEV-SPEC-036`.
- UI/HUD отряда, экраны менеджмента, мобильный UX → `DEV-SPEC-013/016`.
- Миграции сохранений; сервер/мультиплеер — вне проекта по INTENT.
- Финальные лорные названия, арт/VFX/аудио, конкретные нарративные тексты.
- Authoring-валидаторы контента отряда сверх CI-минимума → `DEV-SPEC-038`.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | Ожидаемый TKT (M8) |
|---|---|---|---|---|
| SPEC-PARTY-001/002/004 | R01/R03 | AC01,AC02,AC04 | T01,T06 | M8-001,004,005 |
| SPEC-PARTY-003 | R02 | AC03 | T06,T08 | M8-003,016 |
| SPEC-PARTY-005 | R04 | AC05,AC06 | T01,T06 | M8-006,014 |
| SPEC-PARTY-006 | R05 | AC07,AC08 | T03 | M8-008 |
| SPEC-PARTY-007/022 | R06 | AC09,AC10 | T05,T09 | M8-007,017 |
| SPEC-PARTY-008 | R07 | AC11,AC12 | T02,T07 | M8-009,010 |
| SPEC-PARTY-009/021/023 | R08/R11 | AC13,AC14,AC19 | T01,T11 | M8-002,011 |
| SPEC-PARTY-010 | R09 | AC15,AC16 | T04,T07 | M8-010,016 |
| SPEC-PARTY-011 | R10 | AC17,AC18 | T08 | M8-012,013 |
| SPEC-PARTY-013/030/031 | R12 | AC20,AC21 | T10 | M8-015 |
| SPEC-PARTY-032 | §9.3 | AC03,AC16,AC17 | T08 | M8-016 |
| SPEC-PARTY-014/040/041 | R13/R17 | AC22,AC27 | T12,T13 | M8-018,019 |
| SPEC-PARTY-015/024/050/051 | R14 | AC23,AC24 | T12 | M8-005,018 |
| SPEC-PARTY-016/060…063 | R15 | AC25 | T09,T15,T16 | M8-020 |
| SPEC-PARTY-070/071/080 | R16 | AC26 | T14 | M8-017,021 |
| GD-07/08/09 | §4,§5.4,§6 | AC01,AC23 | T09,T12 | M8-001,018 |
| INT-21/22/30/33.5 | весь документ | AC26 | T14 | M8-021 |

Итог декомпозиции (предварительный, уточняется TICKET-TEMPLATE): 21 тикет `TKT-M8-001…021`, веха `TICKETS-M8 v1.0 — «Party Management»` (Wave 5, демо `demo:m8`). Каталог тикетов создаётся после перевода спеки в статус `approved`.

---

## Приложение A. Чек-лист Definition of Done (OVERVIEW §7 + TEMPLATE App.A)

- ✅ секции шаблона 1–17 присутствуют, нумерация сохранена; неприменимых секций нет (§0 добавлен как служебная, не нарушает 1–17);
- ✅ все TS-интерфейсы и типы зафиксированы (§5, §8.1);
- ✅ JSON Schema: перечень + ключевые ограничения (§6.2); полные тела — artifact TKT-M8-001;
- ✅ state machines / sequence diagrams описаны (§7.1, §7.2);
- ✅ порты и адаптеры имеют контракты + заглушки (§8);
- ✅ ошибки — только `Result<T,E>` (§8.3, §10);
- ✅ каждое R01…R17 имеет ≥1 AC (AC01…AC27);
- ✅ тест-план unit/integration/contract/determinism/E2E/CI, покрытие всех AC (§12);
- ✅ структура файлов и директорий зафиксирована (§4.2);
- ✅ зависимости перечислены (§2);
- ✅ OQ закрыты или явно помечены как блокеры (§15);
- ✅ DESIGN-источник указан, расхождения отмечены (§1.3 п.1–3);
- ✅ все ID уникальны, нумерация сквозная без пропусков.
