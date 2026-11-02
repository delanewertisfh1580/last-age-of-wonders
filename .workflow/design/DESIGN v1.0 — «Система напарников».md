```markdown
# SPECIFICATION v1.0 — «Система напарников»

**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-02  
**Статус:** сформирована, ожидает утверждения  
**Основана на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
`SPECIFICATION v1.0 — «Менеджмент отряда»`  
`SPECIFICATION v1.0 — «Бой команд на фоне дуэли»`  

**Покрываемые требования:**  
`INT-20` — система напарников в духе Arcanum: уникальные персонажи, истории, реакции, бонусы/дебаффы  
`INT-21` — менеджмент команды по модели Battle Brothers (уникальные напарники не застрахованы от последствий)  
`INT-22` — состояние отряда влияет на нарратив  
`INT-30` — нарратив через 4 канала  
`INT-33.6` — обязательная глубокая проработка системы напарников: поиск, лор, реакции, бонусы/дебаффы  
`GD-07` — контент как данные, `ContentRegistry`, валидация схем  
`GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций  

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **нарративно-механическую глубину системы напарников** как data-driven доменную подсистему. Она является прямым расширением `SPECIFICATION v1.0 — «Менеджмент отряда»` и **не дублирует** её базовые положения (структура отряда, слоты экипировки, базовая зарплата, бесклассовая прокачка, базовая мораль).

Спецификация фиксирует:
- модель процедурно-генерируемых нарративных «зацепок» для найма (`AcquisitionHook`);
- многоуровневую шкалу отношений с капитаном с конкретными механическими порогами (`RelationshipThresholds`);
- полную систему межличностной синергии и конфликтов между напарниками (`CompanionSynergy`);
- высокую гранулярность нарративных реакций (макро-события, действия игрока, повседневные события);
- модель наследия перманентной смерти (трансформация во врага или триггер скрытой ветки капитана);
- масштаб первой волны (6+ уникальных напарников, включая двойного агента);
- расширение data-контрактов `CompanionDefinition` новыми политиками;
- событийные мосты для синергии, отношений и наследия;
- модель RNG и требования к CI для новых сущностей.

Спецификация не фиксирует:
- числовой баланс порогов отношений, значений бонусов/штрафов синергии;
- финальные тексты диалогов, лорные названия, арт, VFX, аудио;
- детали базового найма, экипировки и морали (уже покрыто SPEC-PARTY);
- конкретные нарративные тексты личных арок;
- детали скрытых веток трансформации (только хуки и контракты);
- детали боя, экономики, катаклизмов (только контрактные мосты);
- мобильный UX и конкретные экраны.

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-COMP-001. Процедурно-генерируемые нарративные зацепки (Acquisition)
Напарники не появляются на рынке труда. Их поиск инициируется через процедурно-генерируемые нарративные «зацепки» (слухи, события в городах, записки), которые при успешном выполнении ведут к стандартному диалогу найма.

Правила:
- зацепки декларируются через `acquisition_hook_policy_id`;
- генерация зависит от репутации, локации и прогресса личной арки;
- конкретные условия — data-driven;
- зацепка публикует событие `companion.acquisition_hook_triggered`;
- зацепка может быть провалена или отложена без потери возможности найма.

### SPEC-COMP-002. Многоуровневая шкала отношений с механическими порогами
Отношения с капитаном измеряются числовой шкалой, разделённой на уровни с конкретными механическими последствиями.

Правила:
- шкала декларируется через `relationship_thresholds_policy_id`;
- пример: значение >50 даёт пассивный бонус к морали отряда, значение <-50 даёт шанс на ослушание приказа в бою или саботаж;
- пороги публикуют события в нарративный порт (`party.companion_relationship_changed`);
- переход через порог — персистентное событие с нарративным весом;
- конкретные числа — вне scope.

### SPEC-COMP-003. Полная система межличностной синергии и конфликтов
Напарники эмоционально и механически взаимодействуют друг с другом.

Правила:
- комбинации напарников оцениваются через `synergy_policy_id`;
- совместимость даёт активные боевые бонусы или пассивные баффы;
- несовместимость (конфликт лора, например, маг и пуританин) даёт пассивные штрафы к морали или инициирует нарративные события-ссоры;
- синергии декларируются через `CompanionSynergyDefinition`;
- синергии публикуют события `companion.synergy_activated` / `companion.synergy_deactivated`.

### SPEC-COMP-004. Высокая гранулярность нарративных реакций
Напарники активно реагируют (диалогом, изменением настроения или действием) на широкий спектр событий.

Правила:
- реакции декларируются через `reaction_granularity_policy_id`;
- триггеры:
  - макро-события (смена правителя, активация катаклизма, смерть другого напарника, смена эпохи);
  - действия игрока (использование запрещённой магии, выбор жестоких опций в диалогах, разграбление мирных поселений);
  - повседневные события (использование специфической экипировки, посещение родного города напарника, специфические виды добычи);
- реакции публикуют событие `companion.reaction_triggered_daily` или `party.reaction_triggered`;
- конкретные триггеры и реакции — data-driven.

### SPEC-COMP-005. Наследие перманентной смерти (Permadeath Legacy)
Гибель уникального напарника оставляет персистентный след в мире и механике, выходящий за рамки простого удаления сущности.

Правила:
- декларируется через `permadeath_legacy_policy_id`;
- смерть может стать триггером для спавна этого напарника как уникального врага (нежить, мститель);
- смерть может разблокировать скрытую ветку трансформации капитана (например, путь некроманта);
- наследие публикует события `companion.legacy_enemy_spawned` / `companion.legacy_transform_unlocked`;
- наследие публикует факты в `EpilogueFactPort`;
- конкретные условия — data-driven.

### SPEC-COMP-006. Масштаб первой волны
Вертикальный срез включает 6+ уникальных напарников с полным циклом (личная арка, уникальные реакции, дерево отношений, синергия).

Правила:
- среди них обязательно присутствует как минимум один «двойной агент»;
- двойной агент может быть нанят вражеской фракцией или предать игрока при определённых условиях;
- каждый напарник имеет уникальный `CompanionDefinition`;
- каждый напарник имеет минимум 1 синергию и 1 конфликт с другим напарником;
- каждый напарник имеет минимум 1 реакцию на повседневное событие.

### SPEC-COMP-007. Переиспользование механик
Полное переиспользование `MechanicDefinition` из SPEC-FLEET и SPEC-PARTY.

Правила:
- механики напарников живут в общем реестре;
- namespace событий — `companion.*` и `party.*`;
- механики используют те же правила валидации;
- `role_tags` обязательно содержит `companion`;
- контракт `MechanicDefinition` един для всех доменов.

### SPEC-COMP-008. Событийная модель
Ядро + фракционные расширения (аналогично SPEC-PARTY-042 и SPEC-ECON-082).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

### SPEC-COMP-009. Модель RNG
Именованные изолированные потоки (дополнение к SPEC-PARTY-041).

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

### SPEC-COMP-010. Модель сохранений
Полные JSON-снимки состояния отряда с расширением для синергий, отношений и наследия.

Правила:
- снимки валидируются по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-COMP-011. Уровень валидации и CI
Schema + graph + gameplay lint (аналогично SPEC-PARTY-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

---

## 3. Data-контракты

### SPEC-COMP-020. Общие правила JSON-контента
`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `companion.double-agent.name`
- `companion.steam-engineer.description`
- `synergy.veterans-bond.description`
- `relationship.threshold.loyal.name`
- `legacy.undead-revenant.description`

### SPEC-COMP-021. Расширение `CompanionDefinition`
Базовый контракт из SPEC-PARTY-021 дополняется новыми политиками:

```json
{
  "id": "companion-double-agent",
  "display_name_key": "companion.double-agent.name",
  "description_key": "companion.double-agent.description",
  "base_stats": {
    "hp": 100,
    "strength": 10,
    "agility": 14,
    "endurance": 10
  },
  "mechanic_ids": [
    "companion-spy-network-resolver",
    "companion-betrayal-tracker"
  ],
  "relationship_tree_policy_id": "double-agent-relationship",
  "personal_arc_policy_id": "double-agent-arc",
  "acquisition_policy_id": "double-agent-quest",
  "acquisition_hook_policy_id": "rumor-tavern-arcane-district",
  "relationship_thresholds_policy_id": "double-agent-relationship",
  "synergy_policy_id": "double-agent-synergy",
  "reaction_granularity_policy_id": "high-granularity-reactions",
  "permadeath_legacy_policy_id": "legacy-betrayal-or-necromancy",
  "progression_policy_id": "skill-based-progression",
  "equipment_policy_id": "spy-equipment",
  "maintenance_policy_id": "standard-maintenance",
  "salary_policy_id": "spy-salary",
  "reaction_policy_id": "spy-reactions",
  "vulnerability_tags": ["exposure", "truth"],
  "counterplay_tags": ["diplomacy", "bribe"]
}
```

Правила:
- `id` уникален;
- `acquisition_hook_policy_id` — обязательное поле;
- `relationship_thresholds_policy_id` — обязательное поле;
- `synergy_policy_id` — обязательное поле;
- `reaction_granularity_policy_id` — обязательное поле;
- `permadeath_legacy_policy_id` — обязательное поле;
- напарник не хранит рантайм-состояние.

### SPEC-COMP-022. `RelationshipThresholdsDefinition`
Определяет механические пороги шкалы отношений:

```json
{
  "id": "double-agent-relationship",
  "display_name_key": "relationship.double-agent.name",
  "thresholds": [
    {
      "id": "threshold-devoted",
      "min_value": 75,
      "max_value": 100,
      "mechanical_effects": ["party_morale_bonus_large", "unlock_secret_arc"],
      "narrative_tone": "devoted",
      "epilogue_fact": "epilogue.companion.devoted_to_captain"
    },
    {
      "id": "threshold-loyal",
      "min_value": 50,
      "max_value": 74,
      "mechanical_effects": ["party_morale_bonus_small", "unlock_secret_dialogue"],
      "narrative_tone": "loyal"
    },
    {
      "id": "threshold-neutral",
      "min_value": -49,
      "max_value": 49,
      "mechanical_effects": [],
      "narrative_tone": "neutral"
    },
    {
      "id": "threshold-hostile",
      "min_value": -74,
      "max_value": -50,
      "mechanical_effects": ["chance_to_disobey_order", "chance_to_sabotage"],
      "narrative_tone": "hostile"
    },
    {
      "id": "threshold-betrayal",
      "min_value": -100,
      "max_value": -75,
      "mechanical_effects": ["guaranteed_betrayal_in_combat", "companion_leaves_party"],
      "narrative_tone": "betrayal",
      "epilogue_fact": "epilogue.companion.betrayed_captain"
    }
  ]
}
```

Правила:
- пороги не перекрываются;
- каждый порог имеет уникальный `id`;
- механические эффекты декларируются;
- публикация фактов в `EpilogueFactPort` — через `epilogue_fact`.

### SPEC-COMP-023. `CompanionSynergyDefinition`
Определяет пары или группы напарников и их эффекты:

```json
{
  "id": "synergy-engineer-and-disgraced-captain",
  "display_name_key": "synergy.veterans-bond.name",
  "description_key": "synergy.veterans-bond.description",
  "required_companion_ids": ["companion-steam-engineer", "companion-disgraced-captain"],
  "synergy_type": "positive",
  "mechanical_effects": ["combat_initiative_bonus", "repair_speed_boost"],
  "narrative_flavor_key": "synergy.veterans-bond.flavor",
  "activation_policy_id": "synergy-on-party-formation",
  "epilogue_fact": "epilogue.synergy.veterans-bond-activated"
}
```

Пример конфликта:

```json
{
  "id": "conflict-mage-and-puritan",
  "display_name_key": "conflict.faith-vs-arcana.name",
  "description_key": "conflict.faith-vs-arcana.description",
  "required_companion_ids": ["companion-arcane-mage", "companion-puritan-inquisitor"],
  "synergy_type": "negative",
  "mechanical_effects": ["party_morale_drain_small", "chance_to_quarrel"],
  "narrative_flavor_key": "conflict.faith-vs-arcana.flavor",
  "activation_policy_id": "conflict-on-shared-camp",
  "quarrel_event_id": "companion.quarrel.occurred"
}
```

Правила:
- `synergy_type` — один из: `positive`, `negative`;
- `required_companion_ids` — минимум 2 напарника;
- механические эффекты декларируются;
- конфликт может иметь `quarrel_event_id` для нарративного события-ссоры.

### SPEC-COMP-024. `PermadeathLegacyDefinition`
Определяет последствия смерти:

```json
{
  "id": "legacy-betrayal-or-necromancy",
  "display_name_key": "legacy.double-agent.name",
  "trigger_conditions": ["companion_died", "captain_has_necromancy_affinity"],
  "outcomes": [
    {
      "id": "outcome-necromancy",
      "condition": "captain_necromancy_affinity == true",
      "action": "unlock_captain_transformation_branch",
      "branch_id": "captain-necromancer-path",
      "epilogue_fact": "epilogue.companion.sacrificed_for_power"
    },
    {
      "id": "outcome-undead-enemy",
      "condition": "default",
      "action": "spawn_unique_enemy",
      "enemy_template_id": "enemy-undead-double-agent",
      "spawn_location_policy_id": "last-known-location",
      "epilogue_fact": "epilogue.companion.returned_as_undead"
    }
  ]
}
```

Правила:
- `trigger_conditions` — список условий;
- `outcomes` — минимум 1 исход;
- один исход может быть `default`;
- каждый исход публикует факт в `EpilogueFactPort`.

### SPEC-COMP-025. `AcquisitionHookDefinition`
Определяет нарративную зацепку для найма:

```json
{
  "id": "rumor-tavern-arcane-district",
  "display_name_key": "acquisition.rumor-tavern.name",
  "hook_type": "rumor",
  "location_filter_tags": ["arcane-district", "tavern"],
  "reputation_requirement_policy_id": "arcane-district-min-reputation",
  "quest_template_id": "double-agent-recruitment-quest",
  "generation_policy_id": "rumor-generation-policy",
  "narrative_flavor_key": "acquisition.rumor-tavern.flavor"
}
```

Правила:
- `hook_type` — один из: `rumor`, `event`, `note`, `quest`;
- зацепка ссылается на `quest_template_id` или нарративную сцену;
- зацепка декларирует условия появления;
- зацепка публикует событие `companion.acquisition_hook_triggered`.

### SPEC-COMP-026. `ReactionGranularityDefinition`
Определяет триггеры реакций:

```json
{
  "id": "high-granularity-reactions",
  "macro_triggers": [
    {
      "event_id": "world.ruler_changed",
      "reaction_policy_id": "reaction-to-new-ruler"
    },
    {
      "event_id": "cataclysm.activated",
      "reaction_policy_id": "reaction-to-cataclysm"
    },
    {
      "event_id": "party.companion_died",
      "reaction_policy_id": "reaction-to-companion-death"
    }
  ],
  "player_action_triggers": [
    {
      "event_id": "player.used_forbidden_magic",
      "reaction_policy_id": "reaction-to-forbidden-magic"
    },
    {
      "event_id": "player.chose_cruel_dialogue",
      "reaction_policy_id": "reaction-to-cruelty"
    },
    {
      "event_id": "player.looted_peasant_settlement",
      "reaction_policy_id": "reaction-to-looting"
    }
  ],
  "daily_triggers": [
    {
      "event_id": "player.equipped_specific_item",
      "item_filter_tags": ["forbidden", "sacred"],
      "reaction_policy_id": "reaction-to-equipment"
    },
    {
      "event_id": "world.entered_home_city",
      "reaction_policy_id": "reaction-to-home-city"
    },
    {
      "event_id": "economy.looted_specific_good",
      "good_filter_tags": ["relic", "artifact"],
      "reaction_policy_id": "reaction-to-relic-loot"
    }
  ]
}
```

Правила:
- три категории триггеров: `macro_triggers`, `player_action_triggers`, `daily_triggers`;
- каждый триггер ссылается на `reaction_policy_id`;
- реакции декларируются в данных;
- реакции публикуют событие `companion.reaction_triggered_daily` или `party.reaction_triggered`.

### SPEC-COMP-027. Переиспользование `MechanicDefinition`
Механики напарников используют тот же контракт, что и корабельные, с обязательными `role_tags` (например, `["companion", "combat"]`) и строгим разделением на resolver и tracker.

Пример резолвера:

```json
{
  "id": "companion-spy-network-resolver",
  "kind": "resolver",
  "faction_tags": ["ancient-arcane"],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["companion", "support"],
  "params": {},
  "consumes": [
    "world.tick_advanced",
    "economy.quest_generated"
  ],
  "emits": [
    "companion.spy_intel_gathered"
  ],
  "state_schema": null,
  "counterplay_tags": ["exposure", "truth"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "companion",
    "persisted": false
  }
}
```

Пример трекера:

```json
{
  "id": "companion-betrayal-tracker",
  "kind": "tracker",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["companion", "narrative"],
  "params": {},
  "consumes": [
    "party.companion_relationship_changed",
    "combat.started"
  ],
  "emits": [
    "companion.betrayal_triggered",
    "companion.betrayal_averted"
  ],
  "state_schema": {
    "$id": "mechanics/companion-betrayal-tracker/1",
    "type": "object",
    "properties": {
      "betrayal_charges": { "type": "number" },
      "last_relationship_value": { "type": "number" }
    },
    "required": ["betrayal_charges", "last_relationship_value"]
  },
  "counterplay_tags": ["diplomacy", "bribe"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "companion",
    "persisted": true
  }
}
```

Правила:
- контракт `MechanicDefinition` един для всех доменов;
- `role_tags` обязательно содержит `companion`;
- namespace событий — `companion.*` и `party.*`;
- механики проходят те же проверки валидации.

### SPEC-COMP-028. `PartyInstance` (Runtime) — расширение
Снимок состояния в Memento дополняется массивом активных синергий и историей пересечённых порогов отношений:

```json
{
  "party_id": "party-player-1",
  "captain_id": "captain-player",
  "companion_ids": ["companion-inst-1", "companion-inst-2", "companion-inst-3"],
  "global_morale": 0.8,
  "active_synergies": [
    {
      "synergy_id": "synergy-engineer-and-disgraced-captain",
      "activated_tick": 1200,
      "active": true
    }
  ],
  "active_conflicts": [
    {
      "synergy_id": "conflict-mage-and-puritan",
      "activated_tick": 1250,
      "active": true
    }
  ],
  "companion_instances": {
    "companion-inst-1": {
      "definition_id": "companion-steam-engineer",
      "current_stats": {
        "hp": 120,
        "strength": 17,
        "agility": 10,
        "endurance": 14
      },
      "skills": {
        "engineering": 45,
        "repair": 30
      },
      "equipment": {
        "weapon": "equipment-inst-iron-sword-1",
        "armor": "equipment-inst-steel-armor-1",
        "helmet": null,
        "accessory": "equipment-inst-steam-goggles-1",
        "consumable": "equipment-inst-repair-kit-1"
      },
      "relationship_with_captain": 0.7,
      "current_relationship_threshold_id": "threshold-loyal",
      "crossed_relationship_thresholds": ["threshold-loyal"],
      "mood_effects": ["confident", "tired"],
      "permanent_scars": [],
      "active_tracker_states": {
        "companion-steam-repair-tracker": {
          "repair_charges": 3,
          "last_used_tick": 1500
        }
      }
    }
  },
  "permadeath_legacy_resolved": {
    "companion-double-agent": "spawned_undead_enemy"
  },
  "party_events_journal": [
    {
      "event_id": "party.companion_recruited",
      "tick": 1200,
      "companion_id": "companion-inst-1",
      "epilogue_facts": ["epilogue.party.recruited_engineer"]
    },
    {
      "event_id": "companion.relationship_threshold_crossed",
      "tick": 1300,
      "companion_id": "companion-inst-1",
      "threshold_id": "threshold-loyal",
      "epilogue_facts": ["epilogue.companion.became_loyal"]
    }
  ]
}
```

Правила:
- каждый отряд имеет снимок;
- снимок валидируется по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

---

## 4. Событийная модель

### SPEC-COMP-030. Каноническое ядро (расширение к SPEC-PARTY-030)
Добавляются следующие обязательные события:

| Событие | Назначение |
| --- | --- |
| `companion.acquisition_hook_triggered` | нарративная зацепка для найма стала доступна |
| `companion.acquisition_hook_completed` | зацепка успешно завершена, напарник готов к найму |
| `companion.acquisition_hook_failed` | зацепка провалена |
| `companion.relationship_threshold_crossed` | отношение с капитаном пересекло механический порог |
| `companion.synergy_activated` | активирован бонус синергии между напарниками |
| `companion.synergy_deactivated` | деактивирован бонус синергии (смерть, увольнение) |
| `companion.conflict_activated` | активирован конфликт между напарниками |
| `companion.conflict_deactivated` | деактивирован конфликт |
| `companion.quarrel_occurred` | нарративное событие-ссора между напарниками |
| `companion.reaction_triggered_daily` | сработала реакция на повседневное событие |
| `companion.reaction_triggered_macro` | сработала реакция на макро-событие |
| `companion.reaction_triggered_player_action` | сработала реакция на действие игрока |
| `companion.disobeyed_order` | напарник ослушался приказа в бою |
| `companion.sabotage_attempted` | напарник попытался саботировать |
| `companion.betrayal_triggered` | напарник предал отряд |
| `companion.legacy_enemy_spawned` | погибший напарник вернулся как уникальный враг |
| `companion.legacy_transform_unlocked` | смерть напарника разблокировала скрытую ветку капитана |

Правила:
- эти события обязательны для ContentRegistry;
- механики напарников могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий.

### SPEC-COMP-031. Фракционные расширения
Каждая фракция объявляет события в своём пространстве имён:
- `companion.industrial-steam.*`
- `companion.ancient-arcane.*`
- `companion.necromantic-corpse.*`
- `companion.living-artifact.*`

Примеры:
- `companion.industrial-steam.engineer-reacts-to-magic-use`
- `companion.ancient-arcane.mage-reacts-to-technology`
- `companion.necromantic-corpse.necromancer-reacts-to-death`
- `companion.living-artifact.artifact-reacts-to-relic`

Правила:
- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику.

### SPEC-COMP-032. Мосты с другими доменами

**Мост companion ↔ party:**
- `party.companion_recruited` → `companion.acquisition_hook_completed`
- `party.companion_died` → `companion.legacy_enemy_spawned` / `companion.legacy_transform_unlocked`

**Мост companion ↔ combat:**
- `combat.order_issued` → проверка `relationship_thresholds` → возможный `companion.disobeyed_order`
- `combat.started` → проверка `companion.betrayal_triggered` для двойных агентов

**Мост companion ↔ world:**
- `world.ruler_changed` → `companion.reaction_triggered_macro`
- `world.location_changed` (родной город) → `companion.reaction_triggered_daily`
- `cataclysm.activated` → `companion.reaction_triggered_macro`

**Мост companion ↔ economy:**
- `economy.looted_specific_good` → `companion.reaction_triggered_daily`
- `economy.trade_executed` (запрещённый товар) → `companion.reaction_triggered_player_action`

**Мост companion ↔ narrative:**
Публикация фактов в `EpilogueFactPort`:
- `epilogue.companion.acquisition_hook_completed`
- `epilogue.companion.became_loyal`
- `epilogue.companion.became_hostile`
- `epilogue.companion.betrayed_captain`
- `epilogue.companion.returned_as_undead`
- `epilogue.companion.sacrificed_for_power`
- `epilogue.companion.quarreled_with_companion`
- `epilogue.synergy.veterans-bond-activated`
- `epilogue.conflict.faith-vs-arcana-escalated`

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

---

## 5. Детерминизм и RNG

### SPEC-COMP-040. Детерминизм
Симуляция напарников полностью детерминирована от seed.

Правила:
- обязательна для тестов и реплеев;
- вся случайность — через seeded RNG service;
- сохранение + загрузка дают идентичное продолжение.

### SPEC-COMP-041. Именованные потоки RNG (дополнение к SPEC-PARTY-041)
Добавляются изолированные потоки:

| Поток | Назначение |
| --- | --- |
| `rng.companion.acquisition_hook` | генерация и появление нарративных зацепок |
| `rng.companion.relationship` | проверка шансов на ослушание/саботаж при низких отношениях |
| `rng.companion.daily_reaction` | вероятность срабатывания реакций на повседневные события |
| `rng.companion.synergy_activation` | вероятность активации синергии/конфликта |
| `rng.companion.legacy_outcome` | выбор исхода наследия перманентной смерти |

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено.

---

## 6. Сохранения и состояние

### SPEC-COMP-050. Полные JSON-снимки + журнал
Состояние отряда сохраняется через полные снимки `PartyInstance` (Memento pattern) с расширением для синергий, отношений и наследия.

Отдельный массив `party_events_journal` хранит ключевые события для использования генератором эпилога.

Правила:
- каждый отряд имеет снимок;
- снимок валидируется по JSON Schema;
- журнал событий — отдельный массив;
- загрузка не восстанавливает поведение через журнал дельт;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-COMP-051. Валидация при загрузке
При загрузке:
- состояние отряда проверяется по JSON Schema;
- состояние напарников проверяется по JSON Schema;
- состояние трекеров проверяется по JSON Schema;
- состояние синергий проверяется по JSON Schema;
- состояние наследия проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу.

---

## 7. Валидация и CI

### SPEC-COMP-060. Уровень валидации
Обязательный уровень: Schema + graph + gameplay lint.

### SPEC-COMP-061. Schema validation
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
- корректность ссылок на напарников, экипировку;
- корректность ссылок на политики отношений, синергии, наследия.

### SPEC-COMP-062. Graph integrity
Проверяется целостность графа контента:

```
PartyInstance
  → CompanionDefinition[]
    → MechanicDefinition[]
      → EventDefinition[]
    → EquipmentDefinition[]
    → RelationshipThresholdsDefinition
    → CompanionSynergyDefinition[]
    → PermadeathLegacyDefinition
    → AcquisitionHookDefinition
    → ReactionGranularityDefinition
```

Обязательные проверки:
- каждый напарник имеет базовые статы;
- каждый напарник имеет минимум 2 механики;
- каждая экипировка имеет слот;
- каждый напарник имеет `relationship_thresholds_policy_id`;
- каждый напарник имеет `synergy_policy_id`;
- каждый напарник имеет `permadeath_legacy_policy_id`;
- каждый напарник имеет `acquisition_hook_policy_id`;
- каждый напарник имеет `reaction_granularity_policy_id`;
- все referenced mechanics существуют;
- все referenced events существуют;
- все referenced equipment существует;
- все referenced synergies ссылаются на существующих напарников.

### SPEC-COMP-063. Gameplay lint (дополнение к SPEC-PARTY-063)
Дополнительные игровые проверки:
- каждый напарник имеет минимум 1 запись в `synergy_policy_id` (положительную или отрицательную);
- каждый напарник имеет как минимум 1 реакцию на повседневное событие в `reaction_granularity_policy_id`;
- `permadeath_legacy_policy_id` обязан иметь как минимум 1 валидный исход (враг или трансформация);
- двойные агенты обязаны иметь декларированный `betrayal_condition` или `enemy_faction_affinity`;
- каждый напарник имеет минимум 1 контрплейный тег;
- отсутствие циклических ссылок;
- все `mechanic_ids` существуют в реестре и имеют корректные `role_tags` с `companion`;
- каждый напарник имеет минимум одну реакцию на ключевые события;
- каждый напарник имеет личную арку;
- ContentRegistry не должен содержать дублирующихся ID;
- пороги отношений не перекрываются;
- синергии ссылаются на существующих напарников.

---

## 8. Нормативные скелеты первой волны

### SPEC-COMP-070. Напарники первой волны (6+)
Минимум 6 напарников с полным циклом:

1. **`companion-steam-engineer`** (industrial-steam)
   - механики: давление, ремонт
   - синергия: с ветеранами (`companion-disgraced-captain`)
   - конфликт: с фанатиками магии
   - реакции: на использование парового оружия, посещение промышленных узлов
   - наследие: спавн как паровой автоматон-враг

2. **`companion-arcane-mage`** (ancient-arcane)
   - механики: резонанс с лей-линиями, ритуалы
   - синергия: с исследователями
   - конфликт: с инженерами, пуританами
   - реакции: на посещение магических узлов, использование технологий
   - наследие: разблокирует ветку архимага для капитана

3. **`companion-necromancer`** (necromantic-corpse)
   - механики: поднятие трупов, проклятия
   - синергия: с изгоями
   - конфликт: с пуританами, целителями
   - реакции: на посещение кладбищ, использование священных предметов
   - наследие: разблокирует ветку некроманта для капитана

4. **`companion-relic-hunter`** (living-artifact)
   - механики: адаптация корпуса, память создателя
   - синергия: с торговцами
   - конфликт: с разрушителями артефактов
   - реакции: на специфические виды добычи (артефакты), посещение руин
   - наследие: спавн как пробуждённый артефакт-враг

5. **`companion-disgraced-captain`** (neutral/industrial-steam)
   - механики: тактическое командование, мотивация
   - синергия: сильная с инженером (`companion-steam-engineer`)
   - конфликт: с трусами, дезертирами
   - реакции: на тактические решения в бою, посещение родного порта
   - наследие: спавн как вражеский капер

6. **`companion-double-agent`** (ancient-arcane facade / necromantic-corpse loyalty)
   - механики: шпионская сеть, предательство
   - синергия: с манипуляторами
   - конфликт: с честными воинами
   - реакции: на использование запрещённой магии, разоблачение
   - наследие: спавн как уникальный враг-нежить ИЛИ разблокирует ветку некроманта для капитана
   - **особое**: может быть нанят вражеской фракцией; при отношениях <-50 имеет шанс предать отряд в бою

### SPEC-COMP-071. Синергии первой волны
Минимум 3 пары синергии/конфликта:
- `synergy-engineer-and-disgraced-captain` (positive)
- `conflict-mage-and-puritan` (negative)
- `synergy-necromancer-and-outcast` (positive)
- `conflict-double-agent-and-honest-warrior` (negative)

### SPEC-COMP-072. Наследие первой волны
Минимум 3 сценария наследия:
- `legacy-undead-revenant` — спавн врага-нежити
- `legacy-necromancer-path` — разблокировка ветки некроманта
- `legacy-betrayal-or-necromancy` — двойной исход для двойного агента

---

## 9. Вертикальный срез первой сборки

### SPEC-COMP-080. Нормативный вертикальный срез
Первая сборка включает:
- 6 напарников с полными циклами (арки, реакции, синергия, наследие);
- работающий генератор нарративных зацепок (`acquisition_hook`);
- интеграцию порогов отношений с механикой боя (шанс ослушания);
- минимум 3 пары синергии/конфликта;
- реализацию 1 сценария наследия перманентной смерти (спавн врага);
- рабочие мосты с боем, нарративом и `EpilogueFactPort`;
- рабочий мост с экономикой (реакции на добычу и торговлю);
- рабочий мост с катаклизмами (реакции на макро-события);
- рабочий мост с нарративом (4 канала + `EpilogueFactPort`).

Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.

---

## 10. Критерии приёмки спецификации

Спецификация считается принятой, если:
✅ зафиксирована модель процедурно-генерируемых нарративных зацепок для найма;  
✅ зафиксирована многоуровневая шкала отношений с механическими порогами;  
✅ зафиксирована полная система межличностной синергии и конфликтов;  
✅ зафиксирована высокая гранулярность нарративных реакций (включая повседневные события);  
✅ зафиксирована модель наследия перманентной смерти (враг или трансформация капитана);  
✅ зафиксирован масштаб первой волны: 6+ напарников, включая двойного агента;  
✅ расширены data-контракты `CompanionDefinition` новыми политиками;  
✅ зафиксированы новые ядерные события и потоки RNG;  
✅ зафиксированы правила gameplay lint для синергии и наследия;  
✅ зафиксирован вертикальный срез первой сборки;  
✅ зафиксировано переиспользование `MechanicDefinition`;  
✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;  
✅ зафиксированы мосты с боем, экономикой, катаклизмами, нарративом, отрядом;  
✅ зафиксирован `EpilogueFactPort`;  
✅ зафиксированы именованные потоки RNG;  
✅ зафиксированы полные снимки + журнал событий;  
✅ зафиксирован уровень CI: schema + graph + gameplay lint;  
✅ зафиксированы 6 напарников первой волны;  
✅ зафиксирован двойной агент как обязательный элемент первой волны.

---

## 11. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:
- числовой баланс порогов отношений, значений бонусов/штрафов;
- финальные тексты диалогов, лорные названия, арт, VFX, аудио;
- базовая структура отряда, экипировка, зарплата и мораль (покрыто SPEC-PARTY);
- детали генератора эпилога (только публикация фактов);
- детали скрытых веток трансформации (только хуки и контракты);
- детали боя, экономики, катаклизмов (только контрактные мосты);
- конкретные нарративные тексты личных арок;
- мобильный UX и конкретные экраны;
- производительность на мобильных устройствах на уровне конкретных механик.

---

## 12. Приложение. Журнал решений по сбору данных

| Вопрос | Ответ пользователя | Решение в спецификации |
| --- | --- | --- |
| 1. Глубина и триггеры поиска/найма | **B** | Процедурно генерируемые нарративные «зацепки» (слухи, события), ведущие к стандартному диалогу найма. |
| 2. Механика отношений с капитаном | **B** | Многоуровневая шкала с конкретными механическими порогами (бонусы к морали, шанс ослушания). |
| 3. Взаимодействие напарников между собой | **A** | Полная система: активные бонусы (синергия) и пассивные штрафы к морали (конфликт лора). |
| 4. Гранулярность нарративных реакций | **C** | Реакции на макро-события, действия игрока и повседневные события (экипировка, родной город, добыча). |
| 5. Наследие и последствия перманентной смерти | **D** | Смерть может стать триггером для превращения напарника во врага или разблокировки скрытой ветки капитана. |
| 6. Масштаб первой волны | **D** | 6+ уникальных напарников, включая как минимум одного двойного агента / потенциального врага. |

---