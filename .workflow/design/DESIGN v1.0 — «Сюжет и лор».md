```markdown
# SPECIFICATION v1.0 — «Сюжет и лор»
**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-02  
**Статус:** сформирована, ожидает утверждения  
**Основана на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
`SPECIFICATION v1.0 — «Механики корабельных веток фракций»`  
`SPECIFICATION v1.0 — «Экономика (цепочки, гильдии, рынки, инвестиции)»`  
`SPECIFICATION v1.0 — «Катаклизмы (эскалация, последствия, трансформация)»`  
`SPECIFICATION v1.0 — «Система напарников»`  
`SPECIFICATION v1.0 — «Скрытые ветки трансформации»`  

**Покрываемые требования:**  
`INT-08` — глубокий сюжет и лор мира  
`INT-09` — нарративная глубина фракций и антагонистов  
`INT-10` — личные арки и предыстории  
`INT-30` — нарратив через 4 канала  
`INT-33.8` — обязательная глубокая проработка сюжета и лора  
`GD-07` — контент как данные, `ContentRegistry`, валидация схем  
`GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций  

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **сюжет и лор** как data-driven доменную подсистему, охватывающую структуру главного нарратива, предысторию капитана, центральный конфликт, модель памяти мира, пролог и финалы, фракционные нарративные арки, исторические слои мира, ключевых NPC, диалоговую модель и мультислойный ретроспективный лор.

Спецификация фиксирует:
- модель модульного нарративного скелета (`StoryBeacon` + `NarrativeArc`);
- конструктор предыстории капитана с нарративным весом (`BackgroundDefinition`);
- трёхуровневую модель центрального конфликта (системный + метафизический + антагонисты-лидеры);
- модель нарратива через среду (environmental storytelling) как основной канал;
- гибридную модель пролога (универсальная завязка + первый крупный выбор);
- гибридную модель финалов (большие пути + малые завершения арок через `EpilogueFactPort`);
- полноценные фракционные нарративные арки с кульминацией;
- трёхслойную модель истории мира (древняя магическая эпоха → индустриальная революция → текущий кризис);
- гибридную модель ключевых NPC (фиксированное ядро + динамическое состояние);
- диалоговую модель как механику через `MechanicDefinition`;
- мультислойный ретроспективный лор (находки + напарники + фракции + катаклизмы + память мёртвых + память артефактов);
- равноправный гибрид всех источников нарратива через `EpilogueFactPort`;
- plugin-based архитектуру на базе полного переиспользования `MechanicDefinition`;
- событийную модель и мосты с другими доменами;
- модель RNG, сохранений и требования к CI.

Спецификация не фиксирует:
- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали генератора эпилога и миграции сохранений;
- детали системы капитана (базовые статы, навыки, экипировка — только нарративный аспект фона);
- детали боя, дуэли, экономики, катаклизмов, напарников, скрытых веток (только контрактные мосты);
- конкретные нарративные тексты и диалоги;
- производительность на мобильных устройствах на уровне конкретных механик.

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-LORE-001. Модель модульного нарративного скелета
Используется модель:
**Обязательные сюжетные вехи (`StoryBeacon`) + свободно встраиваемые побочные арки (`NarrativeArc`)**

Правила:
- `StoryBeacon` — обязательная сюжетная веха, через которую должен пройти каждый забег;
- `NarrativeArc` — свободно встраиваемая побочная арка, которая может быть активирована, пропущена или модифицирована в зависимости от состояния мира;
- скелет декларируется через `StorySkeletonDefinition`;
- `StoryBeacon` имеет `ordering_policy_id` (порядок относительно других вех);
- `NarrativeArc` имеет `activation_policy_id` (условия активации);
- все элементы — data-driven.

### SPEC-LORE-002. Конструктор предыстории капитана с нарративным весом
Капитан создаётся через выбор `BackgroundDefinition`, который определяет стартовые условия, клятвы, первых напарников и нарративные зацепки, но не фиксирует личность.

Правила:
- каждый `BackgroundDefinition` имеет:
  - стартовые условия (ресурсы, репутация, отношения фракций);
  - стартовые клятвы (`oath_ids`);
  - стартовых напарников или зацепки для их поиска (`acquisition_hook_ids`);
  - нарративные зацепки (`narrative_hook_ids`);
  - нарративный тон и стартовую сцену;
- выбор фона публикует факты в `EpilogueFactPort`;
- конкретные значения — data-driven.

### SPEC-LORE-003. Трёхуровневая модель центрального конфликта
Центральный конфликт строится по модели:
**Системный конфликт фракций + метафизическая угроза как фон + конкретные антагонисты-лидеры фракций как нарративные якоря**

Правила:
- уровень 1: системный конфликт «Наука vs Магия» как война цивилизаций/фракций;
- уровень 2: метафизическая угроза (нарастающий раскол реальности) как фон;
- уровень 3: конкретные антагонисты-лидеры фракций (`AntagonistDefinition`) как нарративные якоря;
- все три уровня равноправны и взаимодействуют через события;
- все элементы — data-driven.

### SPEC-LORE-004. Нарратив через среду (environmental storytelling)
Основной способ подачи лора — через визуал, аудио, реакции напарников, диалоги NPC, без явных «текстовых свитков» как основного канала.

Правила:
- каждый нарративный элемент имеет `delivery_policy_id`;
- каналы доставки: визуал (шейдеры, шрамы, руины), аудио (темы, эмбиент), реакции напарников, диалоги NPC;
- явные текстовые находки (записки, книги) допустимы как дополнительный канал, но не основной;
- конкретные ассеты — вне scope этой спецификации.

### SPEC-LORE-005. Гибридная модель пролога
Используется модель:
**Короткий универсальный пролог-завязка + первый крупный нарративный выбор, определяющий стартовую фракцию/регион/конфликт**

Правила:
- пролог декларируется через `PrologueDefinition`;
- универсальная завязка — общая для всех игроков;
- первый крупный выбор — через `NarrativeChoiceDefinition`;
- выбор определяет стартовую фракцию, регион и начальный конфликт;
- пролог публикует факты в `EpilogueFactPort`;
- конкретные тексты — data-driven.

### SPEC-LORE-006. Гибридная модель финалов
Используется модель:
**Несколько «больших» финалов по ключевым путям + множество малых финалов-завершений арок, всё миксуется в эпилоге через `EpilogueFactPort`**

Правила:
- большие финалы декларируются через `EndingDefinition`;
- малые финалы — через завершение `NarrativeArc` и публикацию фактов;
- генератор эпилога миксует факты из всех источников;
- каждый финал имеет `epilogue_fact_policy_id`;
- конкретные тексты — data-driven.

### SPEC-LORE-007. Полноценные фракционные нарративные арки
Каждая фракция имеет свою цепочку квестов/событий с кульминацией, связанную с её доктриной и катаклизмами.

Правила:
- арка декларируется через `FactionNarrativeArcDefinition`;
- арка связана с доктриной фракции (`doctrine_id`);
- арка имеет кульминацию, связанную с катаклизмом или ключевым событием;
- арка публикует факты в `EpilogueFactPort`;
- конкретные тексты — data-driven.

### SPEC-LORE-008. Трёхслойная модель истории мира
История мира строится по модели:
**Древняя магическая эпоха → Индустриальная революция → Текущий кризис (аркан-панк)**

Правила:
- каждый слой декларируется через `LoreLayerDefinition`;
- каждый слой имеет `era_id`, `description_key`, `revelation_policy_id`;
- слои раскрываются постепенно через лорные находки, руины, память мёртвых, артефакты, лей-линии;
- конкретные тексты — data-driven.

### SPEC-LORE-009. Гибридная модель ключевых NPC
Используется модель:
**Ядро ключевых NPC фиксировано (лидеры фракций, антагонисты), но их состояние, отношения и выживание — динамические**

Правила:
- ядро NPC декларируется через `KeyNpcDefinition`;
- рантайм-состояние NPC — через `KeyNpcInstance`;
- NPC могут погибнуть, предать, сменить сторону;
- состояние NPC влияет на нарратив и публикует факты в `EpilogueFactPort`;
- конкретные диалоги — data-driven.

### SPEC-LORE-010. Диалоговая модель как механика
Диалоги реализуются как механика через `MechanicDefinition`: реплики имеют теги, влияют на отношения, репутацию, открывают/закрывают нарративные ветки.

Правила:
- диалоги декларируются через `DialogueDefinition`;
- реплики имеют теги (`dialogue_tags`);
- диалоги влияют на отношения, репутацию, нарративные ветки;
- диалоги реализуются через `MechanicDefinition` с `role_tags: ["dialogue"]`;
- конкретные тексты — data-driven.

### SPEC-LORE-011. Равноправный гибрид всех источников нарратива
Нарратив рождается из равноправного взаимодействия:
**Сюжетные вехи + катаклизмы + арки напарников + действия игрока — всё влияет на нарратив через `EpilogueFactPort`**

Правила:
- все источники публикуют факты в `EpilogueFactPort`;
- генератор эпилога миксует факты из всех источников;
- ни один источник не имеет приоритета над другим;
- все элементы — data-driven.

### SPEC-LORE-012. Мультислойный ретроспективный лор
История мира до действий игрока подаётся через мультислойный гибрид:
**Находки + напарники + фракции + катаклизмы (как «эхо прошлого») + память мёртвых (для некромантов) + память артефактов (для living-artifact)**

Правила:
- каждый слой декларируется через `LoreRevelationLayerDefinition`;
- слои раскрываются через разные каналы;
- память мёртвых и артефактов — faction-specific слои;
- все элементы — data-driven.

### SPEC-LORE-013. Переиспользование механик
Полное переиспользование `MechanicDefinition` из SPEC-FLEET, SPEC-PARTY, SPEC-CATA и SPEC-TRANS.

Правила:
- механики нарратива живут в общем реестре;
- namespace событий — `narrative.*` и `lore.*`;
- механики используют те же правила валидации;
- `role_tags` обязательно содержит `narrative` или `dialogue`;
- контракт `MechanicDefinition` един для всех доменов.

### SPEC-LORE-014. Событийная модель
Ядро + фракционные расширения (аналогично SPEC-FLEET-042 и SPEC-ECON-082).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

### SPEC-LORE-015. Модель RNG
Именованные изолированные потоки.

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

### SPEC-LORE-016. Модель сохранений
Полные JSON-снимки состояния нарратива + журнал ключевых событий для нарратива и генератора эпилога.

Правила:
- состояние нарратива сохраняется через полные снимки (Memento pattern);
- отдельный массив `narrative_events_journal` хранит ключевые события;
- снимки валидируются по JSON Schema.

### SPEC-LORE-017. Уровень валидации и CI
Schema + graph + gameplay lint (аналогично SPEC-FLEET-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

### SPEC-LORE-018. Масштаб первой волны
- 3 `BackgroundDefinition` (предыстории капитана);
- 5+ `StoryBeacon` (обязательные сюжетные вехи);
- 4 `FactionNarrativeArcDefinition` (по одной на фракцию);
- 3 `LoreLayerDefinition` (исторические слои);
- 8+ `KeyNpcDefinition` (лидеры фракций + антагонисты);
- 1 `PrologueDefinition` (гибридный пролог);
- 4+ `EndingDefinition` (большие финалы).

---

## 3. Data-контракты

### SPEC-LORE-020. Общие правила JSON-контента
`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `background.steam-engineer-apprentice.name`
- `story-beacon.first-cataclysm.name`
- `faction-arc.industrial-steam.name`
- `lore-layer.ancient-magical-era.name`
- `npc.steam-emperor.name`
- `dialogue.captain-meets-antagonist.name`
- `ending.arcane-mastery.name`

### SPEC-LORE-021. `BackgroundDefinition`
Пример:
```json
{
  "id": "background-steam-engineer-apprentice",
  "display_name_key": "background.steam-engineer-apprentice.name",
  "description_key": "background.steam-engineer-apprentice.description",
  "starting_conditions_policy_id": "steam-apprentice-start",
  "starting_oath_ids": ["oath-steam-guild-loyalty"],
  "starting_acquisition_hook_ids": ["rumor-tavern-steam-district"],
  "narrative_hook_ids": ["hook-steam-guild-conspiracy"],
  "starting_faction_affinity": {
    "industrial-steam": 20,
    "ancient-arcane": -10
  },
  "narrative_tone": "industrial-discipline",
  "prologue_scene_id": "prologue-steam-apprentice",
  "epilogue_fact_policy_id": "background-steam-apprentice-facts"
}
```

Правила:
- `id` уникален;
- `starting_conditions_policy_id` — обязательное поле;
- `narrative_hook_ids` — минимум один;
- фон не хранит рантайм-состояние.

### SPEC-LORE-022. `StoryBeaconDefinition`
Пример:
```json
{
  "id": "story-beacon-first-cataclysm",
  "display_name_key": "story-beacon.first-cataclysm.name",
  "description_key": "story-beacon.first-cataclysm.description",
  "ordering_policy_id": "beacon-order-policy",
  "activation_policy_id": "beacon-activation-policy",
  "completion_policy_id": "beacon-completion-policy",
  "mechanic_ids": [
    "narrative-beacon-first-cataclysm-tracker"
  ],
  "epilogue_fact_policy_id": "beacon-first-cataclysm-facts"
}
```

Правила:
- `id` уникален;
- `ordering_policy_id` — обязательное поле;
- `activation_policy_id` — обязательное поле;
- веха не хранит рантайм-состояние.

### SPEC-LORE-023. `NarrativeArcDefinition`
Пример:
```json
{
  "id": "narrative-arc-steam-guild-conspiracy",
  "display_name_key": "narrative-arc.steam-guild-conspiracy.name",
  "description_key": "narrative-arc.steam-guild-conspiracy.description",
  "activation_policy_id": "arc-activation-policy",
  "completion_policy_id": "arc-completion-policy",
  "mechanic_ids": [
    "narrative-arc-conspiracy-tracker"
  ],
  "epilogue_fact_policy_id": "arc-conspiracy-facts"
}
```

Правила:
- `id` уникален;
- `activation_policy_id` — обязательное поле;
- арка не хранит рантайм-состояние.

### SPEC-LORE-024. `FactionNarrativeArcDefinition`
Пример:
```json
{
  "id": "faction-arc-industrial-steam",
  "display_name_key": "faction-arc.industrial-steam.name",
  "description_key": "faction-arc.industrial-steam.description",
  "faction_id": "industrial-steam",
  "doctrine_id": "steam-forge-doctrine",
  "culmination_policy_id": "steam-arc-culmination",
  "cataclysm_link_policy_id": "steam-arc-cataclysm-link",
  "mechanic_ids": [
    "narrative-faction-steam-tracker"
  ],
  "epilogue_fact_policy_id": "faction-arc-steam-facts"
}
```

Правила:
- `id` уникален;
- `faction_id` — обязательное поле;
- `doctrine_id` — обязательное поле;
- арка связана с доктриной и катаклизмом;
- арка не хранит рантайм-состояние.

### SPEC-LORE-025. `LoreLayerDefinition`
Пример:
```json
{
  "id": "lore-layer-ancient-magical-era",
  "display_name_key": "lore-layer.ancient-magical-era.name",
  "description_key": "lore-layer.ancient-magical-era.description",
  "era_id": "ancient-magical",
  "chronological_order": 1,
  "revelation_policy_id": "ancient-era-revelation",
  "lore_fragment_ids": [
    "fragment-leyline-origins",
    "fragment-ancient-rituals"
  ]
}
```

Правила:
- `id` уникален;
- `chronological_order` — обязательное поле;
- слой не хранит рантайм-состояние.

### SPEC-LORE-026. `KeyNpcDefinition`
Пример:
```json
{
  "id": "npc-steam-emperor",
  "display_name_key": "npc.steam-emperor.name",
  "description_key": "npc.steam-emperor.description",
  "faction_id": "industrial-steam",
  "npc_type": "faction_leader",
  "core_dialogue_policy_id": "steam-emperor-core-dialogue",
  "dynamic_state_policy_id": "steam-emperor-dynamic-state",
  "mechanic_ids": [
    "npc-steam-emperor-relationship-tracker"
  ],
  "epilogue_fact_policy_id": "npc-steam-emperor-facts"
}
```

Правила:
- `id` уникален;
- `npc_type` — один из: `faction_leader`, `antagonist`, `key_ally`, `mentor`;
- `core_dialogue_policy_id` — обязательное поле;
- NPC не хранит рантайм-состояние.

### SPEC-LORE-027. `DialogueDefinition`
Пример:
```json
{
  "id": "dialogue-captain-meets-steam-emperor",
  "display_name_key": "dialogue.captain-meets-steam-emperor.name",
  "description_key": "dialogue.captain-meets-steam-emperor.description",
  "participants": ["captain", "npc-steam-emperor"],
  "dialogue_tags": ["political", "faction-leader"],
  "mechanic_ids": [
    "dialogue-steam-emperor-resolver"
  ],
  "outcome_policy_id": "dialogue-steam-emperor-outcome"
}
```

Правила:
- `id` уникален;
- `participants` — минимум 2;
- `dialogue_tags` — минимум один;
- диалог не хранит рантайм-состояние.

### SPEC-LORE-028. `PrologueDefinition`
Пример:
```json
{
  "id": "prologue-universal",
  "display_name_key": "prologue.universal.name",
  "description_key": "prologue.universal.description",
  "universal_scene_id": "prologue-universal-scene",
  "first_choice_policy_id": "prologue-first-choice",
  "choice_outcomes": [
    {
      "choice_id": "choice-steam-faction",
      "starting_faction": "industrial-steam",
      "starting_region": "steam-industrial-zone",
      "narrative_hook_ids": ["hook-steam-guild-conspiracy"]
    },
    {
      "choice_id": "choice-arcane-faction",
      "starting_faction": "ancient-arcane",
      "starting_region": "arcane-sanctum",
      "narrative_hook_ids": ["hook-leyline-activation"]
    }
  ],
  "epilogue_fact_policy_id": "prologue-facts"
}
```

Правила:
- `id` уникален;
- `first_choice_policy_id` — обязательное поле;
- `choice_outcomes` — минимум 2;
- пролог не хранит рантайм-состояние.

### SPEC-LORE-029. `EndingDefinition`
Пример:
```json
{
  "id": "ending-arcane-mastery",
  "display_name_key": "ending.arcane-mastery.name",
  "description_key": "ending.arcane-mastery.description",
  "ending_type": "major",
  "completion_policy_id": "ending-arcane-mastery-completion",
  "epilogue_fact_policy_id": "ending-arcane-mastery-facts"
}
```

Правила:
- `id` уникален;
- `ending_type` — один из: `major`, `minor`;
- финал не хранит рантайм-состояние.

### SPEC-LORE-030. `LoreRevelationLayerDefinition`
Пример:
```json
{
  "id": "lore-revelation-layer-companion",
  "display_name_key": "lore-revelation-layer.companion.name",
  "description_key": "lore-revelation-layer.companion.description",
  "layer_type": "companion",
  "revelation_policy_id": "companion-lore-revelation",
  "faction_specific": false
}
```

Пример faction-specific слоя:
```json
{
  "id": "lore-revelation-layer-necromantic-memory-of-dead",
  "display_name_key": "lore-revelation-layer.necromantic-memory-of-dead.name",
  "description_key": "lore-revelation-layer.necromantic-memory-of-dead.description",
  "layer_type": "faction_specific",
  "faction_id": "necromantic-corpse",
  "revelation_policy_id": "necromantic-memory-revelation",
  "faction_specific": true
}
```

Правила:
- `id` уникален;
- `layer_type` — один из: `discovery`, `companion`, `faction`, `cataclysm`, `faction_specific`;
- если `faction_specific: true`, то `faction_id` обязателен;
- слой не хранит рантайм-состояние.

### SPEC-LORE-031. Переиспользование `MechanicDefinition`
Механики нарратива используют тот же контракт, что и корабельные, с обязательными `role_tags` (например, `["narrative", "story-beacon"]`) и строгим разделением на resolver и tracker.

Пример резолвера:
```json
{
  "id": "dialogue-steam-emperor-resolver",
  "kind": "resolver",
  "faction_tags": ["industrial-steam"],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["narrative", "dialogue"],
  "params": {},
  "consumes": [
    "narrative.dialogue_started",
    "narrative.dialogue_choice_made"
  ],
  "emits": [
    "narrative.relationship_changed",
    "narrative.reputation_changed"
  ],
  "state_schema": null,
  "counterplay_tags": ["diplomacy"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "narrative",
    "persisted": false
  }
}
```

Пример трекера:
```json
{
  "id": "narrative-beacon-first-cataclysm-tracker",
  "kind": "tracker",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["narrative", "story-beacon"],
  "params": {},
  "consumes": [
    "cataclysm.triggered",
    "world.tick_advanced"
  ],
  "emits": [
    "narrative.story_beacon_progressed",
    "narrative.story_beacon_completed"
  ],
  "state_schema": {
    "$id": "mechanics/narrative-beacon-first-cataclysm-tracker/1",
    "type": "object",
    "properties": {
      "progress": { "type": "number" },
      "completed": { "type": "boolean" }
    },
    "required": ["progress", "completed"]
  },
  "counterplay_tags": [],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "narrative",
    "persisted": true
  }
}
```

Правила:
- контракт `MechanicDefinition` един для всех доменов;
- `role_tags` обязательно содержит `narrative` или `dialogue`;
- namespace событий — `narrative.*` и `lore.*`;
- механики проходят те же проверки валидации.

### SPEC-LORE-032. `NarrativeStateInstance` (Runtime)
Снимок состояния в Memento:
```json
{
  "captain_id": "captain-player",
  "background_id": "background-steam-engineer-apprentice",
  "active_story_beacons": [
    {
      "beacon_id": "story-beacon-first-cataclysm",
      "activated_tick": 100,
      "completed": false,
      "active_tracker_states": {
        "narrative-beacon-first-cataclysm-tracker": {
          "progress": 0.5,
          "completed": false
        }
      }
    }
  ],
  "completed_story_beacons": [
    {
      "beacon_id": "story-beacon-prologue-choice",
      "completed_tick": 50,
      "epilogue_facts": ["epilogue.narrative.prologue_choice_made"]
    }
  ],
  "active_narrative_arcs": [
    {
      "arc_id": "narrative-arc-steam-guild-conspiracy",
      "activated_tick": 120,
      "completed": false
    }
  ],
  "completed_narrative_arcs": [],
  "active_faction_arcs": [
    {
      "arc_id": "faction-arc-industrial-steam",
      "activated_tick": 150,
      "completed": false
    }
  ],
  "key_npc_instances": {
    "npc-steam-emperor": {
      "definition_id": "npc-steam-emperor",
      "relationship_value": 0.3,
      "alive": true,
      "current_state": "neutral"
    }
  },
  "revealed_lore_layers": [
    {
      "layer_id": "lore-layer-ancient-magical-era",
      "revelation_progress": 0.2
    }
  ],
  "narrative_events_journal": [
    {
      "event_id": "narrative.story_beacon_activated",
      "tick": 100,
      "beacon_id": "story-beacon-first-cataclysm",
      "epilogue_facts": ["epilogue.narrative.beacon_activated"]
    }
  ]
}
```

Правила:
- каждый капитан имеет снимок;
- снимок валидируется по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

---

## 4. Событийная модель

### SPEC-LORE-040. Каноническое ядро
Нормативный минимум:

| Событие | Назначение |
| --- | --- |
| narrative.story_beacon_activated | сюжетная веха активирована |
| narrative.story_beacon_completed | сюжетная веха завершена |
| narrative.arc_activated | нарративная арка активирована |
| narrative.arc_completed | нарративная арка завершена |
| narrative.faction_arc_activated | фракционная арка активирована |
| narrative.faction_arc_completed | фракционная арка завершена |
| narrative.dialogue_started | диалог начат |
| narrative.dialogue_choice_made | выбор в диалоге сделан |
| narrative.dialogue_ended | диалог завершён |
| narrative.npc_state_changed | состояние ключевого NPC изменилось |
| narrative.npc_died | ключевой NPC погиб |
| narrative.lore_layer_revealed | слой лора раскрыт |
| narrative.lore_fragment_discovered | фрагмент лора найден |
| narrative.prologue_completed | пролог завершён |
| narrative.ending_reached | финал достигнут |

Правила:
- эти события обязательны для ContentRegistry;
- механики нарратива могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий.

### SPEC-LORE-041. Фракционные расширения
Каждая фракция объявляет события в своём пространстве имён:
- `narrative.industrial-steam.*`
- `narrative.ancient-arcane.*`
- `narrative.necromantic-corpse.*`
- `narrative.living-artifact.*`

Примеры:
- `narrative.industrial-steam.steam-guild-conspiracy-progressed`
- `narrative.ancient-arcane.leyline-activation-discovered`
- `narrative.necromantic-corpse.memory-of-dead-revealed`
- `narrative.living-artifact.artifact-memory-unlocked`

Правила:
- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику.

### SPEC-LORE-042. Мосты с другими доменами
Мост narrative ↔ cataclysm:
- `cataclysm.triggered` → `narrative.story_beacon_activated`
- `cataclysm.ended` → `narrative.story_beacon_completed`

Мост narrative ↔ companion:
- `companion.reaction_triggered_macro` → `narrative.arc_activated`
- `companion.legacy_transform_unlocked` → `narrative.story_beacon_completed`

Мост narrative ↔ world:
- `world.ruler_changed` → `narrative.npc_state_changed`
- `world.location_changed` → `narrative.lore_fragment_discovered`

Мост narrative ↔ economy:
- `economy.scar_applied` → `narrative.lore_layer_revealed`

Мост narrative ↔ hidden_branch:
- `hidden_branch.activated` → `narrative.story_beacon_completed`
- `hidden_branch.final_state_reached` → `narrative.ending_reached`

Мост narrative ↔ narrative (публикация фактов в `EpilogueFactPort`):
- `epilogue.narrative.prologue_choice_made`
- `epilogue.narrative.beacon_completed`
- `epilogue.narrative.arc_completed`
- `epilogue.narrative.faction_arc_completed`
- `epilogue.narrative.npc_died`
- `epilogue.narrative.lore_revealed`
- `epilogue.narrative.ending_reached`

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

---

## 5. Детерминизм и RNG

### SPEC-LORE-050. Детерминизм
Симуляция нарратива полностью детерминирована от seed.

Правила:
- обязательна для тестов и реплеев;
- вся случайность — через seeded RNG service;
- сохранение + загрузка дают идентичное продолжение.

### SPEC-LORE-051. Именованные потоки RNG
Нормативные потоки:

| Поток | Назначение |
| --- | --- |
| rng.narrative.beacon_activation | активация сюжетных вех |
| rng.narrative.arc_activation | активация нарративных арок |
| rng.narrative.dialogue_outcome | исход диалогов |
| rng.narrative.npc_state | изменение состояния NPC |
| rng.narrative.lore_revelation | раскрытие слоёв лора |

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено.

---

## 6. Сохранения и состояние

### SPEC-LORE-060. Полные JSON-снимки + журнал
Состояние нарратива сохраняется через полные снимки `NarrativeStateInstance` (Memento pattern).

Отдельный массив `narrative_events_journal` хранит ключевые события для использования генератором эпилога.

Правила:
- каждый капитан имеет снимок;
- снимок валидируется по JSON Schema;
- журнал событий — отдельный массив;
- загрузка не восстанавливает поведение через журнал дельт;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-LORE-061. Валидация при загрузке
При загрузке:
- состояние нарратива проверяется по JSON Schema;
- состояние трекеров проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу.

---

## 7. Валидация и CI

### SPEC-LORE-070. Уровень валидации
Обязательный уровень: Schema + graph + gameplay lint.

### SPEC-LORE-071. Schema validation
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
- корректность ссылок на фракции, доктрины, NPC.

### SPEC-LORE-072. Graph integrity
Проверяется целостность графа контента:
```
NarrativeStateInstance
  → BackgroundDefinition
  → StoryBeaconDefinition[]
  → NarrativeArcDefinition[]
  → FactionNarrativeArcDefinition[]
    → DoctrineDefinition
  → LoreLayerDefinition[]
  → KeyNpcDefinition[]
  → DialogueDefinition[]
    → MechanicDefinition[]
      → EventDefinition[]
```

Обязательные проверки:
- каждый фон имеет стартовые условия;
- каждая веха имеет порядок и условия активации;
- каждая фракционная арка связана с доктриной;
- каждый слой лора имеет хронологический порядок;
- каждый ключевой NPC имеет тип;
- каждый диалог имеет участников;
- все referenced mechanics существуют;
- все referenced events существуют;
- все referenced factions существуют;
- все referenced doctrines существуют.

### SPEC-LORE-073. Gameplay lint
Дополнительные игровые проверки:
- каждая веха имеет минимум 1 условие завершения;
- каждая фракционная арка имеет кульминацию;
- каждый слой лора имеет минимум 1 фрагмент;
- каждый ключевой NPC имеет минимум 1 диалог;
- каждый диалог имеет минимум 1 исход;
- каждый финал публикует факт в `EpilogueFactPort`;
- отсутствие циклических ссылок;
- все `mechanic_ids` существуют в реестре и имеют корректные `role_tags` с `narrative` или `dialogue`;
- ContentRegistry не должен содержать дублирующихся ID.

---

## 8. Нормативные скелеты первой волны

### SPEC-LORE-080. `BackgroundDefinition` первой волны (3)
Минимум 3 предыстории:
- `background-steam-engineer-apprentice` (industrial-steam)
- `background-arcane-scholar` (ancient-arcane)
- `background-necromantic-outcast` (necromantic-corpse)

### SPEC-LORE-081. `StoryBeaconDefinition` первой волны (5+)
Минимум 5 обязательных вех:
- `story-beacon-prologue-choice` (пролог + первый выбор)
- `story-beacon-first-cataclysm` (первый катаклизм)
- `story-beacon-faction-conflict-escalation` (эскалация фракционного конфликта)
- `story-beacon-metaphysical-threat-revealed` (раскрытие метафизической угрозы)
- `story-beacon-final-confrontation` (финальное противостояние)

### SPEC-LORE-082. `FactionNarrativeArcDefinition` первой волны (4)
Минимум 4 фракционные арки (по одной на фракцию):
- `faction-arc-industrial-steam` (кульминация: промышленная катастрофа)
- `faction-arc-ancient-arcane` (кульминация: разрыв лей-линии)
- `faction-arc-necromantic-corpse` (кульминация: чумная эпидемия)
- `faction-arc-living-artifact` (кульминация: восстание артефактов)

### SPEC-LORE-083. `LoreLayerDefinition` первой волны (3)
Минимум 3 исторических слоя:
- `lore-layer-ancient-magical-era` (древняя магическая эпоха)
- `lore-layer-industrial-revolution` (индустриальная революция)
- `lore-layer-current-crisis` (текущий кризис — аркан-панк)

### SPEC-LORE-084. `KeyNpcDefinition` первой волны (8+)
Минимум 8 ключевых NPC:
- `npc-steam-emperor` (лидер industrial-steam)
- `npc-arcane-archmage` (лидер ancient-arcane)
- `npc-necromantic-high-priest` (лидер necromantic-corpse)
- `npc-artifact-keeper` (лидер living-artifact)
- `npc-steam-antagonist` (антагонист industrial-steam)
- `npc-arcane-antagonist` (антагонист ancient-arcane)
- `npc-necromantic-antagonist` (антагонист necromantic-corpse)
- `npc-artifact-antagonist` (антагонист living-artifact)

### SPEC-LORE-085. `PrologueDefinition` первой волны (1)
Минимум 1 гибридный пролог:
- `prologue-universal` (универсальная завязка + первый крупный выбор)

### SPEC-LORE-086. `EndingDefinition` первой волны (4+)
Минимум 4 больших финала:
- `ending-arcane-mastery` (мастерство над магией)
- `ending-industrial-integration` (полная механизация)
- `ending-necromantic-communion` (мастерство над смертью)
- `ending-metaphysical-ascension` (метафизическое возвышение)

---

## 9. Вертикальный срез первой сборки

### SPEC-LORE-090. Нормативный вертикальный срез
Первая сборка включает:
- 3 `BackgroundDefinition` с полными стартовыми условиями;
- 5 `StoryBeacon` с рабочими трекерами;
- 4 `FactionNarrativeArcDefinition` с кульминациями;
- 3 `LoreLayerDefinition` с фрагментами;
- 8 `KeyNpcDefinition` с динамическим состоянием;
- 1 `PrologueDefinition` с первым выбором;
- 4 `EndingDefinition` с публикацией фактов;
- работающий генератор нарративных зацепок;
- нарративную доставку через 4 канала;
- публикацию фактов в `EpilogueFactPort`;
- рабочие мосты с катаклизмами, напарниками, экономикой, скрытыми ветками;
- рабочий мост с `EpilogueFactPort`.

Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.

---

## 10. Критерии приёмки спецификации

Спецификация считается принятой, если:
✅ зафиксирована модель модульного нарративного скелета (`StoryBeacon` + `NarrativeArc`);  
✅ зафиксирован конструктор предыстории капитана с нарративным весом (`BackgroundDefinition`);  
✅ зафиксирована трёхуровневая модель центрального конфликта;  
✅ зафиксирована модель нарратива через среду (environmental storytelling);  
✅ зафиксирована гибридная модель пролога;  
✅ зафиксирована гибридная модель финалов через `EpilogueFactPort`;  
✅ зафиксированы полноценные фракционные нарративные арки;  
✅ зафиксирована трёхслойная модель истории мира;  
✅ зафиксирована гибридная модель ключевых NPC;  
✅ зафиксирована диалоговая модель как механика через `MechanicDefinition`;  
✅ зафиксирован равноправный гибрид всех источников нарратива;  
✅ зафиксирован мультислойный ретроспективный лор;  
✅ зафиксировано полное переиспользование `MechanicDefinition`;  
✅ зафиксированы новые ядерные события и потоки RNG;  
✅ зафиксированы правила gameplay lint для нарратива;  
✅ зафиксирован вертикальный срез первой сборки;  
✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;  
✅ зафиксированы мосты с катаклизмами, напарниками, экономикой, скрытыми ветками, нарративом;  
✅ зафиксирован `EpilogueFactPort`;  
✅ зафиксированы именованные потоки RNG;  
✅ зафиксированы полные снимки + журнал событий;  
✅ зафиксирован уровень CI: schema + graph + gameplay lint;  
✅ зафиксированы 3 фона, 5+ вех, 4 фракционные арки, 3 слоя лора, 8+ NPC, 1 пролог, 4+ финала.

---

## 11. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:
- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали генератора эпилога (только публикация фактов);
- детали системы капитана (базовые статы, навыки, экипировка);
- детали боя, дуэли, экономики, катаклизмов, напарников, скрытых веток (только контрактные мосты);
- конкретные нарративные тексты и диалоги;
- производительность на мобильных устройствах на уровне конкретных механик;
- миграции сохранений.

---

## 12. Приложение. Журнал решений по сбору данных

| Вопрос | Ответ пользователя | Решение в спецификации |
| --- | --- | --- |
| 1. Структура главного нарратива | D | Модульный «скелет» из обязательных сюжетных вех (`StoryBeacon`) + свободно встраиваемые побочные арки (`NarrativeArc`). |
| 2. Происхождение капитана | D | Конструктор с нарративным весом: выбор предыстории (`BackgroundDefinition`) определяет стартовые условия, клятвы, первых напарников и нарративные зацепки, но не фиксирует личность. |
| 3. Центральный конфликт | D | Гибрид: системный конфликт фракций + метафизическая угроза как фон + конкретные антагонисты-лидеры фракций как нарративные якоря. |
| 4. Модель «памяти мира» | D | Нарратив через среду: лор подаётся через визуал, аудио, реакции напарников, диалоги NPC — без явных «текстовых свитков» как основного канала. |
| 5. Точки входа / пролог | D | Гибрид: короткий универсальный пролог-завязка + первый крупный нарративный выбор, определяющий стартовую фракцию/регион/конфликт. |
| 6. Финалы игры | D | Гибрид: несколько «больших» финалов по ключевым путям + множество малых финалов-завершений арок, всё миксуется в эпилоге через `EpilogueFactPort`. |
| 7. Глубина фракционных нарративных арок | C | Полноценная арка: у каждой фракции своя цепочка квестов/событий с кульминацией, связанная с её доктриной и катаклизмами. |
| 8. Лорные эпохи / исторические слои мира | C | 3 слоя: древняя магическая эпоха → индустриальная революция → текущий кризис (аркан-панк). |
| 9. Ключевые NPC (структура) | C | Гибрид: ядро ключевых NPC фиксировано (лидеры фракций, антагонисты), но их состояние, отношения и выживание — динамические. |
| 10. Диалоговая модель | D | Диалоги как механика: реплики имеют теги, влияют на отношения, репутацию, открывают/закрывают нарративные ветки через `MechanicDefinition`. |
| 11. Нарративный приоритет между системами | D | Равноправный гибрид: сюжетные вехи + катаклизмы + арки напарников + действия игрока — всё влияет на нарратив через `EpilogueFactPort`. |
| 12. Ретроспективный лор | D | Мультислойный гибрид: находки + напарники + фракции + катаклизмы (как «эхо прошлого») + память мёртвых (для некромантов) + память артефактов (для living-artifact). |
```