# DEV-SPEC-030 v1.0 — «Duel System (fencing, boarding equipment, faction doctrines)»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 5 (Party, Companions & Combat), четвёртый блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-029`
**Блокирует:** `DEV-SPEC-031`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Бой команд на фоне дуэли»` (SPEC-COMBAT-003, 007, 010, 020, 022, 024, 030, 040/041, 050/051, 060…063, 070, 080)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (фракции, доктрины), `DEV-SPEC-027` (экипировка), `DEV-SPEC-028` (ослушание), `DEV-SPEC-029` (оркестратор, урон), `DEV-SPEC-031` (поле боя), `DEV-SPEC-032` (капитан как дуэлянт)
**Порождает веху:** `TICKETS-M25`

---

## 0. Как читать эту спеку

Дуэль — одно из двух пространств боя (029). Здесь — только механика поединка: стили, абордажные средства, фракционные доктрины, действия, выносливость, ранение/поражение капитана. Оркестрация, урон и переходы — 029. Поле боя отряда — 031.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`DuelDoctrineDefinition`**: фракционная доктрина поединка — базовый стиль, абордажная экипировка, уникальные механики, теги уязвимости и контрплея;
- **`DuelState`** (расширение 029): HP/выносливость обоих капитанов, стиль, активные эффекты, история действий;
- **`DuelResolver`**: детерминированный расчёт действия (удар, парирование, манёвр, применение средства), расход выносливости, урон, ранение;
- **4 фракционные доктрины** первой волны с принципиально разными уникальными механиками;
- **события** `combat.duel_*` (эмиссия), `combat.<faction>.*` расширения;
- **RNG**: поток `rng.combat.duel` (+ `rng.combat.damage` из 029);
- **CI**: schema/graph/gameplay lint для доктрин (≥1 уникальная механика, контрплей, запрет числового баланса);
- **демо** `demo:m25`.

### 1.2. Что спецификация НЕ делает

- Не реализует оркестрацию боя, фазы, переходы → `DEV-SPEC-029`.
- Не реализует урон по бойцам отряда и мораль поля боя → `DEV-SPEC-031` (дуэль влияет на них через политику 029).
- Не определяет статы и репутацию капитана → `DEV-SPEC-032`.
- Не определяет фракции и их контент → `DEV-SPEC-017`.
- Не содержит числовой баланс, тексты, арт/VFX/аудио.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-COMBAT-003` (расширенная дуэль) | §5.1, §7.1, R01 | нет |
| `SPEC-COMBAT-007` (фракционная асимметрия) | §5.2, §6.5, R02 | нет |
| `SPEC-COMBAT-010` (механики) | §6.1, R06 | нет |
| `SPEC-COMBAT-020/022` (`DuelDoctrineDefinition`) | §5.2 | нет |
| `SPEC-COMBAT-024` (переиспользование) | §6.1 | нет |
| `SPEC-COMBAT-030/031` (события) | §6.4, R05 | нет |
| `SPEC-COMBAT-040/041` (детерминизм) | §7.4, R07 | нет |
| `SPEC-COMBAT-050/051` (снимки) | §5.3, R08 | нет |
| `SPEC-COMBAT-060…063` (валидация) | §12.6, R09 | нет |
| `SPEC-COMBAT-070` (4 доктрины) | §6.5, R03 | нет |
| `SPEC-COMBAT-080` (срез) | §11 R10 | нет |

**Расхождения:** DESIGN перечисляет 4 стиля через «базовый стиль: фехтование»; здесь стиль — enum `fencing` только для первой волны, расширение — данными (OQ-01).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-029` | `CombatInstance`, `DuelState`, `DamageModel`, оркестратор |

### 2.2. Мягкие

`DEV-SPEC-017` (фракции), `DEV-SPEC-027` (экипировка капитана), `DEV-SPEC-028` (ослушание при приказе), `DEV-SPEC-031` (влияние на поле боя), `DEV-SPEC-032` (статы капитана), `DEV-SPEC-036` (факты).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/duel/**`, `src/application/duel/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Duel Doctrine | Фракционная конфигурация поединка: стиль, средства, уникальные механики |
| Boarding Equipment | Абордажные средства (пистолеты, гранаты, ритуальные предметы) |
| Duel Action | Одно действие дуэлянта: атака, парирование, манёвр, применение средства |
| Stamina | Выносливость дуэлянта; расходуется действиями, восстанавливается политикой |
| Unique Mechanic | Механика, обязанная быть уникальной для доктрины (gameplay lint) |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/duel/` — `DuelDoctrineDefinition`, рантайм дуэли, `DuelResolver`, `DuelModel`, ошибки, порты.
- `src/application/duel/` — use cases (`ExecuteDuelAction`, `GetDuelState`).
- `src/infrastructure/duel/` — резолвер-адаптер, трекер доктрины, event-handlers, memento-секция.
- `content/{duelDoctrine,duelPolicy}/`, `content/mechanics/duel.json`.

### 4.2. Файлы

```text
src/domain/duel/
  DuelDoctrineDefinition.ts
  DuelState.ts
  DuelErrors.ts
  DuelModel.ts
  IBoardingEquipmentPort.ts
src/application/duel/
  ExecuteDuelAction.ts
  GetDuelState.ts
src/infrastructure/duel/
  DuelResolver.ts
  DuelTickHandler.ts
  DuelEventHandler.ts
  NullBoardingEquipmentPort.ts
content/schemas/duel-doctrine.json
content/duelDoctrine/core.json
content/mechanics/duel.json
tools/ci/stages/validate-duel-lint.ts
test/duel/…
scripts/demo-m25.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `IDuelResolver` | `DuelResolver` | singleton | `domain-init` |
| `IBoardingEquipmentPort` | `NullBoardingEquipmentPort` (замена в 027) | singleton | `integration` |
| `IMementoSection('duel')` | секция в `combat-state.json` (029) | singleton | `save-composition` |
| `duel-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. DuelAction и состояние

```ts
export type DuelStyle = 'fencing';
export type DuelActionKind = 'attack' | 'parry' | 'maneuver' | 'use_equipment' | 'taunt';

export interface DuelAction {
  readonly kind: DuelActionKind;
  readonly equipment_id?: string;
  readonly target_tag?: string;
}

export interface DuelistRuntime {
  readonly captain_id: string;
  readonly hp: number;
  readonly stamina: number;
  readonly active_effects: readonly { readonly id: string; readonly expires_tick: number }[];
  readonly actions_history: readonly DuelAction[];
}

export interface DuelRuntime {
  readonly style: DuelStyle;
  readonly duelists: Readonly<Record<string, DuelistRuntime>>;
  readonly doctrine_by_captain: Readonly<Record<string, string>>;
  readonly round: number;
}
```

Инварианты: `DUEL-INV-01` — `hp ∈ [0, max]`, `stamina ∈ [0, max]`; `DUEL-INV-02` — `actions_history` append-only; `DUEL-INV-03` — `doctrine_by_captain` разрешается в `DuelDoctrineDefinition`.

### 5.2. DuelDoctrineDefinition

```ts
export interface DuelDoctrineDefinition {
  readonly id: string;
  readonly faction_id: string;
  readonly display_name_key: string;
  readonly base_style: DuelStyle;
  readonly boarding_equipment_policy_id: string;
  readonly unique_mechanic_ids: readonly string[];
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `DUEL-INV-04` — доктрина уникальна для фракции (одна активная на фракцию); `DUEL-INV-05` — `unique_mechanic_ids.length ≥ 1`; `DUEL-INV-06` — `counterplay_tags.length ≥ 1`; `DUEL-INV-07` — доктрина не хранит числовой баланс.

### 5.3. Снимок

Секция `duel` внутри `combat-state.json` (029): `{ duel: DuelRuntime | null }`. Валидация — схемой `combat-instance.json` (расширение) + инварианты DUEL-INV-01…03.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `duel-action-resolver` | resolver | combat | 110 | `combat.duel_action_executed` | `combat.duel_damage_dealt`, `combat.duel_stamina_changed` | `null` |
| `duel-pressure-tracker` | tracker | combat | 70 | `combat.duel_action_executed`, `combat.duel_damage_dealt` | `combat.industrial-steam.pressure-boost-activated` | `{ pressure }` |
| `duel-leyline-tracker` | tracker | combat | 70 | `combat.duel_action_executed` | `combat.ancient-arcane.leyline-channel-opened` | `{ channel }` |
| `duel-necrotic-tracker` | tracker | combat | 70 | `combat.duel_action_executed` | `combat.necromantic-corpse.corpse-ritual-performed` | `{ ritual_charges }` |
| `duel-artifact-tracker` | tracker | combat | 70 | `combat.duel_action_executed` | `combat.living-artifact.corpus-adaptation-triggered` | `{ adaptation }` |

### 6.2. JSON Schema

- `duel-doctrine.json` — `base_style` enum; `unique_mechanic_ids` minItems 1; `vulnerability_tags`/`counterplay_tags` minItems 1; `additionalProperties: false`.
- Расширение `combat-instance.json` — объект `duel` с `hp`/`stamina` ≥0, `actions_history` items required [kind].

### 6.3. Политики

`boarding_equipment_policy_id` (набор средств и их эффекты), `duel_style_policy_id` (стоимость действий, восстановление выносливости), `duel_impact_policy_id` (из 029). Все числа — в контенте.

### 6.4. События

Эмиссия: `combat.duel_action_executed{action_kind, actor_id}`, `combat.duel_damage_dealt{target_id, amount, factors}`, `combat.duel_stamina_changed{actor_id, delta}`, `combat.duel_captain_wounded{captain_id}`, `combat.duel_captain_defeated{captain_id}`.

Фракционные: `combat.industrial-steam.pressure-boost-activated`, `combat.ancient-arcane.leyline-channel-opened`, `combat.necromantic-corpse.corpse-ritual-performed`, `combat.living-artifact.corpus-adaptation-triggered`.

### 6.5. Контент первой волны

4 доктрины: `steam-fencing-doctrine` (industrial-steam), `arcane-leyline-doctrine` (ancient-arcane), `necrotic-corpse-doctrine` (necromantic-corpse), `relic-volition-doctrine` (living-artifact). Каждая — ≥2 уникальные механики и ≥1 контрплейный тег.

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Дуэльный раунд**

```
[ready] --duel_action_executed--> [resolving] 
[resolving] --stamina ok--> [ready(round+1)]
[resolving] --stamina < cost--> [exhausted]
[exhausted] --recovery_policy--> [ready]
[ready|exhausted] --hp<=0 ∧ wound_policy--> [wounded]
[wounded] --hp<=0--> [defeated] + emit duel_captain_defeated
```

**(b) Применение средства**

```
[ready] --use_equipment(id)--> [effect_active(ttl)]
[effect_active] --tick: ttl==0--> [ready]
```

### 7.2. Sequence: действие дуэлянта

```
ExecuteDuelAction{instance_id, captain_id, action}
  → DuelDoctrineDefinition (doctrine_by_captain)
  → DuelModel.validate(action, stamina) → Err(DUEL_STAMINA_SHORT) при нехватке
  → DuelResolver.resolve(action, doctrine, rng.combat.duel)
      → combat.duel_action_executed
      → DamageModel.apply(...) [029] → combat.duel_damage_dealt
      → combat.duel_stamina_changed
  → проверка ранения/поражения → duel_captain_wounded|defeated
```

### 7.3. Tick-контракт

Дуэльные механики исполняются в фазе `scope:combat` (029) с `priority` из §6.1; TTL эффектов уменьшается на каждом такте боя. Дуэль не имеет собственной фазы.

### 7.4. Идемпотентность и детерминизм

Случайность — только `rng.combat.duel` (выбор исхода действия) и `rng.combat.damage` (029). Порядок дуэлянтов — стабильный по `captain_id`. Повторное действие с тем же `(round, captain_id)` игнорируется.

### 7.5. Расчёт действия

```
resolve(action, doctrine, rng):
  cost = stylePolicy.cost(action.kind)
  if actor.stamina < cost: return Err(DUEL_STAMINA_SHORT)
  roll = rng.nextFloat()
  success = roll < stylePolicy.successChance(action.kind, doctrine)
  if success and action.kind == 'attack':
      dmg = DamageModel.base(action, doctrine)   // без чисел в коде
      return {damage: dmg, staminaDelta: -cost}
  if success and action.kind == 'parry':
      return {damage: 0, staminaDelta: -cost, effect: 'parry_window'}
  ...
```

Сложность O(1) на действие.

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 030; impl: 027
export interface IBoardingEquipmentPort {
  available(captainId: string, doctrineId: string): Result<readonly string[], AppError>;
  consume(captainId: string, equipmentInstanceId: string): Result<void, AppError>;
}
```

### 8.2. Адаптеры

`NullBoardingEquipmentPort` (возвращает средства из фикстуры, `consume → Ok`).

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_DUEL_UNKNOWN` | дуэль/капитан не найден | да |
| `DOMAIN_DUEL_STAMINA_SHORT` | нехватка выносливости | да |
| `DOMAIN_DUEL_EQUIPMENT_UNAVAILABLE` | средство недоступно | да |
| `DOMAIN_DUEL_DOCTRINE_MISSING` | у фракции нет доктрины | нет |
| `DOMAIN_DUEL_ACTION_INVALID` | действие не разрешено стилем | да |
| `INFRA_DUEL_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`combat.transition_to_duel` (029) → старт дуэли; `combat.order_issued` (028) → ослушание влияет на доступные действия.

### 9.2. Эмитируемые

Темы §6.4; consumers — 029 (урон/фазы), 031 (влияние на поле боя), 028 (реакции), 036 (факты).

### 9.3. Мосты

`combat.duel_captain_defeated → combat.resolution_triggered` (029); `combat.duel_captain_wounded → epilogue.combat.captain_wounded` (036); фракционные события → 011 (VFX).

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `ExecuteDuelAction` | `{instance_id, captain_id, action}` | `{success, damage, stamina}` | Equipment | `duel_action_executed`, `duel_damage_dealt` |
| `GetDuelState` | `{instance_id}` | `DuelRuntime` | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_DUEL_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | нехватка выносливости | `DOMAIN_DUEL_STAMINA_SHORT` | `Err`, раунд не меняется |
| domain | нет доктрины | `DOMAIN_DUEL_DOCTRINE_MISSING` | `Err`, бой не стартует |
| application | неизвестная дуэль | `DOMAIN_DUEL_UNKNOWN` | `Err` |
| save | снимок невалиден | `INFRA_DUEL_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-030-R01 — Действия и выносливость
Требование: действие стоит выносливости по политике; при нехватке — ошибка без изменения состояния.
Invariant: DUEL-INV-01/02.

- AC01: Given `stamina=5` и стоимость 10, When `ExecuteDuelAction`, Then `Err(DOMAIN_DUEL_STAMINA_SHORT)`.
- AC02: Given успешная атака, When действие, Then `combat.duel_action_executed` + `duel_damage_dealt` + `duel_stamina_changed{-10}`.

### DEV-SPEC-030-R02 — Фракционные доктрины
Требование: у каждой фракции одна активная доктрина; доктрины различаются уникальными механиками.
Invariant: DUEL-INV-04…07.

- AC03: Given 4 доктрины, When загрузка, Then у каждой фракции ровно одна.
- AC04: Given две доктрины одной фракции, When `ci:validate --stage=graph`, Then ошибка.

### DEV-SPEC-030-R03 — Уникальные механики
Требование: каждая доктрина имеет ≥1 уникальную механику; уникальность проверяется lint.

- AC05: Given доктрина без `unique_mechanic_ids`, When gameplay lint, Then ошибка.
- AC06: Given механика, повторно использованная в двух доктринах, When lint, Then ошибка уникальности.

### DEV-SPEC-030-R04 — Абордажные средства
Требование: средство доступно по политике и расходуется при применении.

- AC07: Given средство доступно, When `use_equipment`, Then эффект активен на TTL и `consume` вызван.
- AC08: Given средство недоступно, When действие, Then `Err(DOMAIN_DUEL_EQUIPMENT_UNAVAILABLE)`.

### DEV-SPEC-030-R05 — Событийная модель
Требование: `combat.duel_*` эмитятся ровно один раз на действие; фракционные расширения не коллидируют с ядром.

- AC09: Given одно действие, When резолв, Then ровно одно `duel_action_executed` (без дублей).
- AC10: Given фракционное событие с ID ядра, When graph, Then `Err`.

### DEV-SPEC-030-R06 — Переиспользование механик
Требование: контракт 004 не расширяется; `role_tags ∋ 'combat'`.

- AC11: Given дуэльные механики, When `--stage=mechanics`, Then все проходят контракт.

### DEV-SPEC-030-R07 — RNG
Требование: только `rng.combat.duel` (и `rng.combat.damage` из 029).

- AC12: Given fixture-прогон дуэли, When `--stage=rng-streams`, Then используются только разрешённые потоки.

### DEV-SPEC-030-R08 — Сохранения
Требование: дуэльное состояние входит в снимок боя и восстанавливается.

- AC13: Given save→load посреди дуэли, When продолжение, Then `DuelRuntime` deep-equal и исход совпадает.

### DEV-SPEC-030-R09 — CI
Требование: schema + lint для доктрин.

- AC14: Given negative-fixtures (нет уникальной механики, нет контрплея, числовое поле в доктрине), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-030-R10 — Вертикальный срез
Требование: дуэль 4 доктрин воспроизводится как `demo:m25`.

- AC15: Given `bun run demo:m25`, When завершение, Then `Ok`: дуэль двумя доктринами → исход → save/load → идентичный исход.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `DuelModel` (стоимость, валидация); T03 `DuelResolver` (исходы действий).
12.2 Integration: T04 use cases + recording bus; T05 влияние дуэли на 029/031.
12.3 Contract: T06 доктрины против схем; T07 фракционные события.
12.4 Determinism: T08 save/load дуэли + RNG-изоляция.
12.5 E2E: T09 `demo:m25`.
12.6 CI: T10 `validate-duel-lint.ts`.

---

## 13. Производительность

### 13.1. Бюджет
Действие — O(1); TTL эффектов — O(active_effects). В общем бюджете фазы `scope:combat`.

### 13.2. LOD
При перегрузке: `taunt`/`maneuver` могут упрощаться; урон и поражение — никогда.

### 13.3. Профилирование
Счётчики `combat.duel_*`; сценарий: 200 действий × 4 доктрины.

---

## 14. Миграции

Секция `duel` в `combat-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Расширение `DuelStyle` за пределы `fencing` (сабли, копья, артефактные формы) | нет | design | до Wave 6 |
| OQ-02 | Владелец `combat.duel_*` — 029 или 030 (регистрация vs эмиссия) | R05 | arch | до M25 |

---

## 16. Что остаётся вне scope

- Оркестрация и урон → `DEV-SPEC-029`.
- Поле боя отряда и развязка → `DEV-SPEC-031`.
- Статы капитана → `DEV-SPEC-032`.
- Баланс, тексты, арт/VFX/аудио, мобильный UX.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M25) |
|---|---|---|---|---|
| SPEC-COMBAT-003 | R01 | AC01,AC02 | T02,T03 | M25-001 |
| SPEC-COMBAT-007/022 | R02 | AC03,AC04 | T06 | M25-002 |
| SPEC-COMBAT-070 | R03 | AC05,AC06 | T06,T10 | M25-003 |
| SPEC-COMBAT-003/022 | R04 | AC07,AC08 | T03,T04 | M25-004 |
| SPEC-COMBAT-030/031 | R05 | AC09,AC10 | T07 | M25-005 |
| SPEC-COMBAT-024 | R06 | AC11 | T06 | M25-006 |
| SPEC-COMBAT-041 | R07 | AC12 | T08 | M25-006 |
| SPEC-COMBAT-050/051 | R08 | AC13 | T08 | M25-007 |
| SPEC-COMBAT-060…063 | R09 | AC14 | T10 | M25-008 |
| SPEC-COMBAT-080 | R10 | AC15 | T09 | M25-009 |

Итог декомпозиции: 9 тикетов `TKT-M25-001…009`, демо `demo:m25`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R10 → AC01…AC15; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
