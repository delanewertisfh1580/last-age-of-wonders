# SPECIFICATION v1.0 — «Механики корабельных веток фракций»

**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-01  
**Статус:** ✅ утверждено (актуализировано 2026-11-14 — источник DEV-SPEC-017…019)  
**Основана на:**
- `INTENT v1.0 — «Наука против Магии»`
- `GENERAL DESIGN v1.0 — «Наука против Магии»`

**Покрываемые требования:**
- `INT-07` — data-driven дисциплина
- `INT-18` — морские корабли разных фракций должны иметь принципиально разные механики, а не только разные цифры
- `INT-19` — у каждой фракции своя ветка кораблей и связанных возможностей
- `INT-33.1` — обязательная глубокая проработка механик корабельных веток каждой фракции
- `GD-07` — контент как данные, `ContentRegistry`, валидация схем
- `GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **корабельные ветки фракций** как data-driven доменную подсистему.

Спецификация фиксирует:

- набор фракций первой волны;
- структуру фракционных доктрин;
- грани доктрин и каскад их разблокировки;
- состав корабельной ветки каждой фракции;
- разделение кораблей на общие и визитные классы;
- модель механик-плагинов;
- разделение механик на `resolver` и `tracker`;
- декларативные контракты механик;
- событийную модель корабельных механик;
- правила получения, переоборудования и развития кораблей;
- модель уязвимостей и контрплеев;
- правила сериализации состояния трекеров;
- требования к валидации контента и CI.

Спецификация **не фиксирует**:

- числовой баланс;
- точные тайминги;
- финальные названия кораблей в локализованном виде;
- арт, VFX, аудио, шейдеры;
- внутреннюю логику экономики, катаклизмов, квестов, напарников, дуэлей и отряда;
- конкретные нарративные тексты.

Это сознательный выбор уровня **нормативно-контрактной детализации**: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-FLEET-001. Первая волна фракций

В первой спецификации фиксируются ровно **4 фракции** в стиле **arcane-punk**:

| ID фракции | Архетип | Краткая идентичность |
|---|---|---|
| `industrial-steam` | индустриально-паровая | пар, котлы, заводы, уставы, дисциплина, давление |
| `ancient-arcane` | древнемагическая | лей-линии, ритуалы, старые клятвы, арканный откат |
| `necromantic-corpse` | некромантская / трупная | память мёртвых, кости, чума, духовные долги |
| `living-artifact` | живые артефакты / одушевлённые машины | воля корпуса, призрак создателя, адаптация машин |

Эти ID являются нормативными стабильными идентификаторами контента. Отображаемые имена локализованы отдельно и не влияют на домен.

---

### SPEC-FLEET-002. Архитектура фракционной ветки

Каждая фракция строится по модели:

> **Доктрина + визитные классы**

То есть:

- у фракции есть одна сквозная доктрина;
- доктрина влияет на все корабли фракции;
- у фракции ровно **2 визитных класса**;
- визитные классы имеют принципиально уникальные механики;
- остальные корабли строятся на общих data-driven слотах, модулях, ресурсах и эффектах.

---

### SPEC-FLEET-003. Состав корабельной ветки

Каждая фракция имеет ровно **6 корабельных классов**:

- **4 общих data-driven класса**;
- **2 визитных класса**.

Итого в первой спецификации:

- 4 фракции × 6 классов = **24 корабельных класса**.

---

### SPEC-FLEET-004. Функциональные слоты общих классов

Четыре общих класса каждой фракции заполняют четыре нормативных функциональных слота:

| Слот | ID |
|---|---|
| Скорость и обнаружение | `speed_detection` |
| Огневая мощь | `firepower` |
| Выживаемость / ремонт / защита | `survivability_repair` |
| Фракционная утилита | `doctrine_utility` |

Правило:

- каждый общий класс имеет ровно **один primary slot**;
- все четыре слота покрыты ровно один раз в рамках общих классов фракции;
- визитные классы не подчиняются этой сетке автоматически.

---

### SPEC-FLEET-005. Жёсткая каноническая сетка общих классов

Для всех фракций структура общих классов фиксируется одинаково:

| Общий класс | Primary slot |
|---|---|
| Общий класс 1 | `speed_detection` |
| Общий класс 2 | `firepower` |
| Общий класс 3 | `survivability_repair` |
| Общий класс 4 | `doctrine_utility` |

Фракции различаются:

- названиями;
- визуалом;
- параметрами;
- механиками;
- лором;
- ценой;
- уязвимостями;
- контрплеем.

Но не самой схемой распределения первичных функциональных слотов.

---

### SPEC-FLEET-006. Визитные классы

Каждая фракция имеет ровно **2 визитных класса**.

Визитные классы:

- не открывают грани доктрины;
- усиливают уже открытые грани доктрины;
- являются вершиной фракционной идентичности;
- получаются через особые события, а не через обычную верфь.

Жёсткая привязка:

| Визитный класс | Усиливаемая грань |
|---|---|
| Первый визитный класс фракции | `ritual_logistics` |
| Второй визитный класс фракции | `contract_memory` |

Это нормативное правило для всех четырёх фракций первой волны.

---

### SPEC-FLEET-007. Механики визитных классов

Каждый визитный класс обязан иметь ровно:

- **2 механики-резолвера**;
- **1 механику-трекер**.

Итого на фракцию:

- 2 визитных класса × 3 механики = **6 визитных механик**.

Эти механики реализуются как изолированные плагины с data-параметрами.

---

### SPEC-FLEET-008. Доктрина как отдельная сущность

Доктрина не встраивается в `FactionDefinition`.

Существует отдельная content-сущность:

- `DoctrineDefinition`.

`FactionDefinition` только ссылается на `doctrine_id`.

Это необходимо для:

- чистой data-driven архитектуры;
- отдельной валидации доктрин;
- связи доктрины с кораблями, механиками, событиями и капитаном;
- снижения связности внутри фракции.

---

### SPEC-FLEET-009. Ветка как отдельная сущность

Фракционная корабельная ветка описывается отдельной сущностью:

- `FactionShipBranchDefinition`.

Ветка является **источником истины** для состава корабельной ветки.

Ветка хранит:

- `common_ship_class_ids`;
- `signature_ship_class_ids`;
- распределение общих классов по primary slot;
- привязку визитных классов к граням доктрины;
- ссылки на правила получения;
- политику контрплеев;
- правила валидации целостности ветки.

`ShipDefinition` не определяет состав ветки.

---

### SPEC-FLEET-010. Механики как отдельные сущности

Любая механика описывается отдельной content-сущностью:

- `MechanicDefinition`.

Сюда входят:

- фракционные механики;
- корабельные механики;
- доктринальные механики;
- визитные механики;
- контрплейные механики;
- ритуальные механики;
- контрактные механики;
- ресурсно-рисковые механики.

Inline-описание сложных механик внутри кораблей, доктрин или веток не является нормативным.

---

### SPEC-FLEET-011. Идентификаторы

Все нормативные ID:

- фракций;
- доктрин;
- веток;
- корабельных классов;
- механик;
- событий;
- тегов;

должны быть в формате **английский kebab-case**.

Примеры:

```text
industrial-steam
steam-forge-doctrine
industrial-steam-branch
industrial-steam-common-speed-detection
boiler-overpressure-resolver
```

Отображаемые имена, лорные названия и локализация выносятся отдельно.

---

## 3. Модель доктрины фракции

### SPEC-FLEET-020. Три обязательные грани доктрины

Каждая доктрина обязана содержать минимум три грани:

| Грани | ID | Смысл |
|---|---|---|
| Ресурсно-рисковая грань | `resource_risk` | цена, перегрузка, опасность, trade-off |
| Ритуально-логистическая грань | `ritual_logistics` | последовательности, производство, подготовка, боевая экономика |
| Контрактно-меморийная грань | `contract_memory` | клятвы, память, репутация, обязательства, последствия |

Эти три грани синтезируют все ранее рассмотренные направления доктрин:

- риск и ресурс;
- ритуал и логистика;
- контракт и память.

---

### SPEC-FLEET-021. Дополнительная грань

Каждая фракция первой волны получает ровно **1 дополнительную грань**.

Дополнительные грани:

| Фракция | Дополнительная грань | ID |
|---|---|---|
| `industrial-steam` | заводская дисциплина, брак, ремонтные бригады | `forge_discipline` |
| `ancient-arcane` | дикий арканный откат, нестабильная магия | `wild_arcane_feedback` |
| `necromantic-corpse` | цветение чумы, заражение воды и тел | `plague_bloom` |
| `living-artifact` | пакт с призраком машины, память создателя | `machine_ghost_pact` |

Каждая дополнительная грань должна быть полностью специфицирована на нормативно-контрактном уровне:

- ID;
- стадия;
- условия разблокировки;
- связанные механики;
- события;
- уязвимости;
- контрплей;
- влияние на корабли;
- правила валидации.

---

### SPEC-FLEET-022. Каскад разблокировки граней

Грани доктрины раскрываются по модели:

> **Гибридный каскад: корабль + капитан**

Правила:

1. `resource_risk` доступна у корабля изначально.
2. `ritual_logistics` раскрывается через класс, роль, состояние или прогресс конкретного корабля.
3. `contract_memory` открывается через капитана: репутацию, клятвы, скрытые события, память мира, статус в истории.
4. После открытия контрактно-меморийная грань может распространяться на подходящие корабли фракции.

Дополнительная грань:

- не может быть stage 1;
- не может быть после `contract_memory`;
- встраивается до контрактно-меморийной грани;
- может занимать stage 2 или stage 3 в зависимости от фракции.

---

### SPEC-FLEET-023. Порядок стадий

Нормативные ограничения порядка:

- `resource_risk` всегда `stage = 1`;
- `ritual_logistics` всегда раньше `contract_memory`;
- дополнительная грань всегда после `resource_risk` и до `contract_memory`;
- `contract_memory` является финальной среди граней первой спецификации;
- каждая фракция в своей `DoctrineDefinition` явно объявляет фактический порядок.

Допустимые последовательности:

```text
resource_risk → additional_facet → ritual_logistics → contract_memory
```

или:

```text
resource_risk → ritual_logistics → additional_facet → contract_memory
```

Выбор конкретной последовательности является data-driven решением фракции, но должен проходить валидацию.

---

### SPEC-FLEET-024. Условия разблокировки

Разблокировка граней использует hybrid-модель:

> **Глобальные вехи + локальные data-driven модификаторы**

#### Глобальные вехи

Для каждой грани существует базовый порог:

- репутация фракции;
- статус капитана;
- завершение цепочки событий;
- политическое состояние мира;
- стадия катаклизма;
- фракционный прогресс.

Глобальные вехи не могут быть полностью отменены локальными модификаторами.

#### Локальные модификаторы

Конкретные корабли, трофеи, события, клятвы, состояние корпуса, репутация, модули, напарники и катаклизмы могут:

- ускорять открытие;
- замедлять открытие;
- искажать проявление грани;
- добавлять альтернативные локальные условия;
- качественно менять эффекты грани.

Но модификаторы не должны ломать порядок стадий.

---

### SPEC-FLEET-025. Визитные классы как усилители

Визитные классы:

- не открывают грани;
- не являются гейтами;
- усиливают уже активные грани.

Первый визитный класс усиливает `ritual_logistics`.

Второй визитный класс усиливает `contract_memory`.

Если соответствующая грань не активна, визитный класс должен иметь корректное спящее или ослабленное поведение, но не должен тайно открывать грань.

---

## 4. Фракционные доктрины первой волны

Ниже — нормативные скелеты доктрин. Конкретные числовые значения, финальные названия и лорные тексты выносятся в контентные файлы и локализацию.

---

### 4.1. `industrial-steam`

**Доктрина:** `steam-forge-doctrine`

**Дополнительная грань:** `forge_discipline`

**Смысл доктрины:**

Паровая фракция живёт давлением, уставом, производственной дисциплиной и риском поломки. Её сила — в способности форсировать механизмы, поддерживать линию производства и навязывать бой через промышленную логику. Но каждый перегрев, забастовка, брак или нарушение устава имеет цену.

**Грани:**

| Грани | Роль во фракции |
|---|---|
| `resource_risk` | давление в котлах, перегрев, поломки, потеря экипажа |
| `forge_discipline` | заводская дисциплина, качество продукции, ремонтные бригады, брак |
| `ritual_logistics` | полевое производство снарядов, топливных ячеек, ремонтных деталей |
| `contract_memory` | уставы, каперские грамоты, забастовки, легальность капитана |

**Визитные классы:**

| Класс | Усиливаемая грань | Назначение |
|---|---|---|
| `industrial-steam-signature-ritual-amplifier` | `ritual_logistics` | усиливает производственные и ритуально-логистические процессы |
| `industrial-steam-signature-contract-amplifier` | `contract_memory` | усиливает уставные, контрактные и репутационные эффекты |

**Ожидаемые уязвимости:**

- перегрев;
- поломка производственных линий;
- зависимость от топлива и ремонта;
- потеря легального статуса;
- уязвимость к саботажу и забастовкам.

**Coarse контрплей-теги:**

```text
pressure
industry
fire
cold
machine
```

---

### 4.2. `ancient-arcane`

**Доктрина:** `ancient-leyline-doctrine`

**Дополнительная грань:** `wild_arcane_feedback`

**Смысл доктрины:**

Древнемагическая фракция опирается на лей-линии, лунные циклы, приливы, старые знаки и ритуальные последовательности. Её магия мощна, но предсказуема в своих источниках и опасна при откате. Нарушение ритуала или клятвы может дать мгновенную выгоду, но породит долгосрочное проклятие.

**Грани:**

| Грани | Роль во фракции |
|---|---|
| `resource_risk` | резонанс с лей-линиями, цена канала, истощение |
| `wild_arcane_feedback` | дикий арканный откат, нестабильность, обратная магия |
| `ritual_logistics` | ритуальные последовательности, компоненты, жесты, слова |
| `contract_memory` | старые клятвы, геасы, договоры с духами и святыми местами |

**Визитные классы:**

| Класс | Усиливаемая грань | Назначение |
|---|---|---|
| `ancient-arcane-signature-ritual-amplifier` | `ritual_logistics` | усиливает ритуальные цепочки и магическую логистику |
| `ancient-arcane-signature-contract-amplifier` | `contract_memory` | усиливает клятвы, геасы и память древних договоров |

**Ожидаемые уязвимости:**

- прерывание ритуалов;
- разрыв связи с лей-линией;
- арканный откат;
- нарушение клятвы;
- помехи со стороны индустриальных или анти-магических систем.

**Coarse контрплей-теги:**

```text
arcane
ritual
spirit
pressure
machine
```

---

### 4.3. `necromantic-corpse`

**Доктрина:** `necrotic-corpse-tide-doctrine`

**Дополнительная грань:** `plague_bloom`

**Смысл доктрины:**

Некромантская фракция превращает смерть в ресурс. Трупы, кости, имена, последние слова, души и заражённые останки становятся топливом для поднятых слуг, проклятий и ритуалов. Но чума, память мёртвых и духовные долги опасны не только для врагов, но и для собственного экипажа.

**Грани:**

| Грани | Роль во фракции |
|---|---|
| `resource_risk` | экономика трупов и душ, риск восстания мёртвых |
| `plague_bloom` | заражение воды, воздуха, тел и обломков |
| `ritual_logistics` | поднятие мёртвых, перенос останков, поддержание нежити |
| `contract_memory` | память мёртвых, имена, духовные долги, инквизиция |

**Визитные классы:**

| Класс | Усиливаемая грань | Назначение |
|---|---|---|
| `necromantic-corpse-signature-ritual-amplifier` | `ritual_logistics` | усиливает ритуалы поднятия и поддержания нежити |
| `necromantic-corpse-signature-contract-amplifier` | `contract_memory` | усиливает память мёртвых, долгие клятвы и духовные последствия |

**Ожидаемые уязвимости:**

- очищение;
- разрыв связи с останками;
- потеря памяти мёртвых;
- восстание нежити;
- заражение собственного экипажа;
- вмешательство духов или инквизиции.

**Coarse контрплей-теги:**

```text
death
plague
spirit
fire
cold
ritual
```

---

### 4.4. `living-artifact`

**Доктрина:** `living-relic-volition-doctrine`

**Дополнительная грань:** `machine_ghost_pact`

**Смысл доктрины:**

Фракция живых артефактов состоит из кораблей, которые частично разумны. Корпус адаптируется к бою, помнит создателя, требует кормления или соблюдения завета машины. Такая сила мощна, но корпус может отказаться слушаться, изменить поведение или судить капитана.

**Грани:**

| Грани | Роль во фракции |
|---|---|
| `resource_risk` | воля корпуса, отказ слушаться, потребность в «кормлении» |
| `machine_ghost_pact` | призрак создателя, завет машины, память мастера |
| `ritual_logistics` | адаптация модулей, перестройка корпуса, эволюция систем |
| `contract_memory` | договор с артефактом, суд над капитаном, скрытые системы |

**Визитные классы:**

| Класс | Усиливаемая грань | Назначение |
|---|---|---|
| `living-artifact-signature-ritual-amplifier` | `ritual_logistics` | усиливает адаптацию корпуса и модульную эволюцию |
| `living-artifact-signature-contract-amplifier` | `contract_memory` | усиливает пакт с призраком создателя и волю артефакта |

**Ожидаемые уязвимости:**

- поломка воли корпуса;
- разрыв пакта с призраком;
- отказ машины слушаться;
- перекос адаптации;
- уязвимость к антимагическим или индустриальным помехам.

**Coarse контрплей-теги:**

```text
machine
arcane
spirit
pressure
ritual
```

---

## 5. Data-контракты

### SPEC-FLEET-030. Общие правила JSON-контента

JSON-контент использует:

- `snake_case` для полей;
- `kebab-case` для ID;
- явные ссылки по ID;
- отсутствие скрытых допущений;
- валидацию через JSON Schema и ContentRegistry.

Все display-имена выносятся в локализацию через ключи вида:

```text
faction.industrial-steam.name
ship.industrial-steam-common-speed-detection.name
mechanic.boiler-overpressure-resolver.description
```

---

### SPEC-FLEET-031. `FactionDefinition`

Минимальный нормативный контракт:

```json
{
  "id": "industrial-steam",
  "display_name_key": "faction.industrial-steam.name",
  "doctrine_id": "steam-forge-doctrine",
  "branch_id": "industrial-steam-branch",
  "archetype_tags": ["industry", "steam", "arcane-punk"]
}
```

Правила:

- `id` уникален;
- `doctrine_id` обязан ссылаться на существующую `DoctrineDefinition`;
- `branch_id` обязан ссылаться на существующую `FactionShipBranchDefinition`;
- фракция не хранит inline-механики кораблей;
- фракция не хранит полный состав ветки.

---

### SPEC-FLEET-032. `DoctrineDefinition`

Пример:

```json
{
  "id": "steam-forge-doctrine",
  "faction_id": "industrial-steam",
  "facets": [
    {
      "id": "resource_risk",
      "stage": 1,
      "mandatory": true
    },
    {
      "id": "forge_discipline",
      "stage": 2,
      "mandatory": false,
      "additional": true
    },
    {
      "id": "ritual_logistics",
      "stage": 3,
      "mandatory": true
    },
    {
      "id": "contract_memory",
      "stage": 4,
      "mandatory": true
    }
  ],
  "unlock_policy_id": "steam-forge-unlock-policy"
}
```

Правила:

- обязательны грани:
  - `resource_risk`;
  - `ritual_logistics`;
  - `contract_memory`;
- `resource_risk` всегда `stage = 1`;
- `ritual_logistics` всегда раньше `contract_memory`;
- дополнительная грань всегда до `contract_memory`;
- `contract_memory` является последней гранью в первой спецификации;
- каждая грань должна иметь `unlock_policy` или ссылку на него;
- доктрина может быть валидирована независимо от фракции.

---

### SPEC-FLEET-033. `FactionShipBranchDefinition`

Пример структуры:

```json
{
  "id": "industrial-steam-branch",
  "faction_id": "industrial-steam",
  "doctrine_id": "steam-forge-doctrine",
  "common_ship_class_ids": [
    "industrial-steam-common-speed-detection",
    "industrial-steam-common-firepower",
    "industrial-steam-common-survivability-repair",
    "industrial-steam-common-doctrine-utility"
  ],
  "signature_ship_class_ids": [
    "industrial-steam-signature-ritual-amplifier",
    "industrial-steam-signature-contract-amplifier"
  ],
  "slot_layout": {
    "speed_detection": "industrial-steam-common-speed-detection",
    "firepower": "industrial-steam-common-firepower",
    "survivability_repair": "industrial-steam-common-survivability-repair",
    "doctrine_utility": "industrial-steam-common-doctrine-utility"
  },
  "signature_facet_bindings": {
    "ritual_logistics": "industrial-steam-signature-ritual-amplifier",
    "contract_memory": "industrial-steam-signature-contract-amplifier"
  },
  "acquisition_refs_by_ship": {
    "industrial-steam-common-speed-detection": [
      {
        "type": "port_service",
        "id": "steam-port-shipyard-basic"
      }
    ],
    "industrial-steam-signature-ritual-amplifier": [
      {
        "type": "world_event",
        "id": "steam-boiler-catastrophe-discovery"
      }
    ]
  },
  "counterplay_policy_id": "steam-branch-counterplay-policy"
}
```

Правила:

- ветка является источником истины состава;
- ровно 4 общих класса;
- ровно 2 визитных класса;
- все 4 primary slot покрыты ровно один раз;
- визитные классы привязаны к правильным граням;
- acquisition правила выражаются через внешние ссылки;
- ветка не дублирует внутренние поля кораблей;
- ветка не хранит числовой баланс.

---

### SPEC-FLEET-034. `ShipDefinition`

Пример общего класса:

```json
{
  "id": "industrial-steam-common-firepower",
  "branch_id": "industrial-steam-branch",
  "class_kind": "common",
  "primary_slot": "firepower",
  "mechanic_ids": [],
  "data_params": {},
  "vulnerability_tags": ["pressure", "industry"],
  "counterplay_tags": ["cold", "machine"]
}
```

Пример визитного класса:

```json
{
  "id": "industrial-steam-signature-ritual-amplifier",
  "branch_id": "industrial-steam-branch",
  "class_kind": "signature",
  "primary_slot": null,
  "amplified_facet_id": "ritual_logistics",
  "mechanic_ids": [
    "industrial-steam-sig-ritual-resolver-1",
    "industrial-steam-sig-ritual-resolver-2",
    "industrial-steam-sig-ritual-tracker-1"
  ],
  "data_params": {},
  "vulnerability_tags": ["pressure", "industry"],
  "counterplay_tags": ["cold", "machine"]
}
```

Правила:

- общий класс обязан иметь ровно один `primary_slot`;
- визитный класс обязан иметь `amplified_facet_id`;
- визитный класс не обязан иметь primary slot из общей сетки;
- корабль ссылается на механики по ID;
- корабль не определяет состав ветки;
- числовые балансовые значения не нормативны на этом этапе.

---

### SPEC-FLEET-035. `MechanicDefinition`

Каждая механика обязана использовать полный декларативный контракт.

Пример резолвера:

```json
{
  "id": "industrial-steam-sig-ritual-resolver-1",
  "kind": "resolver",
  "faction_tags": ["industrial-steam"],
  "branch_tags": ["industrial-steam-branch"],
  "ship_class_tags": ["industrial-steam-signature-ritual-amplifier"],
  "facet_tags": ["ritual_logistics"],
  "role_tags": ["amplifier"],
  "params": {},
  "consumes": [
    "combat.ship_damaged",
    "ship.resource_changed"
  ],
  "emits": [
    "industrial-steam.forge.output_boosted"
  ],
  "state_schema": null,
  "counterplay_tags": ["cold", "machine"],
  "validation_rules": {
    "params_schema": {
      "type": "object"
    }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "ship",
    "persisted": false
  }
}
```

Пример трекера:

```json
{
  "id": "industrial-steam-sig-ritual-tracker-1",
  "kind": "tracker",
  "faction_tags": ["industrial-steam"],
  "branch_tags": ["industrial-steam-branch"],
  "ship_class_tags": ["industrial-steam-signature-ritual-amplifier"],
  "facet_tags": ["ritual_logistics"],
  "role_tags": ["amplifier", "production"],
  "params": {},
  "consumes": [
    "world.tick_advanced",
    "ship.resource_changed"
  ],
  "emits": [
    "industrial-steam.forge.discipline_changed"
  ],
  "state_schema": {
    "$id": "mechanics/industrial-steam-sig-ritual-tracker-1/1",
    "type": "object",
    "properties": {
      "discipline": {
        "type": "number"
      },
      "output_queue": {
        "type": "array",
        "items": {
          "type": "string"
        }
      }
    },
    "required": ["discipline"]
  },
  "counterplay_tags": ["pressure", "sabotage"],
  "validation_rules": {
    "params_schema": {
      "type": "object"
    }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "ship",
    "persisted": true
  }
}
```

Обязательные поля:

```text
id
kind
faction_tags
branch_tags
ship_class_tags
facet_tags
role_tags
params
consumes
emits
state_schema
counterplay_tags
validation_rules
priority
lifecycle
```

Правила:

- `kind` может быть только:
  - `resolver`;
  - `tracker`;
- `resolver` не имеет персистентного состояния;
- `resolver.state_schema` должен быть `null` или отсутствовать;
- `tracker` обязан иметь валидный JSON Schema в `state_schema`;
- `tracker.lifecycle.persisted` может быть `true`;
- все события в `consumes` и `emits` должны быть зарегистрированы;
- все теги граней должны существовать в доктрине фракции;
- механика не может содержать захардкоженных фракционных констант вне `params`.

---

### SPEC-FLEET-036. Модель исполнения механик

Используется гибридная модель:

- **stateless-резолверы** для мгновенных расчётов;
- **stateful-трекеры** для длительных процессов.

#### Резолверы

Отвечают за:

- урон;
- модификаторы;
- проверки условий;
- реакции на события;
- мгновенные эффекты;
- контрплейные реакции.

Не хранят собственное скрытое состояние.

#### Трекеры

Отвечают за:

- ритуалы;
- адаптацию корпуса;
- память мёртвых;
- клятвы;
- заражение;
- фазы воли корабля;
- производственные очереди;
- накопленные ресурсы;
- контрактные состояния.

Хранят только типизированное сериализуемое состояние.

---

### SPEC-FLEET-037. Граница resolver / tracker

Граница фиксируется декларативно в JSON через поле:

```json
"kind": "resolver" | "tracker"
```

Runtime и CI обязаны проверять:

- `resolver` не пишет persisted state;
- `tracker` имеет валидную `state_schema`;
- механика ссылается только на разрешённые сущности, ресурсы, статусы и события;
- фракционные механики не обходят data-driven контракт прямым кодом в домене.

---

### SPEC-FLEET-038. Плагины механик

Механики реализуются как изолированные плагины.

Правила:

- домен содержит реестр механик;
- JSON-контент ссылается на `mechanic_id`;
- параметры передаются как данные;
- новая уникальная механика добавляется как отдельный плагин;
- добавление плагина не требует изменения ядра домена;
- плагин не должен содержать конкретные балансовые числа как константы;
- плагин должен быть детерминированным;
- случайность только через seeded RNG service.

Это сознательный компромисс между `INT-07` и `INT-18`:

> контент должен быть данными, но фракции должны играть по-разному, а не только иметь разные цифры.

---

## 6. Событийная модель

### SPEC-FLEET-040. Гибрид событий

Используется модель:

> **Каноническое ядро + фракционные расширения**

События делятся на:

1. каноническое ядро;
2. фракционные расширения.

Каждое событие обязано иметь:

```text
id
namespace
source
description
payload_schema
tags
default_delivery_policy
```

`source` может быть:

- `core`;
- `faction_extension`.

---

### SPEC-FLEET-041. Двухслойное каноническое ядро

Каноническое ядро состоит из двух слоёв.

---

#### 6.1. Обязательное корабельно-боевое ядро

События, без которых невозможны механики корабельных веток.

Нормативный минимум:

| Событие | Назначение |
|---|---|
| `combat.engagement_started` | начало боевого контакта |
| `combat.engagement_ended` | завершение боевого контакта |
| `combat.tick_advanced` | такт активного боя |
| `ship.maneuver_executed` | выполнен манёвр |
| `ship.position_changed` | изменилась позиция корабля |
| `ship.damaged` | корабль получил урон |
| `ship.destroyed` | корабль уничтожен |
| `ship.repaired` | выполнен ремонт |
| `ship.module_state_changed` | изменилось состояние модуля |
| `ship.resource_changed` | изменился ресурс корабля |
| `ship.mechanic_activated` | механика активирована |
| `ship.mechanic_deactivated` | механика деактивирована |
| `ship.facet_state_changed` | изменилось состояние грани доктрины на корабле |
| `ship.acquired` | корабль получен |
| `ship.lost` | корабль потерян |
| `ship.refit_completed` | переоборудование завершено |
| `counterplay.applied` | применён контрплей |
| `ship.primary_slot_changed` | зарезервировано на будущее; в первой спецификации не используется для общих классов |

Правила:

- эти события обязательны для ContentRegistry;
- механики корабельных веток могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий;
- фракции могут обогащать ядерные события своими расширениями.

---

#### 6.2. Стабилизированные межсистемные порты

Ограниченный набор абстрактных событий из смежных доменов.

Нормативный список:

| Событие | Источник контекста |
|---|---|
| `captain.status_changed` | статус капитана |
| `captain.reputation_changed` | репутация капитана |
| `captain.oath_state_changed` | состояние клятв |
| `crew.morale_changed` | мораль отряда |
| `crew.casualty_occurred` | потери экипажа |
| `world.tick_advanced` | фоновый такт мира |
| `world.event_occurred` | мировое событие |
| `world.faction_relation_changed` | отношения фракций |
| `economy.port_service_available` | доступность портовых сервисов |
| `narrative.memory_signal_emitted` | сигнал памяти мира |

Правила:

- порты имеют минимальную схему payload;
- порты не раскрывают внутреннюю логику экономики, катаклизмов, напарников или нарратива;
- корабельные механики могут потреблять порты, но не должны зависеть от полной реализации этих доменов;
- конкретные фракционные смыслы добавляются через фракционные расширения.

---

### SPEC-FLEET-042. Фракционные расширения событий

Каждая фракция может объявлять события в своём пространстве имён.

Пространства имён:

```text
industrial-steam.*
ancient-arcane.*
necromantic-corpse.*
living-artifact.*
```

Примеры:

```text
industrial-steam.boiler.stress_changed
ancient-arcane.leyline.resonance_changed
necromantic-corpse.corpses.collected
living-artifact.corpus.volition_changed
```

Правила:

- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- обязано иметь теги;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику;
- может потребляться только механиками, имеющими соответствующие faction/branch/facet tags.

---

## 7. Уязвимости и контрплей

### SPEC-FLEET-050. Гибридная модель контрплея

Используется модель:

> **Базовые уязвимости — данные, ключевые контрплеи — плагины**

#### Базовые уязвимости

Описываются декларативно через теги:

- `vulnerability_tags`;
- `counterplay_tags`;
- ресурсы;
- статусы;
- простые модификаторы.

#### Ключевые контрплеи

Реализуются как механики-плагины:

- отдельные `MechanicDefinition`;
- потребляют события целевой механики;
- испускают события нейтрализации, уязвимости, прерывания или наказания;
- имеют `role_tags: ["counterplay"]`.

---

### SPEC-FLEET-051. Таксономия грубых тегов

Для первой спецификации используется грубая архетипная таксономия:

```text
fire
cold
arcane
industry
death
machine
spirit
plague
pressure
ritual
```

Правила:

- теги используются в `vulnerability_tags` и `counterplay_tags`;
- теги не являются балансовыми коэффициентами;
- конкретные модификаторы выносятся в будущий баланс;
- ключевой контрплей не должен сводиться только к тегам.

---

### SPEC-FLEET-052. Требования к контрплею визитных классов

Каждый визитный класс обязан иметь:

- минимум 1 ключевой контрплей-плагин;
- ненулевой набор `counterplay_tags`;
- механику или событие, позволяющее другому кораблю, состоянию мира или действию капитана эффективно противодействовать усиленной грани.

Контрплей должен быть осмысленным, а не просто «-20% урона».

---

### SPEC-FLEET-053. Требования к контрплею дополнительных граней

Каждая дополнительная грань обязана иметь:

- минимум 1 уязвимость в данных;
- минимум 1 ключевой контрплей-плагин;
- событие или состояние, через которое контрплей может быть применён.

---

## 8. Получение и развитие кораблей

### SPEC-FLEET-060. Гибридная модель прохождения ветки

Используется модель:

> **Верфь + трофеи + развитие через грани доктрины**

#### Общие классы

Получаются через:

- фракционные верфи;
- порты;
- доки;
- промышленные подрядчики;
- магические производства;
- ритуальные кузни;
- некродоки;
- артефактные ковчеги.

Конкретные источники — внешние сущности, на которые ветка ссылается.

#### Визитные классы

Получаются через особые события:

- клятвы;
- древние ритуалы;
- находки;
- предательства корпуса;
- память мёртвых;
- промышленные катастрофы;
- мировые катаклизмы;
- уникальные нарративные цепочки.

#### Трофеи

Вражеские корабли могут быть:

- захвачены;
- отремонтированы;
- прокляты;
- переплавлены;
- ритуально перерождены;
- переоборудованы в рамки фракционной ветки.

Переоборудование не бесплатно и имеет последствия.

---

### SPEC-FLEET-061. Acquisition как внешние ссылки

Ветка не хранит полную логику получения кораблей inline.

Ветка содержит `acquisition_refs_by_ship`.

Допустимые типы ссылок:

```text
port_service
quest
world_event
trophy_conversion
```

Пример:

```json
"acquisition_refs_by_ship": {
  "industrial-steam-signature-contract-amplifier": [
    {
      "type": "quest",
      "id": "steam-charter-blood-oath"
    },
    {
      "type": "world_event",
      "id": "steam-general-strike"
    }
  ]
}
```

Правила:

- каждый корабельный класс должен иметь минимум 1 acquisition link;
- общие классы обычно ссылаются на `port_service`;
- визитные классы должны ссылаться на `quest`, `world_event` или `trophy_conversion`;
- внешние сущности могут быть stub-дополнениями до готовности соответствующих спецификаций;
- CI должен проверять синтаксис и наличие реестра внешних ссылки.

---

### SPEC-FLEET-062. Развитие через грани

Открытие грани доктрины может влиять на корабль гибридно:

- изменять параметры;
- добавлять или усиливать механики;
- открывать уникальные состояния трекеров.

Нормативная модель:

```json
{
  "facet_activation_effects": {
    "parameter_modifiers": [],
    "granted_mechanic_ids": [],
    "tracker_state_unlocks": []
  }
}
```

Правила:

- грань не обязана давать только цифры;
- грань может qualitatively менять поведение корабля;
- визитные классы усиливают эффекты грани, но не открывают её;
- развитие корабля связано с состоянием капитана и мира.

---

## 9. Сохранения и состояние трекеров

### SPEC-FLEET-070. Полные JSON-снимки трекеров

Состояние stateful-трекеров сохраняется как полный JSON-снимок.

Пример в Memento:

```json
{
  "ship_instances": {
    "ship-instance-123": {
      "definition_id": "industrial-steam-signature-ritual-amplifier",
      "tracker_states": {
        "industrial-steam-sig-ritual-tracker-1": {
          "discipline": 42,
          "output_queue": ["shell", "repair-kit"]
        }
      }
    }
  }
}
```

Правила:

- каждый persisted tracker имеет снимок состояния;
- снимок должен валидироваться по `state_schema`;
- загрузка не должна восстанавливать поведение через журнал дельт;
- Memento pattern из `GD-09` остаётся основным механизмом сохранений.

---

### SPEC-FLEET-071. Валидация при загрузке

При загрузке:

- состояние трекера проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу;
- на этапе первой спецификации миграции не нормируются.

---

## 10. Валидация и CI

### SPEC-FLEET-080. Уровень валидации

Обязательный уровень:

> **Schema + graph + gameplay lint**

---

### SPEC-FLEET-081. Schema validation

Проверяются:

- соответствие JSON Schema;
- обязательные поля;
- типы полей;
- enum-ы;
- уникальность ID;
- корректность `kind` механик;
- наличие `state_schema` у трекеров;
- отсутствие persisted state у резолверов;
- корректность ссылок на события;
- корректность ссылок на механики;
- корректность ссылок на фракции, доктрины, ветки и корабли.

---

### SPEC-FLEET-082. Graph integrity

Проверяется целостность графа контента:

```text
FactionDefinition
  → DoctrineDefinition
  → FactionShipBranchDefinition
    → ShipDefinition[]
      → MechanicDefinition[]
        → EventDefinition[]
```

Обязательные проверки:

- каждая фракция имеет одну доктрину;
- каждая доктрина имеет одну фракцию;
- каждая ветка имеет фракцию и доктрину;
- ветка содержит ровно 4 общих класса;
- ветка содержит ровно 2 визитных класса;
- все 4 primary slot покрыты ровно один раз;
- первый визитный класс усиливает `ritual_logistics`;
- второй визитный класс усиливает `contract_memory`;
- каждая дополнительная грань имеет stage 2 или 3;
- `contract_memory` является последней гранью;
- `ritual_logistics` раньше `contract_memory`;
- все referenced mechanics существуют;
- все referenced events существуют;
- все acquisition refs имеют допустимый тип.

---

### SPEC-FLEET-083. Gameplay lint

Дополнительные игровые проверки:

- визитный класс не может открывать грань;
- резолвер не может иметь persisted state;
- трекер не может быть без state schema;
- каждая сильная механика должна иметь контрплейные теги;
- каждый визитный класс должен иметь ключевой контрплей-плагин;
- каждая дополнительная грань должна иметь уязвимость и контрплей;
- механика не может ссылаться на грань, отсутствующую в доктрине фракции;
- событие не может быть использовано механикой без совместимых faction/branch/facet tags;
- acquisition link визитного класса не может быть только `port_service`;
- общий класс не может иметь более одного primary slot;
- фракция не может иметь менее 4 дополнительных или обязательных граней, покрытых механиками;
- ContentRegistry не должен содержать дублирующихся ID.

---

## 11. Нормативные скелеты веток первой волны

Ниже — стабильные ID для первой контентной сборки. Финальные отображаемые названия, лор и арт уточняются отдельно.

---

### 11.1. `industrial-steam`

```text
faction: industrial-steam
doctrine: steam-forge-doctrine
branch: industrial-steam-branch
additional_facet: forge_discipline
```

Общие классы:

```text
industrial-steam-common-speed-detection
industrial-steam-common-firepower
industrial-steam-common-survivability-repair
industrial-steam-common-doctrine-utility
```

Визитные классы:

```text
industrial-steam-signature-ritual-amplifier
industrial-steam-signature-contract-amplifier
```

Механики визитных классов:

```text
industrial-steam-sig-ritual-resolver-1
industrial-steam-sig-ritual-resolver-2
industrial-steam-sig-ritual-tracker-1

industrial-steam-sig-contract-resolver-1
industrial-steam-sig-contract-resolver-2
industrial-steam-sig-contract-tracker-1
```

---

### 11.2. `ancient-arcane`

```text
faction: ancient-arcane
doctrine: ancient-leyline-doctrine
branch: ancient-arcane-branch
additional_facet: wild_arcane_feedback
```

Общие классы:

```text
ancient-arcane-common-speed-detection
ancient-arcane-common-firepower
ancient-arcane-common-survivability-repair
ancient-arcane-common-doctrine-utility
```

Визитные классы:

```text
ancient-arcane-signature-ritual-amplifier
ancient-arcane-signature-contract-amplifier
```

Механики визитных классов:

```text
ancient-arcane-sig-ritual-resolver-1
ancient-arcane-sig-ritual-resolver-2
ancient-arcane-sig-ritual-tracker-1

ancient-arcane-sig-contract-resolver-1
ancient-arcane-sig-contract-resolver-2
ancient-arcane-sig-contract-tracker-1
```

---

### 11.3. `necromantic-corpse`

```text
faction: necromantic-corpse
doctrine: necrotic-corpse-tide-doctrine
branch: necromantic-corpse-branch
additional_facet: plague_bloom
```

Общие классы:

```text
necromantic-corpse-common-speed-detection
necromantic-corpse-common-firepower
necromantic-corpse-common-survivability-repair
necromantic-corpse-common-doctrine-utility
```

Визитные классы:

```text
necromantic-corpse-signature-ritual-amplifier
necromantic-corpse-signature-contract-amplifier
```

Механики визитных классов:

```text
necromantic-corpse-sig-ritual-resolver-1
necromantic-corpse-sig-ritual-resolver-2
necromantic-corpse-sig-ritual-tracker-1

necromantic-corpse-sig-contract-resolver-1
necromantic-corpse-sig-contract-resolver-2
necromantic-corpse-sig-contract-tracker-1
```

---

### 11.4. `living-artifact`

```text
faction: living-artifact
doctrine: living-relic-volition-doctrine
branch: living-artifact-branch
additional_facet: machine_ghost_pact
```

Общие классы:

```text
living-artifact-common-speed-detection
living-artifact-common-firepower
living-artifact-common-survivability-repair
living-artifact-common-doctrine-utility
```

Визитные классы:

```text
living-artifact-signature-ritual-amplifier
living-artifact-signature-contract-amplifier
```

Механики визитных классов:

```text
living-artifact-sig-ritual-resolver-1
living-artifact-sig-ritual-resolver-2
living-artifact-sig-ritual-tracker-1

living-artifact-sig-contract-resolver-1
living-artifact-sig-contract-resolver-2
living-artifact-sig-contract-tracker-1
```

---

## 12. Критерии приёмки спецификации

Спецификация считается принятой, если:

- ✅ зафиксированы 4 фракции первой волны;
- ✅ зафиксирована модель «доктрина + визитные классы»;
- ✅ зафиксировано ровно 2 визитных класса на фракцию;
- ✅ зафиксировано ровно 6 корабельных классов на фракцию;
- ✅ зафиксированы 4 функциональных слота общих классов;
- ✅ зафиксирована жёсткая каноническая сетка слотов;
- ✅ зафиксированы три обязательные грани доктрины;
- ✅ зафиксирована одна дополнительная грань на фракцию;
- ✅ зафиксирован каскад разблокировки «корабль + капитан»;
- ✅ зафиксирована hybrid-модель условий разблокировки;
- ✅ зафиксировано, что визитные классы усиливают, а не открывают грани;
- ✅ зафиксирована жёсткая привязка визитных классов к граням;
- ✅ зафиксирована модель механик-плагинов с data-параметрами;
- ✅ зафиксирован hybrid resolver/tracker;
- ✅ зафиксирован декларативный JSON-контракт границы resolver/tracker;
- ✅ зафиксирован полный декларативный контракт `MechanicDefinition`;
- ✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;
- ✅ зафиксировано двухслойное ядро событий;
- ✅ зафиксирована модель state schema как чистый JSON Schema;
- ✅ зафиксировано, что инварианты трекеров проверяются только структурно;
- ✅ зафиксирована hybrid-модель уязвимостей и контрплеев;
- ✅ зафиксирована грубая таксономия контрплей-тегов;
- ✅ зафиксирована hybrid-модель получения кораблей;
- ✅ зафиксированы внешние acquisition links;
- ✅ зафиксировано влияние граней на развитие корабля;
- ✅ зафиксировано сохранение трекеров через полные JSON-снимки;
- ✅ зафиксирован обязательный уровень CI: schema + graph + gameplay lint.

---

## 13. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:

- числовой баланс кораблей;
- точные значения ресурсов, урона, скорости, стоимости;
- финальные лорные названия кораблей;
- арт-дирекшн кораблей;
- шейдеры и VFX;
- аудио-темы фракций;
- детали экономики;
- детали катаклизмов;
- детали квестов;
- детали напарников;
- детали отряда;
- детали дуэли и боя команд;
- детали мобильного UX;
- детали генератора эпилога;
- миграции сохранений;
- производительность на мобильных устройствах на уровне конкретных механик.

---

## 14. Приложение. Журнал решений по сбору данных

| Вопрос | Решение |
|---|---|
| 1 | A — полная спецификация сразу для всех минимум 4 фракций |
| 2 | B — arcane-punk набор фракций |
| 3 | C — доктрина + визитные классы |
| 4 | A — ровно 2 визитных класса на фракцию |
| 5 | Все варианты вместе — три грани доктрины |
| 6 | C — каскад разблокировки |
| 7 | C — гибридно: корабль + капитан |
| 8 | B — плагины механик с data-параметрами |
| 9 | C — гибрид: stateless-резолверы + stateful-трекеры |
| 10 | C — граница по декларативному контракту в JSON |
| 11 | B — базовый состав: 6 классов на фракцию |
| 12 | C — функциональные слоты вместо фиксированных ролей |
| 13 | A — один первичный слот на класс |
| 14 | A — жёсткая каноническая сетка |
| 15 | B — визитные классы как усилители, а не открыватели |
| 16 | A — жёсткая фракционная привязка визитных классов |
| 17 | C — гибрид: базовые уязвимости данные, ключевые контрплеи плагины |
| 18 | C — гибрид: верфь + трофеи + развитие через грани |
| 19 | C — гибрид: глобальные вехи + локальные data-driven модификаторы |
| 20 | B — нормативно-контрактный уровень |
| 21 | B — доктрина как отдельная content-сущность |
| 22 | B — отдельная сущность `FactionShipBranchDefinition` |
| 23 | A — ветка как владелец состава |
| 24 | A — отдельная сущность `MechanicDefinition` для всех механик |
| 25 | B — полный декларативный контракт |
| 26 | C — гибрид: каноническое ядро + фракционные расширения |
| 27 | C — двухслойное ядро |
| 28 | B — расширяемый список граней с обязательным минимумом |
| 29 | C — произвольное число дополнительных граней, но все полностью специфицированы |
| 30 | A — минимальный завершаемый набор: 1 дополнительная грань на фракцию |
| 31 | C — data-driven stage для дополнительной грани |
| 32 | B — дополнительная грань встраивается до контрактной памяти |
| 33 | C — data-driven выбор фракцией порядка стадии |
| 34 | A — чистый JSON Schema внутри контента |
| 35 | A — только структурная валидация JSON Schema |
| 36 | A — английские kebab-case ID |
| 37 | B — «грязный» arcane-punk набор дополнительных граней |
| 38 | C — data-driven placeholders для визитных классов |
| 39 | B — 2 resolver + 1 tracker на визитный класс |
| 40 | A — только контракты без чисел |
| 41 | A — грубые архетипные теги |
| 42 | B — ссылки на внешние сущности для acquisition |
| 43 | C — гибкое влияние граней на корабль |
| 44 | A — полный JSON-снимок каждого трекера |
| 45 | C — CI: schema + graph + gameplay lint |

---
