# SPECIFICATION v1.0 — «Катаклизмы (эскалация, последствия, трансформация)»

**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-02  
**Статус:** сформирована, ожидает утверждения  
**Основана на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
`SPECIFICATION v1.0 — «Механики корабельных веток фракций»`  
`SPECIFICATION v1.0 — «Экономика (цепочки, гильдии, рынки, инвестиции)»`  

**Покрываемые требования:**  
`INT-13`, `INT-14`, `INT-15` — глобальные катаклизмы, необратимые последствия, источник нарратива.  
`INT-25`, `INT-26` — путь «игрок как катаклизм» и скрытые ветки трансформации.  
`INT-30` — нарратив через 4 канала.  
`INT-33.3` — обязательная глубокая проработка катаклизмов.  
`GD-07`, `GD-08` — контент как данные, валидация схем.  

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает глобальные катаклизмы как data-driven доменную подсистему, охватывающую их жизненный цикл, эскалацию, необратимые последствия и интеграцию со всеми аспектами мира.

**Спецификация фиксирует:**
- типологию и источники возникновения катаклизмов;
- модель жизненного цикла, эскалации и завершения;
- модель необратимости и персистентных «шрамов» (стык с SPEC-ECON);
- влияние на политическую карту, экономику и флот;
- роль игрока, включая путь трансформации «игрок как катаклизм» (INT-25);
- нарративную доставку через 4 канала;
- фракционную асимметрию и модели взаимодействия фракций с катаклизмами;
- plugin-based архитектуру на базе полного переиспользования `MechanicDefinition`;
- событийную модель и мосты с другими доменами;
- модель RNG, сохранений и требования к CI.

**Спецификация не фиксирует:**
- числовой баланс (длительность, множители урона, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали генератора эпилога и миграции сохранений;
- детали скрытых веток трансформации (выносятся в отдельную спецификацию, здесь фиксируются только хуки и контракты).

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

**SPEC-CATA-001. Типология и архетипы**  
Используется гибридная модель: 4 архетипа-источника × произвольные типы эффектов, задаваемые через теги.

| Архетип-источник | ID | Смысл |
|---|---|---|
| Природный | `natural` | штормы, землетрясения, наводнения, эпидемии, климатические аномалии |
| Магический | `arcane` | разрывы лей-линий, арканный откат, ритуальные сбои, проклятия |
| Индустриальный | `industrial` | техногенные катастрофы, выбросы, механические восстания, паровые взрывы |
| Метафизический | `metaphysical` | разрывы реальности, вторжения иных планов, искажения времени, онтологические кризисы |

Правила:
- каждый катаклизм имеет минимум один `archetype_tag`;
- эффекты описываются через декларативные `effect_tags`;
- комбинации архетипов допустимы (например, `arcane` + `metaphysical`).

**SPEC-CATA-002. Источники возникновения**  
Три равноправных источника:

| Источник | ID | Смысл |
|---|---|---|
| Случайный | `procedural` | генерация из seed мира, по таймеру или по условию |
| Сценарный | `scripted` | заранее прописанный триггер мира, сюжета, лора |
| Порождаемый | `player_or_faction_driven` | результат действий игрока или фракций |

Правила:
- каждый катаклизм имеет ровно один `source_type`;
- сценарные катаклизмы имеют `trigger_policy_id`;
- порождаемые катаклизмы имеют `generation_conditions_policy_id`;
- все три источника равны по правам в рантайме.

**SPEC-CATA-003. Масштаб влияния**  
Три уровня зоны воздействия:

| Уровень | ID | Смысл |
|---|---|---|
| Точечный | `point` | один узел / один корабль / одна локация |
| Региональный | `regional` | группа узлов / море / регион карты |
| Глобальный | `global` | весь мир |

Правила:
- каждый катаклизм имеет ровно один `scale_level`;
- зона воздействия задаётся data-driven параметрами;
- для `regional` и `global` обязательно указание затронутых сущностей через теги или явные списки.

**SPEC-CATA-004. Временная модель**  
Непрерывная модель: длительность и тайминги стадий являются data-driven параметрами без жёстких классов.

Правила:
- длительность задаётся через `duration_policy_id`;
- нет нормативных классов «мгновенный / краткосрочный / долгосрочный»;
- конкретные значения — вне scope этой спецификации.

**SPEC-CATA-005. Жизненный цикл и стадии**  
Переменное число стадий (минимум 2), задаваемое в данных через `stage_definitions` для каждого конкретного катаклизма.

Правила:
- минимум 2 стадии;
- каждая стадия имеет `id`, `duration_policy_id`, `effect_policy_id`;
- порядок стадий фиксирован в данных;
- допустимы ветвления через `branch_policy_id`.

**SPEC-CATA-006. Модель эскалации**  
Гибридная: линейный каркас стадий + data-driven модификаторы скорости и ветвления в зависимости от состояния мира и действий игрока.

Правила:
- каркас стадий задаётся в `CataclysmDefinition`;
- модификаторы скорости и ветвления — через `escalation_policy_id`;
- эскалация может зависеть от: действий игрока, состояния фракций, состояния узлов, других катаклизмов;
- все зависимости декларативны.

**SPEC-CATA-007. Завершение катаклизма**  
Data-driven `resolution_policy`, допускающая произвольный набор сценариев завершения.

Допустимые политики:
- `self_extinguishing` — самоугасание по таймеру;
- `external_intervention` — внешнее вмешательство (игрок / фракции);
- `transformation` — трансформация в другой катаклизм;
- `persistent_scar` — переход в персистентный шрам;
- комбинации выше.

Правила:
- каждый катаклизм имеет ровно одну `resolution_policy_id`;
- политика может быть комбинированной;
- конкретные условия завершения — data-driven.

**SPEC-CATA-008. Необратимость и шрамы**  
Гибридная модель: восстановимые эффекты + персистентные `NodeScarDefinition` (полное переиспользование модели шрамов из SPEC-ECON-038 и SPEC-ECON-072).

Правила:
- восстановимые эффекты описываются через `recoverable_effects_policy_id`;
- персистентные шрамы описываются через `NodeScarDefinition`;
- шрамы могут быть наложены на узлы, фракции, капитана, мир;
- шрамы декларируются в данных и влияют на мир до явного снятия.

**SPEC-CATA-009. Влияние на политическую карту**  
Значимое: смена правителей, падение городов, смена фракционной принадлежности узлов.

Правила:
- влияние декларируется через `political_impact_policy_id`;
- допустимые эффекты: смена правителя, падение города, смена фракции, рождение/смерть государства;
- все эффекты — data-driven.

**SPEC-CATA-010. Влияние на экономику**  
Полное: экономические шоки + шрамы узлов + блокады + изменение цепочек + перестройка региональных индексов + смена доминирующих товаров.

Правила:
- влияние проходит через мост `economy ↔ cataclysms` (SPEC-ECON-084);
- экономика потребляет события `cataclysm.*`;
- экономика генерирует собственные шоки как ответ;
- все эффекты — data-driven.

**SPEC-CATA-011. Влияние на флот**  
Полное: специальные корабельные механики, реагирующие на катаклизмы, через контрплейные теги и условия плавания (стык с SPEC-FLEET-051).

Правила:
- влияние проходит через мост `fleet ↔ cataclysms`;
- допустимые эффекты: изменение условий плавания, порча кораблей, новые уязвимости, контрплейные теги;
- все эффекты — data-driven.

**SPEC-CATA-012. Роль игрока**  
Гибридная: большинство катаклизмов предполагают реактивное участие (смягчение / усиление), но часть допускает активное управление и открытие скрытых веток.

Правила:
- реактивное участие — через `reaction_policy_id`;
- активное управление — через `intervention_policy_id`;
- скрытые ветки — через `hidden_branch_policy_id`;
- все политики — data-driven.

**SPEC-CATA-013. Путь «игрок как катаклизм» (INT-25)**  
Моделируется как полноценная трансформация с отдельной веткой доктрины капитана, переводящая игрока в особый режим взаимодействия с миром.

Правила:
- путь открывается через `player_cataclysm_path_policy_id`;
- путь имеет отдельные стадии, условия, последствия;
- путь публикует факты в `EpilogueFactPort`;
- конкретные детали реализации — в отдельной спеке «Скрытые ветки трансформации».

**SPEC-CATA-014. Нарративная доставка**  
Все четыре канала обязательны: текст, визуал (шейдеры / VFX), аудио (адаптивные темы), реакции напарников.

Правила:
- каждый канал имеет `delivery_policy_id`;
- каналы равноправны и обязательны;
- конкретные ассеты — вне scope этой спецификации.

**SPEC-CATA-015. Фракционная асимметрия**  
Полная: фракции не только по-разному страдают, но могут вызывать, питаться, контролировать или сливаться с определёнными типами катаклизмов.

Правила:
- каждая фракция имеет `CataclysmDoctrineDefinition`;
- доктрина декларирует: уязвимости, бонусы, способы взаимодействия;
- доктрина — data-driven.

**SPEC-CATA-016. Взаимодействие фракций с катаклизмами**  
Полное: использование, питание, вызов, контроль, слияние с катаклизмом как легитимные стратегические опции.

Правила:
- все способы взаимодействия декларируются через `faction_interaction_policy_id`;
- допустимые модели: использование, питание, вызов, контроль, слияние;
- все модели — data-driven.

**SPEC-CATA-017. Архитектура content-сущностей**  
Plugin-based: `CataclysmDefinition` (шаблон) + набор `MechanicDefinition` (полное переиспользование системы механик из SPEC-FLEET).

Правила:
- `CataclysmDefinition` — шаблон катаклизма;
- `CataclysmInstance` — рантайм-экземпляр;
- механики реализуются через `MechanicDefinition`;
- контракт `MechanicDefinition` един для всех доменов.

**SPEC-CATA-018. Переиспользование механик**  
Полное: эффекты, эскалация, взаимодействие — всё реализуется через механики-плагины с `role_tags` (например, `["cataclysm", "escalation", "resolution"]`).

Правила:
- механики живут в общем реестре;
- namespace событий — `cataclysm.*`;
- механики используют те же правила валидации, что и корабельные.

**SPEC-CATA-019. Событийная модель**  
Ядро + фракционные расширения (аналогично SPEC-FLEET-042 и SPEC-ECON-082).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

**SPEC-CATA-020. Мосты с другими доменами**  
Обязательные мосты с: экономикой, флотом, нарративом, геополитикой, напарниками, скрытыми ветками.

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

**SPEC-CATA-021. Модель RNG**  
Именованные изолированные потоки: `rng.cataclysm.spawn`, `rng.cataclysm.escalation`, `rng.cataclysm.effects`.

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

**SPEC-CATA-022. Модель сохранений**  
Полные JSON-снимки активных состояний + журнал завершённых катаклизмов для нарратива и генератора эпилога.

Правила:
- активные катаклизмы сохраняются через полные снимки `CataclysmInstance` (Memento pattern);
- отдельный массив `completed_cataclysms_journal` хранит ID и ключевые параметры завершённых катаклизмов;
- снимки валидируются по JSON Schema.

**SPEC-CATA-023. Уровень валидации и CI**  
Schema + graph + gameplay lint (аналогично SPEC-FLEET-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

**SPEC-CATA-024. Масштаб первой волны**  
6+ катаклизмов для полноценной демонстрации разнообразия механик и архетипов.

**SPEC-CATA-025. Архетипы первой волны**  
Минимум по одному на каждый архетип-источник (природный, магический, индустриальный, метафизический) + дополнительные для достижения целевого количества.

**SPEC-CATA-026. Вертикальный срез первой сборки**  
4 катаклизма + шрамы + мост с экономикой + мост с флотом.

**SPEC-CATA-027. Связь с системой напарников**  
Полная: напарники могут быть источником, жертвой, инструментом или противником катаклизма, с уникальными реакциями и триггерами.

Правила:
- связь декларируется через `companion_reaction_policy_id`;
- напарники публикуют факты в `EpilogueFactPort`;
- все реакции — data-driven.

**SPEC-CATA-028. Связь с квестами**  
Катаклизмы — полноценный источник квестов (расширение шаблонов `GuildQuestTemplateDefinition` или создание `CataclysmQuestTemplateDefinition`).

Правила:
- шаблоны заданий декларируются в данных;
- конкретика наполняется из world state;
- шаблоны проходят валидацию.

**SPEC-CATA-029. Связь со скрытыми ветками**  
Полноценные хуки + `EpilogueFactPort` для финала, фиксирующие трансформацию игрока или мира.

Правила:
- хуки декларируются через `hidden_branch_hook_policy_id`;
- факты публикуются через `EpilogueFactPort`;
- конкретные детали скрытых веток — в отдельной спеке.

**SPEC-CATA-030. Границы спецификации**  
Вне scope: числовой баланс, конкретные тексты / арт / аудио, мобильный UX, детали боя / дуэли / напарников / отряда, детали генератора эпилога, миграции сохранений, детали скрытых веток (выносятся в отдельные спеки).

---

## 3. Data-контракты

**SPEC-CATA-040. Общие правила JSON-контента**  
`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `cataclysm.arcane-leyline-rupture.name`
- `cataclysm.natural-storm-archipelago.description`
- `stage.buildup.description`

**SPEC-CATA-041. `CataclysmDefinition`**  
Пример структуры:

```json
{
  "id": "arcane-leyline-rupture",
  "display_name_key": "cataclysm.arcane-leyline-rupture.name",
  "source_type": "scripted",
  "archetype_tags": ["arcane", "metaphysical"],
  "effect_tags": ["magic-disruption", "reality-tear"],
  "scale_level": "regional",
  "stage_definitions": [
    {
      "id": "stage-buildup",
      "duration_policy_id": "rupture-buildup-duration",
      "effect_policy_id": "rupture-buildup-effects"
    },
    {
      "id": "stage-peak",
      "duration_policy_id": "rupture-peak-duration",
      "effect_policy_id": "rupture-peak-effects"
    },
    {
      "id": "stage-decay",
      "duration_policy_id": "rupture-decay-duration",
      "effect_policy_id": "rupture-decay-effects"
    }
  ],
  "escalation_policy_id": "arcane-rupture-escalation",
  "mechanic_ids": [
    "cataclysm-arcane-escalation-resolver",
    "cataclysm-arcane-node-scar-tracker"
  ],
  "resolution_policy_id": "arcane-rupture-resolution",
  "faction_interaction_policy_id": "arcane-faction-feast",
  "political_impact_policy_id": "arcane-political-impact",
  "player_reaction_policy_id": "arcane-player-reaction",
  "narrative_delivery_policy_id": "arcane-narrative-delivery",
  "hidden_branch_hook_policy_id": "arcane-hidden-hook"
}
Правила:
id уникален;
source_type — один из нормативных источников;
archetype_tags — минимум один;
scale_level — один из нормативных уровней;
stage_definitions — минимум 2 стадии;
mechanic_ids — ссылки на MechanicDefinition;
все политики — data-driven.
SPEC-CATA-042. CataclysmInstance (Runtime)
Снимок состояния в Memento:
{
  "instance_id": "cataclysm-inst-789",
  "definition_id": "arcane-leyline-rupture",
  "current_stage_id": "stage-peak",
  "start_tick": 1450,
  "affected_entities": {
    "nodes": ["ancient-arcane-trade-node-grove", "ancient-arcane-trade-node-sanctum"],
    "factions": ["ancient-arcane"],
    "ships": []
  },
  "active_tracker_states": {
    "cataclysm-arcane-node-scar-tracker": {
      "affected_nodes": ["ancient-arcane-trade-node-grove"],
      "intensity": 0.8,
      "scar_ids": ["scar-leyline-rupture-grove"]
    }
  },
  "escalation_state": {
    "current_velocity": 1.2,
    "branch_taken": null
  }
}
Правила:
каждый активный катаклизм имеет снимок;
снимок валидируется по JSON Schema;
Memento pattern из GD-09 остаётся основным механизмом.
SPEC-CATA-043. Переиспользование MechanicDefinition
Механики катаклизмов используют тот же контракт, что и корабельные, с обязательными role_tags (например, ["cataclysm", "escalation"]) и строгим разделением на resolver и tracker.
Пример резолвера:{
  "id": "cataclysm-arcane-escalation-resolver",
  "kind": "resolver",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["cataclysm", "escalation"],
  "params": {},
  "consumes": [
    "cataclysm.stage_changed",
    "world.event_occurred"
  ],
  "emits": [
    "cataclysm.escalated"
  ],
  "state_schema": null,
  "counterplay_tags": ["arcane", "ritual"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "cataclysm",
    "persisted": false
  }
}
Пример трекера:{
  "id": "cataclysm-arcane-node-scar-tracker",
  "kind": "tracker",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["cataclysm", "scar"],
  "params": {},
  "consumes": [
    "world.tick_advanced",
    "cataclysm.stage_changed"
  ],
  "emits": [
    "cataclysm.effect_applied",
    "economy.scar_applied"
  ],
  "state_schema": {
    "$id": "mechanics/cataclysm-arcane-node-scar-tracker/1",
    "type": "object",
    "properties": {
      "affected_nodes": {
        "type": "array",
        "items": { "type": "string" }
      },
      "intensity": { "type": "number" },
      "scar_ids": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["affected_nodes", "intensity"]
  },
  "counterplay_tags": ["arcane", "ritual"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "cataclysm",
    "persisted": true
  }
}
Правила:
контракт MechanicDefinition един для всех доменов;
role_tags обязательно содержит cataclysm;
namespace событий — cataclysm.*;
механики проходят те же проверки валидации.
SPEC-CATA-044. CataclysmDoctrineDefinition
Пример:{
  "id": "arcane-cataclysm-doctrine",
  "faction_id": "ancient-arcane",
  "display_name_key": "cataclysm-doctrine.arcane.name",
  "vulnerability_tags": ["arcane-disruption", "ritual-interruption"],
  "bonus_tags": ["arcane-resonance", "leyline-feed"],
  "interaction_modes": ["feast", "channel", "contain"],
  "interaction_policy_id": "arcane-interaction-policy"
}
Правила:
доктрина уникальна для фракции;
доктрина декларирует уникальные правила взаимодействия с катаклизмами;
доктрина не хранит числовой баланс.
SPEC-CATA-045. CataclysmQuestTemplateDefinition
Пример:	{
  "id": "cataclysm-quest-contain-rupture",
  "display_name_key": "quest.contain-rupture.name",
  "quest_type": "cataclysm_intervention",
  "cataclysm_filter_tags": ["arcane", "metaphysical"],
  "reward_policy_id": "cataclysm-intervention-reward",
  "deadline_policy": "hard",
  "failure_policy": ["scar", "reputation_loss"],
  "risk_tags": ["cataclysm-intensity", "faction-hostility"],
  "generation_policy_id": "cataclysm-quest-generation"
}
Правила:
шаблон задаёт форму;
конкретика — из world state;
политики декларируются.
4. Событийная модель
SPEC-CATA-050. Каноническое ядро
Нормативный минимум
Событие
Назначение
cataclysm.triggered
катаклизм активирован
cataclysm.stage_changed
смена стадии
cataclysm.escalated
катаклизм усилился
cataclysm.effect_applied
эффект применён к сущности
cataclysm.ended
катаклизм завершился
cataclysm.scar_applied
шрам наложен
cataclysm.scar_removed
шрам снят
cataclysm.political_impact_applied
политическое влияние применено
cataclysm.player_intervention_attempted
попытка вмешательства игрока
cataclysm.faction_interaction_applied
взаимодействие фракции применено
cataclysm.hidden_branch_opened
скрытая ветка открыта
cataclysm.player_transformed
игрок трансформирован в катаклизм
Правила:
эти события обязательны для ContentRegistry;
механики катаклизмов могут ссылаться только на зарегистрированные события;
фракции не могут переопределять семантику ядерных событий.
SPEC-CATA-051. Фракционные расширения
Каждая фракция объявляет события в своём пространстве имён:
cataclysm.industrial-steam.*
cataclysm.ancient-arcane.*
cataclysm.necromantic-corpse.*
cataclysm.living-artifact.*
Примеры:
cataclysm.industrial-steam.boiler-meltdown
cataclysm.ancient-arcane.leyline-resonance
cataclysm.necromantic-corpse.plague-tide
cataclysm.living-artifact.corpus-rebellion
Правила:
фракционное событие обязано быть зарегистрировано;
обязано иметь payload schema;
не может совпадать по ID с ядерным событием;
не может ломать ядерную семантику.
SPEC-CATA-052. Мосты с другими доменами
Мост cataclysm ↔ economy:
cataclysm.triggered → economy.shock_generated
cataclysm.escalated → economy.shock_generated
cataclysm.ended → economy.scar_applied
cataclysm.scar_applied → economy.scar_applied
Мост cataclysm ↔ fleet:
cataclysm.triggered → fleet.sailing_conditions_changed
cataclysm.effect_applied → fleet.ship_damaged_by_cataclysm
cataclysm.ended → fleet.sailing_conditions_restored
Мост cataclysm ↔ narrative:
публикация фактов в EpilogueFactPort:
epilogue.cataclysm.survived_global_event
epilogue.cataclysm.caused_cataclysm
epilogue.cataclysm.became_cataclysm
epilogue.cataclysm.prevented_cataclysm
Мост cataclysm ↔ companions:
cataclysm.effect_applied → companion.reaction_triggered
cataclysm.ended → companion.fate_changed
Мост cataclysm ↔ hidden_branches:
cataclysm.hidden_branch_opened → hidden_branch.activated
cataclysm.player_transformed → hidden_branch.player_mode_changed
Правила:
мосты декларативны;
каждый мост имеет нормативный набор событий;
мосты не раскрывают внутреннюю логику смежных доменов.
5. Детерминизм и RNG
SPEC-CATA-060. Детерминизм
Симуляция катаклизмов полностью детерминирована от seed.
Правила:
обязательна для тестов и реплеев;
вся случайность — через seeded RNG service;
сохранение + загрузка дают идентичное продолжение.
SPEC-CATA-061. Именованные потоки RNG
Нормативные потоки:
Поток
Назначение
rng.cataclysm.spawn
генерация случайных катаклизмов
rng.cataclysm.escalation
ветвление и скорость эскалации
rng.cataclysm.effects
вариативность последствий
rng.cataclysm.resolution
выбор сценария завершения
rng.cataclysm.hidden_branch
открытие скрытых веток
Правила:
каждый поток изолирован;
каждый поток именован;
смешение потоков запрещено.
6. Сохранения и состояние
SPEC-CATA-070. Полные JSON-снимки + журнал
Активные катаклизмы сохраняются через полные снимки CataclysmInstance (Memento pattern).
Отдельный массив completed_cataclysms_journal хранит ID и ключевые параметры завершённых катаклизмов для использования генератором эпилога.
Пример в Memento:
{
  "active_cataclysms": [
    {
      "instance_id": "cataclysm-inst-789",
      "definition_id": "arcane-leyline-rupture",
      "current_stage_id": "stage-peak",
      "start_tick": 1450,
      "active_tracker_states": { ... }
    }
  ],
  "completed_cataclysms_journal": [
    {
      "instance_id": "cataclysm-inst-456",
      "definition_id": "natural-storm-archipelago",
      "ended_tick": 1200,
      "resolution": "self_extinguishing",
      "scar_ids": ["scar-storm-coastal"],
      "epilogue_facts": ["epilogue.cataclysm.survived_global_event"]
    }
  ]
}
Правила:
каждый активный катаклизм имеет снимок;
снимок валидируется по JSON Schema;
журнал завершённых катаклизмов — отдельный массив;
загрузка не восстанавливает поведение через журнал дельт;
Memento pattern из GD-09 остаётся основным механизмом.
SPEC-CATA-071. Валидация при загрузке
При загрузке:
состояние катаклизма проверяется по JSON Schema;
состояние трекеров проверяется по JSON Schema;
несоответствие схемы считается повреждением сохранения;
миграции схем выносятся в отдельную будущую задачу.
7. Валидация и CI
SPEC-CATA-080. Уровень валидации
Обязательный уровень: Schema + graph + gameplay lint.
SPEC-CATA-081. Schema validation
Проверяются:
соответствие JSON Schema;
обязательные поля;
типы полей;
enum-ы;
уникальность ID;
корректность kind механик;
наличие state_schema у трекеров;
отсутствие persisted state у резолверов;
корректность ссылок на события;
корректность ссылок на механики;
корректность ссылок на фракции, доктрины, узлы.
SPEC-CATA-082. Graph integrity
Проверяется целостность графа контента:
CataclysmDefinition
  → CataclysmDoctrineDefinition (по фракциям)
  → MechanicDefinition[]
    → EventDefinition[]
  → NodeScarDefinition[]
  → CataclysmQuestTemplateDefinition[]
  Обязательные проверки:
каждый катаклизм имеет минимум 2 стадии;
каждый катаклизм имеет минимум один archetype_tag;
каждый катаклизм имеет ровно один scale_level;
каждый катаклизм имеет ровно один source_type;
все referenced mechanics существуют;
все referenced events существуют;
все referenced scars существуют;
все referenced quest templates существуют;
все referenced doctrines существуют.
SPEC-CATA-083. Gameplay lint
Дополнительные игровые проверки:
каждый катаклизм имеет минимум 1 контрплейную механику или уязвимость;
отсутствие циклических ссылок в stage_definitions;
все mechanic_ids существуют в реестре и имеют корректные role_tags с cataclysm;
resolution_policy_id ссылается на валидную политику;
каждый катаклизм имеет минимум один мост с другим доменом;
каждый катаклизм имеет нарративную доставку через минимум 2 канала;
каждый катаклизм имеет минимум один хук для скрытых веток или нарратива;
ContentRegistry не должен содержать дублирующихся ID.
8. Нормативные скелеты первой волны
SPEC-CATA-090. Список катаклизмов первой волны (6+)
natural-storm-archipelago (природный, региональный)
arcane-leyline-rupture (магический, точечный / региональный)
industrial-smog-blanket (индустриальный, региональный)
metaphysical-reality-tear (метафизический, глобальный)
necromantic-plague-tide (гибрид магический / метафизический, региональный, стык с SPEC-ECON шрамами)
player-ascension-catalyst (сценарный / порождаемый игроком, глобальный, хук для INT-25)
SPEC-CATA-091. Нормативные скелеты
9.1. natural-storm-archipelago
id: natural-storm-archipelago
source_type: procedural
archetype_tags: [natural]
scale_level: regional
stages: [buildup, peak, decay]
resolution: self_extinguishing + persistent_scar
9.2. arcane-leyline-rupture
id: arcane-leyline-rupture
source_type: scripted
archetype_tags: [arcane, metaphysical]
scale_level: regional
stages: [buildup, peak, decay]
resolution: external_intervention + persistent_scar
9.3. industrial-smog-blanket
id: industrial-smog-blanket
source_type: procedural
archetype_tags: [industrial]
scale_level: regional
stages: [buildup, peak, decay]
resolution: self_extinguishing + external_intervention
9.4. metaphysical-reality-tear
id: metaphysical-reality-tear
source_type: scripted
archetype_tags: [metaphysical]
scale_level: global
stages: [omen, buildup, peak, decay]
resolution: external_intervention + transformation
9.5. necromantic-plague-tide
id: necromantic-plague-tide
source_type: player_or_faction_driven
archetype_tags: [arcane, metaphysical]
scale_level: regional
stages: [outbreak, spread, peak, decay]
resolution: external_intervention + persistent_scar
9.6. player-ascension-catalyst
id: player-ascension-catalyst
source_type: player_or_faction_driven
archetype_tags: [metaphysical]
scale_level: global
stages: [awakening, transformation, ascension]
resolution: transformation
hidden_branch_hook: player_cataclysm_path
9. Вертикальный срез первой сборки
SPEC-CATA-100. Нормативный вертикальный срез
Первая сборка включает:
4 катаклизма (по одному на каждый базовый архетип):
natural-storm-archipelago
arcane-leyline-rupture
industrial-smog-blanket
metaphysical-reality-tear
систему шрамов узлов (NodeScarDefinition);
рабочий мост с экономикой (шоки + шрамы);
рабочий мост с флотом (изменение условий плавания + контрплейные теги).
Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.
10. Критерии приёмки спецификации
Спецификация считается принятой, если:
✅ зафиксированы 4 архетипа-источника × эффекты через теги;
✅ зафиксированы 3 источника возникновения;
✅ зафиксированы 3 уровня масштаба влияния;
✅ зафиксирована непрерывная временная модель;
✅ зафиксировано переменное число стадий (мин. 2);
✅ зафиксирована гибридная модель эскалации;
✅ зафиксирована data-driven resolution_policy;
✅ зафиксирован гибрид восстановимых эффектов и NodeScarDefinition;
✅ зафиксировано значимое влияние на политическую карту;
✅ зафиксировано полное влияние на экономику и флот;
✅ зафиксирована гибридная роль игрока + путь «игрок как катаклизм»;
✅ зафиксированы все 4 канала нарративной доставки;
✅ зафиксирована полная фракционная асимметрия и взаимодействие;
✅ зафиксирована plugin-based архитектура через MechanicDefinition;
✅ зафиксированы мосты со всеми доменами;
✅ зафиксированы именованные потоки RNG;
✅ зафиксированы полные снимки + журнал завершённых катаклизмов;
✅ зафиксирован уровень CI: schema + graph + gameplay lint;
✅ зафиксированы 6+ катаклизмов первой волны;
✅ зафиксирован вертикальный срез первой сборки.
11. Что остаётся за пределами этой спецификации
Следующее выносится в отдельные спецификации или будущие итерации:
числовой баланс (длительность, множители, шансы);
финальные тексты, лорные названия, арт, VFX, аудио;
мобильный UX и конкретные экраны;
детали боя, дуэли, напарников, отряда (только контрактные мосты);
детали генератора эпилога и миграции сохранений;
детали скрытых веток трансформации (здесь только хуки и EpilogueFactPort, логика ветки — отдельной спекой);
производительность на мобильных устройствах на уровне конкретных механик.
12. Приложение. Журнал решений по сбору данных
Вопрос
Решение (Ваш ответ)
Краткая расшифровка
1
D
Гибрид: 4 архетипа-источника × эффекты через теги
2
D
Три источника: случайные, сценарные, порождаемые игроком/фракциями
3
C
Три уровня: точечный, региональный, глобальный
4
D
Непрерывная модель: длительность как data-driven параметр
5
D
Переменное число стадий, задаваемое в данных (мин. 2)
6
D
Гибрид: линейный каркас + data-driven модификаторы
7
D
Data-driven resolution_policy с произвольным набором сценариев
8
C
Гибрид: восстановимые эффекты + персистентные NodeScarDefinition
9
C
Значимое влияние на политическую карту
10
D
Полное влияние на экономику (включая перестройку индексов)
11
D
Полное влияние на флот (специальные механики, контрплейные теги)
12
D
Гибрид: реактивное участие + активное управление и скрытые ветки
13
D
Полноценная трансформация с отдельной веткой доктрины капитана
14
D
Все 4 канала: текст, визуал, аудио, реакции напарников
15
D
Полная фракционная асимметрия (вызов, питание, контроль)
16
D
Полное взаимодействие фракций (использование, слияние и т.д.)
17
D
Plugin-based: CataclysmDefinition + набор MechanicDefinition
18
C
Полное переиспользование механик (эффекты, эскалация, взаимодействие)
19
B
Ядро + фракционные расширения
20
D
Мосты с экономикой, флотом, нарративом, геополитикой, напарниками, скрытыми ветками
21
C
Именованные потоки RNG (spawn, escalation, effects)
22
D
Полные снимки + журнал завершённых катаклизмов для эпилога
23
C
Валидация: Schema + graph + gameplay lint
24
D
6+ катаклизмов в первой волне
25
C
По одному на каждый архетип-источник + дополнительные
26
C
Вертикальный срез: 4 катаклизма + шрамы + мост с экономикой + мост с флотом
27
D
Полная связь с напарниками (источник, жертва, инструмент, противник)
28
C
Катаклизмы — полноценный источник квестов (расширение шаблонов)
29
C
Полноценные хуки + EpilogueFactPort для финала
30
D
Границы: всё из (C) + детали скрытых веток (отдельной спекой) + эпилог + миграции