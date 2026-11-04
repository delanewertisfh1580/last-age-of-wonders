# DEV-SPEC-023 v1.0 — «World Simulation & Political Map»

**Тип документа:** Спецификация к разработке  
**Дата:** 2026-11-04  
**Статус:** draft  
**Волна:** Wave 4 (World & Cataclysms, первая — до DEV-SPEC-024/025/026)  
**Зависит от:** `DEV-SPEC-001…007` (Result, EventRegistry, ContentRegistry, MechanicRuntime, RNG, memento, фазовый конвейер), `DEV-SPEC-020` (привязка городов к торговым узлам, реакция экономики на статусы города)  
**Блокирует:** `DEV-SPEC-024` (мировые события поверх состояний карты), `DEV-SPEC-025/026` (катаклизмы оперируют городами/контролем/фракциями), `DEV-SPEC-027/028` (доступность услуг и найм по статусу города), `DEV-SPEC-034` (story beacons привязаны к узлам карты), `DEV-SPEC-036/037` (эпилог читает финальное состояние карты), `DEV-SPEC-039`  
**Основана на:** `INTENT v1.0` (INT-09, INT-10, INT-11, INT-12, INT-14), `GENERAL DESIGN v1.0` (GD-04, GD-05, GD-06, GD-07/08, GD-09, GD-17), `DESIGN v1.0 — «Катаклизмы»` (SPEC-CATA-009 — политическое влияние как вход)  
**Связанные DEV-SPEC:** `DEV-SPEC-020` (TradeNode), `DEV-SPEC-022` (Q-02: рекаптура enterprises = смена контроля; Q-03: блокады как состояния узлов; марки → легальность), `DEV-SPEC-017/019` (флот читает контроль/владельцев), `DEV-SPEC-033` (hidden-branch hooks по геополитическому состоянию).

---

## 1. Назначение и границы

### 1.1. Что спецификация делает
Определяет фоновую мировую симуляцию (scope `world`): политическую карту как агрегат (`PoliticalMapState`), города (`CityDefinition` / `CityInstance`), правителей (`RulerDefinition` / `RulerInstance`), межгосударственные отношения фракций (войны, союзы, перемирия — состояния `RelationPair`), смену контроля территорий и институт каперских грамот (`MarqueGrant`, аналог института оригинала).

Симуляция работает по тактам независимо от местоположения камеры (INT-09, GD-05) и является источником истины для остальных доменов: спека реализует порт `IWorldContextPort`, контракт которого объявлен в DEV-SPEC-021/022 как заглушка.

Также фиксирует: 5 механик scope `world` (§7.1), ядро событий `world.*` (§6.3), memento-снимок политкарты (§6.4), RNG-потоки (§4.3), уровни CI (§11/§12) и контент первой волны (8 городов на 4 фракциях, §16).

### 1.2. Что спецификация НЕ делает
- Не описывает мировые *события* и переходы локаций (→ `DEV-SPEC-024`); здесь только carrier-контракт: 024 публикует `world.event_occurred`, 023 — потребитель.
- Не реализует катаклизмы (→ `DEV-SPEC-025/026`); только принимает их политические последствия (`cataclysm.political_impact_applied`).
- Не рисует карту и не проектирует UI кампании (→ `DEV-SPEC-010/013`); домен отдаёт данные, presentation их отображает.
- Не фиксирует числовой баланс (темпы дрейфа отношений, пороги мятежей) — это политики контента.
- Не реализует легальность/розыск (022), старение капитана (032), лорные тексты, эпилог.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `INT-10` | Множество государств, не бинарный лагерь; фракции — контент | нет |
| `INT-11` | 4 фракции первой волны; покрытие архетипов — контент, не чек-лист | нет |
| `INT-12` | Города, правители, отношения, войны/союзы, марки — переработанные институты | нет |
| `INT-09` | Фоновая тактовая симуляция, фаза `scope:world` | нет |
| `GD-05` | Такты мира как фаза конвейера 007, после `world-tick-advance` | нет |
| `SPEC-CATA-009` | `political_impact` порог-эффекты принимаются трекером контроля | нет |

**Девиация от OVERVIEW:** `WorldEventDefinition` каталог относит к 023; по границам DESIGN мировые события — отдельная подсистема (INT-13). Контракт схемы переносится в DEV-SPEC-024; здесь фиксируется только событие `world.event_occurred` как вход 023. Отмечено как Q-01 (§15).

---

## 2. Зависимости

### 2.1. Обязательные
- `DEV-SPEC-001` — Result, DI, bootstrap.
- `DEV-SPEC-002` — EventRegistry: 9 новых ядерных событий (§6.3).
- `DEV-SPEC-003` — ContentRegistry: новые ContentKind `city`, `ruler`, `faction-relation-policy` (§6.1/§6.2).
- `DEV-SPEC-004` — механики scope `world` (§7.1).
- `DEV-SPEC-005` — RNG: регистрация потока `rng.world.politics`; `rng.world.events` объявляется здесь, владелец — 024 (§4.3).
- `DEV-SPEC-006` — memento-композиция: новый снимок `PoliticalMapState` (§6.4).
- `DEV-SPEC-007` — фаза `scope:world` в `TickPhase` (уже существует).
- `DEV-SPEC-020` — привязка `trade_node_id`, потребление статусов города экономикой.

### 2.2. Мягкие
- `DEV-SPEC-025/026` — катаклизм-эффекты меняют карту; контракт приёма фиксирован здесь, реализация — 026.
- `DEV-SPEC-029/031` — исходы штурмов; до реализации порт `IAssaultResolutionPort` — pass-through-заглушка.
- `DEV-SPEC-017/019` — флот читает контроль/марки; доктрины веток — отдельные данные.

### 2.3. Внешние
Новых внешних зависимостей нет.

---

## 3. Термины

| Термин | Смысл |
|---|---|
| **Политическая карта** | Агрегат-состояние политики мира: города, контроль, правители, отношения, войны |
| **Фоновая симуляция** | Часть такта, продвигающая мир без участия игрока (GD-05, INT-09) |
| **Смена контроля** | Переход города из владения одной фракции в другую (война, катаклизм, сессия уступки) |
| **Перемирие (truce)** | Ограничение на повторное объявление войны до истечения срока |
| **Каперская грамота (marque grant)** | Фракция легализует для игрока действия против своих врагов (INT-12) |
| **Политика карты** | Данные-объект, декларативно описывающий условия политических переходов |

---

## 4. Архитектурное размещение

### 4.1. Структура файлов (реализационный контракт)

```
src/domain/world/
  entities/
    City.ts                 # CityInstance
    Ruler.ts                # RulerInstance
  aggregates/
    PoliticalMap.ts         # корневой агрегат политики мира
  valueObjects/
    TerritoryControl.ts     # factionId + claim_kind
    RelationStatus.ts       # neutral | cordial | alliance | truce | war
  mechanics/
    world-relation-drift-tracker.ts
    world-political-tracker.ts
    world-war-resolver.ts
    world-control-tracker.ts
    world-marque-tracker.ts
    definitions/            # MechanicDefinition JSON механик
  index.ts
src/application/useCases/
  AdvancePoliticalTick.ts   # вызывается конвейером 007 на фазе scope:world
  RequestMarque.ts          # игрок запрашивает каперскую грамоту
src/domain/ports/
  IWorldContextPort.ts      # реализация заглушки из DEV-SPEC-021/022
  IAssaultResolutionPort.ts # мягкий мост на бой (029/031)
```

### 4.2. ContentKind-добавления
`city`, `ruler`, `faction-relation-policy` — резолвятся по директориям каталога контента (kind по директории, GD-07). Контентный пакет вехи: `world-core`.

### 4.3. RNG-потоки (расширение каталога DEV-SPEC-005)
Добавляются в `src/shared/rng/stream-names.ts` (правило реестра: новое имя — только там + CI-проверка дубликатов):
- `rng.world.politics` — дрейф отношений, выбор кандидата при succession, броски контроля;
- `rng.world.events` — объявляется здесь, используется DEV-SPEC-024.

Это осознанное расширение каталога потоков (с 49 до 52 имён вместе с 024/025-потребностями); имена независимы, индексы сохранений от этого не ломаются (§14).

### 4.4. Фазовая привязка
Все механики объявляют `lifecycle.scope = "world"` и исполняются на фазе `scope:world` (после `world-tick-advance`, до `scope:economy`; порядок закреплён DEV-SPEC-007).

---

## 5. Domain-модель

### 5.1. Город

```ts
export type CityStatus = 'flourishing' | 'weakened' | 'besieged' | 'occupied' | 'ruined';

export interface CityDefinition {
  readonly kind: 'city';
  readonly id: string;                       // kebab-case, уникален
  readonly display_name_key: string;         // city.{id}.name
  readonly faction_id: string;               // стартовая фракция
  readonly trade_node_id: string | null;     // DEV-SPEC-020; null = не-портовый город
  readonly tier: 1 | 2 | 3;                  // значимость: столица / порт / сателлит
  readonly traits: readonly CityTrait[];     // coastal|capital|industrial|arcane|fortified|tradehub
  readonly defense_profile: { readonly garrison: number; readonly walls: number };
  readonly succession_policy_id: string;     // политика смены правителя
  readonly relation_drift_policy_id: string; // политика дрейфа отношений
}

export interface CityInstance {
  readonly id: string;
  readonly status: CityStatus;
  readonly control: { readonly faction_id: string; readonly claim_kind: 'native' | 'conquest' | 'cession' };
  readonly ruler_id: string | null;          // null = интеррегнум (правление совета)
  readonly population_index: number;         // 0..100, дрейф от статуса
  readonly siege_intensity: number;          // 0..1, >0 = идёт осада
}
```

Правила:
- `CityStatus` — закрытый перечень; переходы — только через механики (§7.2);
- `trade_node_id` проверяется на существование в CI (AC10);
- геометрия карты домену не принадлежит: координаты — презентационный оверлей (GD-12).

### 5.2. Правитель

```ts
export interface RulerDefinition {
  readonly kind: 'ruler';
  readonly id: string;
  readonly faction_id: string;
  readonly home_city_id: string;
  readonly personality_tags: readonly string[]; // aggressive | diplomatic | artifact-obsessed | ...
  readonly foreign_policy_policy_id: string;    // влияет на выборы войн/союзов
}

export interface RulerInstance {
  readonly id: string;
  readonly legitimacy: number;        // 0..100
  readonly in_office_since_tick: number;
}
```

Правила:
- у фракции может быть несколько правителей: города «делят» правителей по `home_city_id`;
- смерть правителя или падение его города запускает `succession_policy` города;
- личность правителя — данные; поведение формализуется политиками, не кодом (GD-07).

### 5.3. Отношения фракций

```ts
export type RelationStatus = 'neutral' | 'cordial' | 'alliance' | 'truce' | 'war';

export interface RelationPair {
  readonly a_faction_id: string;
  readonly b_faction_id: string;      // ключ пары: 'A::B' по алфавиту
  readonly value: number;             // -100..100
  readonly status: RelationStatus;
  readonly since_tick: number;
}
```

Правила:
- `value < -50` — кандидат на войну (объявляет только `world-war-resolver`, §7.1);
- при `status = truce` объявление войны запрещено до истечения `truce_ticks` (политика);
- союзник не может объявить войну союзнику (AC09);
- изменения публикуются как `world.relation_changed`.

### 5.4. Политическая карта и марки

```ts
export interface PoliticalMapState {
  readonly cities: ReadonlyMap<string, CityInstance>;
  readonly rulers: ReadonlyMap<string, RulerInstance>;
  readonly relations: readonly RelationPair[];
  readonly wars: readonly ActiveWar[];
  readonly marque_grants: ReadonlyMap<string, MarqueGrant>; // captainId → grants
}
export interface ActiveWar {
  readonly a_faction_id: string;
  readonly b_faction_id: string;
  readonly started_tick: number;
  readonly intensity: number; // 0..1, дрейф от сражений/блокад
}
export interface MarqueGrant {
  readonly faction_id: string;
  readonly granted_tick: number;
  readonly expires_tick: number | null;
  readonly revoked_tick: number | null;
}
```

Правила:
- `PoliticalMapState` — единственный источник истины по политике мира;
- марка учитывается механикой легальности 022 и боем 029: атака на flagged-врага фракции без wanted-долга;
- блокады/фронты войны (Q-03 из 022) выражаются как войны + статусы узлов, доступные через порт (§7.4).

---

## 6. Data-контракты и схемы

### 6.1. JSON Schema пакеты (регистрация через DEV-SPEC-003)
- `content/city/city.schema.json` — `CityDefinition` (enum traits/tier);
- `content/ruler/ruler.schema.json` — `RulerDefinition`;
- `content/faction-relation-policy/policy.schema.json` — политики дрейфа/порогов;
- `state/political-map-state.schema.json` — снимок агрегата.

Дисплей-имена — только ключи локализации (`city.brasshaven.name`), snake_case полей, kebab-case ID.

### 6.2. Пример контента первой волны

```json
{
  "id": "brasshaven",
  "display_name_key": "city.brasshaven.name",
  "faction_id": "industrial-steam",
  "trade_node_id": "node-brasshaven-quay",
  "tier": 1,
  "traits": ["coastal", "industrial", "tradehub"],
  "defense_profile": { "garrison": 62, "walls": 55 },
  "succession_policy_id": "steam-primogeniture",
  "relation_drift_policy_id": "steam-expansion-drift"
}
```

### 6.3. Ядро событий (EventRegistry)

| Событие | Payload (минимум) |
|---|---|
| `world.ruler_changed` | `{ city_id, old_ruler_id, new_ruler_id, reason: death|deposed|city_fallen }` |
| `world.city_status_changed` | `{ city_id, old_status, new_status, cause }` |
| `world.city_control_changed` | `{ city_id, previous_faction_id, new_faction_id, claim_kind, caused_by: war|cataclysm|assault|cession }` |
| `world.relation_changed` | `{ a_faction_id, b_faction_id, old_value, new_value, old_status, new_status }` |
| `world.war_declared` / `world.war_ended` | `{ a_faction_id, b_faction_id, cause, outcome }` |
| `world.alliance_formed` / `world.alliance_broken` | `{ a_faction_id, b_faction_id, term }` |
| `world.marque_granted` / `world.marque_revoked` | `{ captain_id, faction_id, target_faction_id, grant_id }` |

Правила доставки (GD-06): `Immediate` — `city_control_changed`, `war_declared/ended`; `AfterScene` — `ruler_changed`, `alliance_*`; `NextTick` — `relation_changed`, `city_status_changed`. Payload каждого события — зарегистрированная JSON Schema.

### 6.4. Memento

```json
{
  "domain": "world",
  "version": 1,
  "political_map_state": { "cities": "...", "rulers": "...", "relations": "...", "wars": "...", "marque_grants": "..." }
}
```

Правила: полный снимок (не дельты); валидация по схеме при загрузке; несоответствие = повреждённое сохранение (контракт 001/006); миграции — будущая задача (GD вне 023).

---

## 7. Рантайм-поведение

### 7.1. Механики (MechanicDefinition, контракт 004)

| ID | kind | priority | persist | Назначение |
|---|---|---|---|---|
| `world-relation-drift-tracker` | tracker | 400 | да | Ежитетковый дрейф `value`, статусные переходы, события `relation_changed` |
| `world-political-tracker` | tracker | 390 | да | Легитимность, succession (смерть/смещение/падение города), интеррегнум |
| `world-war-resolver` | resolver | 380 | нет | Кандидаты войн/союзов по пары, intensity-дрейф, расторжение союзов |
| `world-control-tracker` | tracker | 370 | да | Осады, сдача/штурм, приём `cataclysm.political_impact_applied`, смены контроля |
| `world-marque-tracker` | tracker | 360 | да | Выдача/отзыв/истечение марок |

Правила: scope `world` у всех; priorities 360–400 не пересекаются с диапазоном экономики (250–300 у 020/022), так что межфазный порядок стабилен; резолверы не персистят состояние (правило 004).

### 7.2. State machine статуса города

```
flourishing → (population < 50 или siege_intensity > 0) → weakened
weakened → (осада врагом началась) → besieged
besieged → (garrison/walls исчерпаны или gm surrender policy) → occupied  [control changed]
occupied → (rebuild policy, ticks) → weakened | ruined
ruined → (rebuild policy повторно) → weakened
```

Переходы возможны только через механики 023 или входящее `cataclysm.political_impact_applied` (AC06).

### 7.3. Поток такта (scope world)

1. Конвейер 007 фаза `scope:world` → use case `AdvancePoliticalTick`.
2. Трекеры в порядке приоритетов: relations → political → resolver (события войн) → control → marque.
3. Доставка: `NextTick`-события сливаются в очередь до `scope:economy` (рынок «видит» осады в тот же такт); `Immediate`-события обрабатываются немедленно.

### 7.4. Мост с экономикой: реализация `IWorldContextPort`

```ts
export interface IWorldContextPort {
  getCityStatus(cityOrNodeId: string): CityStatus | null;
  getFactionControl(cityOrNodeId: string): string | null;
  getWars(): readonly ActiveWar[];
  isMarqueGranted(captainId: string, targetFactionId: string): boolean;
  getWarFronts(): readonly { readonly node_id: string; readonly intensity: number }[];
}
```

Правила: read-only; цены не вычисляет (это 020); заменяет заглушки из 021/022 — мир становится единственной реализацией.

### 7.5. Последовательность: падение города в войне

```
world.war_declared
→ world-control-tracker: siege_intensity растёт по тактам
→ порог сдачи / IAssaultResolutionPort (пока заглушка: policy-результат)
→ world.city_control_changed
→ economy: enterprise 022 переходит captured; узел-блокада; цены 020 пересчитываются на следующем такте
→ world.ruler_changed (AfterScene)
```

---

## 8. Порты и адаптеры

| Порт | Направление | Содержимое |
|---|---|---|
| `IWorldContextPort` | мир → прочие домены | §7.4; реализация 023 |
| `IAssaultResolutionPort` | мир → бой (мягкий) | запрос исхода штурма; pass-through до 029/031 |
| `ICataclysmPoliticalIn` | 026 → мир | обработчик `cataclysm.political_impact_applied`; реализация в 026 |

Домен не импортирует рендер/UI (INT-06; проверка lint в CI 008).

---

## 9. Интеграционные точки

- **020:** рынок видит статусы городов/осады через порт; блокада = состояние узла (Q-03 022 закрыт).
- **021/022:** марки → легальность; `city_control_changed` → enterprise captured (022, Q-02/Q-04).
- **017/019:** флот читает контроль для разрешений доков/репутации.
- **027/028:** вербовка/услуги зависят от `CityStatus`.
- **025/026:** катаклизмы публикуют `political_impact_applied`, мир применяет и публикует собственные события.
- **034/036:** story beacons и эпилог читают финальное состояние карты.

---

## 10. Обработка ошибок

`Result<T, WorldError>`; `WorldError = 'POLICY_NOT_FOUND' | 'INVALID_TRANSITION' | 'UNKNOWN_REF' | 'MARQUE_DENIED' | 'ALREADY_AT_WAR' | 'TRUCE_ACTIVE'`.

Правила: исключения не бросаются; ошибки application-слоя транслируются в сообщения UI; сбой валидации снапшота — повреждение сохранения (001/006).

---

## 11. Критерии приёмки

- **AC01 (INT-09):** 400 тактов фоновой симуляции при скрытом UI дают байт-в-байт одинаковый `PoliticalMapState` на одном seed (детерминизм).
- **AC02 (INT-10):** ≥ 4 фракции, у каждой — ≥ 2 города; контроль города переключается военной механикой.
- **AC03 (INT-12):** смена правителя публикует `world.ruler_changed` и создаёт корректного `RulerInstance`.
- **AC04 (GD-05):** `city_control_changed` с политикой `NextTick` виден экономики в следующем такте (тест реакции цен 020).
- **AC05:** марка: выдача/отзыв/истечение; влияет на wanted-логику 022 (интеграционный тест).
- **AC06:** все переходы статуса города идут только через механики 023 (lint: прямые записи в поле status вне механик запрещены).
- **AC07:** save/load восстанавливает состояние, валидное по схеме (memento).
- **AC08 (GD-07):** новый город/правитель добавляется только JSON; CI проверяет резолв через ContentRegistry без изменения домена.
- **AC09:** truce блокирует войну; союзник не объявляет войну союзнику.
- **AC10 (CI-граф):** каждый `trade_node_id`, `succession_policy_id`, `faction_id` существует; схема-валидация всех cities проходит.

---

## 12. Тест-план

| Тип | Тесты |
|---|---|
| unit | `world-relation-drift-tracker.test.ts`, `world-political-tracker.test.ts`, `world-war-resolver.test.ts`, `world-control-tracker.test.ts`, `world-marque-tracker.test.ts` |
| integration | `world-phase-pipeline.test.ts` (порядок фаз 007), `economy-reaction-to-world.test.ts`, `marque-legality.test.ts` (022) |
| contract | `city.schema.test.ts`, `political-map-state.schema.test.ts`, payload-схемы событий |
| determinism | сценарий 400 тиков: snapshot == golden; save/load → продолжение совпадает с непрерывным прогоном |

---

## 13. Производительность

Стоимость такта O(C + P + F²) (города, правители, пары фракций); при первой волне (8 городов, 4 фракции) — микросекунды; бюджет домена < 1 мс/такт (совместно с DEV-SPEC-016 budget). Снапшот домена ≤ 64 КБ.

---

## 14. Миграции

- v1 — новая подсистема: legacy-миграций нет.
- Версионирование снимка через `version` (§6.4); дальнейшие изменения полей — по стратегии 006.
- Добавление 2 RNG-имён не изменяет индексацию существующих потоков (имена аддитивны).

---

## 15. Открытые вопросы

| ID | Вопрос | Блокер? | Решение / статус |
|---|---|---|---|
| `Q-01` | Где жить `WorldEventDefinition` | нет | Перенесено в 024 (девиация от OVERVIEW зафиксирована здесь) |
| `Q-02` | Расширение каталога RNG-потоков (49 → +2) | нет | Аддитивная правка `stream-names.ts` + CI-проверка дубликатов |
| `Q-03` | Штурмы до реализации боя | нет | `IAssaultResolutionPort` pass-through; реализация 029/031 |
| `Q-04` | Рекаптура enterprise (Q-02 022) | нет | Рекаптура = `city_control_changed`; состояние enterprise меняет 022 |

---

## 16. Что остаётся вне scope

- Рендер карты, сцены кампании, мобильный UX (010–016).
- Мировые события и переходы локаций (024); катаклизмы (025/026).
- Числовой баланс; лорные тексты правителей и городов; аудио (INT-30 — отдельные пакеты).

Контент первой волны: 8 городов — по 2 на фракцию (industrial-steam: brasshaven + сателлит; ancient-arcane: spire-and-tallow + сателлит; necromantic-corpse: morgue-on-salt + сателлит; living-artifact: anvil-of-flesh + сателлит), минимум по одному портовому `trade_node_id` на фракцию (стык с 020).

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест |
|---|---|---|---|
| `INT-10/11` | R01: карта и фракции | AC02 | world-content тесты |
| `INT-12` | R02: города/правители/войны/марки | AC03, AC05, AC09 | political/marque тесты |
| `INT-09` | R03: фоновая симуляция | AC01 | determinism 400-tick |
| `GD-05` | R04: фазовая привязка | AC04 | world-phase-pipeline |
| `SPEC-CATA-009` | вход политического влияния | §7.1, 026-интеграция | cataclysm bridge тест |
| `GD-09` | memento | AC07 | schema/memento тесты |
| `GD-07` | data-driven карта | AC08 | ContentRegistry CI |
