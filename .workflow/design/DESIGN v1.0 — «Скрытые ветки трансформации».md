```markdown
# SPECIFICATION v1.0 — «Скрытые ветки трансформации»

**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-02  
**Статус:** ✅ утверждено (актуализировано 2026-11-14)  
**Основана на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
`SPECIFICATION v1.0 — «Механики корабельных веток фракций»`  
`SPECIFICATION v1.0 — «Экономика (цепочки, гильдии, рынки, инвестиции)»`  
`SPECIFICATION v1.0 — «Катаклизмы (эскалация, последствия, трансформация)»`  
`SPECIFICATION v1.0 — «Бой команд на фоне дуэли»`  
`SPECIFICATION v1.0 — «Менеджмент отряда»`  
`SPECIFICATION v1.0 — «Система напарников»`

**Покрываемые требования:**  
`INT-25` — путь «игрок как катаклизм»  
`INT-26` — скрытые ветки трансформации  
`INT-30` — нарратив через 4 канала  
`INT-33.7` — обязательная глубокая проработка скрытых веток трансформации  
`GD-07` — контент как данные, `ContentRegistry`, валидация схем  
`GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **скрытые ветки трансформации капитана** как data-driven доменную подсистему, охватывающую архитектуру трансформаций, модель триггеров, древо состояний, влияние на игровые системы и интеграцию с нарративом и эпилогом.

Спецификация фиксирует:
- границы доменного контекста `HiddenBranches`;
- модель трансформации исключительно сущности `Captain`;
- событийно-ориентированную модель триггеров через `Cataclysm` и `WorldEvent`;
- архитектуру древа состояний с несколькими финалами;
- модель модификации игровых систем через `MechanicDefinition` и теги;
- нарративную доставку через 4 канала без точных цифр и прогресс-баров;
- интеграцию с `EpilogueFactPort` и мета-слоем эпилога;
- модульный конструктор из 5 базовых `TransformationNode`;
- plugin-based архитектуру на базе полного переиспользования `MechanicDefinition`;
- событийную модель и мосты с другими доменами;
- модель RNG, сохранений и требования к CI.

Спецификация не фиксирует:
- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали генератора эпилога и миграции сохранений;
- детали системы капитана (базовые статы, навыки, экипировка — выносятся в отдельную спецификацию);
- детали боя, дуэли, экономики, катаклизмов, напарников (только контрактные мосты);
- конкретные нарративные тексты.

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-TRANS-001. Границы доменного контекста `HiddenBranches`

`HiddenBranches` владеет только логикой трансформации капитана. Капитан, корабль, отряд, экономика находятся в других контекстах.

Правила:
- `HiddenBranches` не владеет состоянием капитана;
- `HiddenBranches` не владеет состоянием корабля;
- `HiddenBranches` не владеет состоянием отряда;
- `HiddenBranches` общается с другими контекстами только через события и порты.

### SPEC-TRANS-002. Трансформация только сущности `Captain`

Скрытые ветки трансформации применяются исключительно к сущности `Captain`. Напарники, корабль, экипаж не трансформируются в рамках этой спецификации.

Правила:
- трансформация меняет глобальные правила игры, восприятие мира и базовые контракты;
- напарники могут реагировать на трансформацию, но не мутируют;
- корабль может адаптироваться к трансформации капитана, но не становится живой сущностью;
- конкретные эффекты трансформации — data-driven.

### SPEC-TRANS-003. Событийно-ориентированная модель триггеров

Трансформации триггерятся только как прямые последствия `Cataclysm` (из SPEC-CATA) или специфических `WorldEvent`. Скрытые трекеры и накопление очков отсутствуют.

Правила:
- каждый триггер декларируется через `transformation_trigger_policy_id`;
- допустимые источники: `cataclysm.*`, `world.event_occurred`, `companion.legacy_transform_unlocked`;
- нет фоновых трекеров типа `corruption` или `ether-saturation`;
- триггер публикует событие `hidden_branch.trigger_evaluated`;
- конкретные условия — data-driven.

### SPEC-TRANS-004. Архитектура древа состояний

Каждая ветка трансформации имеет структуру древа состояний с несколькими финалами внутри одной ветки.

Правила:
- древо декларируется через `transformation_tree_policy_id`;
- пример: ветка "Арканный путь" может закончиться как "Контроль над магией" (мастерство), так и "Полная одержимость" (падение);
- каждое состояние имеет `id`, `entry_conditions_policy_id`, `exit_conditions_policy_id`;
- переходы между состояниями — data-driven;
- финалы публикуют факты в `EpilogueFactPort`.

### SPEC-TRANS-005. Модификация систем через `MechanicDefinition` и теги

Трансформация не создаёт полностью новых систем, а модифицирует существующие через `MechanicDefinition` и теги.

Правила:
- стандартный бой/экономика обрастают новыми правилами через механики-плагины;
- трансформация добавляет новые уязвимости и контрплейные теги;
- механики используют тот же контракт `MechanicDefinition` из SPEC-FLEET;
- `role_tags` обязательно содержит `transformation`;
- конкретные модификации — data-driven.

### SPEC-TRANS-006. Нарративная доставка через 4 канала

Трансформация доставляется игроку через нарастающие "симптомы" в 4 нарративных каналах без точных цифр и прогресс-баров.

Правила:
- каналы: текст (диалоги, описания), визуал (шейдеры, шрамы), аудио (темы), реакции напарников;
- каждый канал имеет `delivery_policy_id`;
- симптомы нарастают по мере продвижения по древу;
- нет явных индикаторов прогресса;
- конкретные ассеты — вне scope этой спецификации.

### SPEC-TRANS-007. Интеграция с `EpilogueFactPort`

Ветка генерирует набор `EpilogueFact`, которые миксуются с фактами из других систем (фракции, экономика, катаклизмы).

Правила:
- факты публикуются через `EpilogueFactPort`;
- факты декларируются через `epilogue_fact_policy_id`;
- конкретные факты — data-driven.

### SPEC-TRANS-008. Мета-слой эпилога

Трансформация открывает доступ к "мета-слою" эпилога, где игрок становится скрытой угрозой или финальным боссом для мира в следующем забеге.

Правила:
- мета-слой декларируется через `meta_epilogue_policy_id`;
- игрок может стать уникальной угрозой для следующего забега;
- мета-слой публикует факты в `EpilogueFactPort`;
- конкретные условия — data-driven.

### SPEC-TRANS-009. Модульный конструктор `TransformationNode`

Используется модульный конструктор из 5 базовых `TransformationNode` (мутаций), которые могут комбинироваться в уникальные состояния.

Правила:
- каждый узел декларируется через `TransformationNodeDefinition`;
- узлы могут комбинироваться, создавая уникальные гибридные состояния;
- комбинации декларируются через `combination_policy_id`;
- конкретные узлы и комбинации — data-driven.

### SPEC-TRANS-010. Переиспользование механик

Полное переиспользование `MechanicDefinition` из SPEC-FLEET, SPEC-PARTY и SPEC-CATA.

Правила:
- механики трансформации живут в общем реестре;
- namespace событий — `hidden_branch.*`;
- механики используют те же правила валидации;
- `role_tags` обязательно содержит `transformation`;
- контракт `MechanicDefinition` един для всех доменов.

### SPEC-TRANS-011. Событийная модель

Ядро + фракционные расширения (аналогично SPEC-FLEET-042 и SPEC-ECON-082).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

### SPEC-TRANS-012. Модель RNG

Именованные изолированные потоки.

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

### SPEC-TRANS-013. Модель сохранений

Полные JSON-снимки состояния трансформации + журнал ключевых событий для нарратива и генератора эпилога.

Правила:
- состояние трансформации сохраняется через полные снимки (Memento pattern);
- отдельный массив `transformation_events_journal` хранит ключевые события;
- снимки валидируются по JSON Schema.

### SPEC-TRANS-014. Уровень валидации и CI

Schema + graph + gameplay lint (аналогично SPEC-FLEET-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

### SPEC-TRANS-015. Масштаб первой волны

Модульный конструктор: 5 базовых `TransformationNode` + 3 ветки с полным циклом (пробуждение → мастерство/падение).

---

## 3. Data-контракты

### SPEC-TRANS-020. Общие правила JSON-контента

`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `transformation.arcane-path.name`
- `transformation.arcane-path.mastery.description`
- `transformation.node.arcane-saturation.name`
- `transformation.symptom.strange-dreams`

### SPEC-TRANS-021. `TransformationBranchDefinition`

Пример структуры:

```json
{
  "id": "arcane-path",
  "display_name_key": "transformation.arcane-path.name",
  "description_key": "transformation.arcane-path.description",
  "trigger_policy_id": "arcane-path-trigger",
  "tree_policy_id": "arcane-path-tree",
  "mechanic_ids": [
    "transformation-arcane-resonance-resolver",
    "transformation-arcane-corruption-tracker"
  ],
  "node_ids": [
    "mutation-node-arcane-saturation",
    "mutation-node-arcane-mastery"
  ],
  "combination_policy_id": "arcane-combination-policy",
  "epilogue_fact_policy_id": "arcane-epilogue-facts",
  "meta_epilogue_policy_id": "arcane-meta-epilogue",
  "vulnerability_tags": ["arcane-disruption", "ritual-interruption"],
  "counterplay_tags": ["arcane", "ritual"]
}
```

Правила:
- `id` уникален;
- `trigger_policy_id` — обязательное поле;
- `tree_policy_id` — обязательное поле;
- `mechanic_ids` — ссылки на `MechanicDefinition`;
- `node_ids` — ссылки на `TransformationNodeDefinition`;
- все политики — data-driven;
- ветка не хранит рантайм-состояние.

### SPEC-TRANS-022. `TransformationNodeDefinition`

Пример:

```json
{
  "id": "mutation-node-arcane-saturation",
  "display_name_key": "transformation.node.arcane-saturation.name",
  "description_key": "transformation.node.arcane-saturation.description",
  "node_type": "mutation",
  "effect_tags": ["arcane-resonance", "reality-distortion"],
  "mechanic_ids": [
    "transformation-arcane-saturation-resolver"
  ],
  "combination_tags": ["arcane", "metaphysical"],
  "vulnerability_tags": ["arcane-disruption"],
  "counterplay_tags": ["arcane"]
}
```

Правила:
- `node_type` — один из: `mutation`, `state`, `final`;
- `effect_tags` — минимум один;
- `combination_tags` — для определения совместимости с другими узлами;
- узел не хранит рантайм-состояние.

### SPEC-TRANS-023. `TransformationTreeDefinition`

Определяет древо состояний с переходами и финалами:

```json
{
  "id": "arcane-path-tree",
  "display_name_key": "transformation.tree.arcane-path.name",
  "states": [
    {
      "id": "state-awakening",
      "display_name_key": "transformation.state.awakening.name",
      "entry_conditions_policy_id": "arcane-awakening-entry",
      "exit_conditions_policy_id": "arcane-awakening-exit",
      "symptoms_policy_id": "arcane-awakening-symptoms",
      "is_final": false
    },
    {
      "id": "state-mastery",
      "display_name_key": "transformation.state.mastery.name",
      "entry_conditions_policy_id": "arcane-mastery-entry",
      "exit_conditions_policy_id": null,
      "symptoms_policy_id": "arcane-mastery-symptoms",
      "is_final": true,
      "epilogue_fact": "epilogue.transformation.arcane-mastery"
    },
    {
      "id": "state-obsession",
      "display_name_key": "transformation.state.obsession.name",
      "entry_conditions_policy_id": "arcane-obsession-entry",
      "exit_conditions_policy_id": null,
      "symptoms_policy_id": "arcane-obsession-symptoms",
      "is_final": true,
      "epilogue_fact": "epilogue.transformation.arcane-obsession"
    }
  ],
  "transitions": [
    {
      "from_state_id": "state-awakening",
      "to_state_id": "state-mastery",
      "condition_policy_id": "arcane-to-mastery"
    },
    {
      "from_state_id": "state-awakening",
      "to_state_id": "state-obsession",
      "condition_policy_id": "arcane-to-obsession"
    }
  ]
}
```

Правила:
- минимум 2 состояния;
- минимум 1 финальное состояние (`is_final: true`);
- каждый переход имеет `condition_policy_id`;
- финальные состояния публикуют факты в `EpilogueFactPort`;
- древо не хранит рантайм-состояние.

### SPEC-TRANS-024. `TransformationTriggerDefinition`

Определяет условия активации ветки:

```json
{
  "id": "arcane-path-trigger",
  "display_name_key": "transformation.trigger.arcane-path.name",
  "trigger_sources": [
    {
      "event_id": "cataclysm.hidden_branch_opened",
      "condition_policy_id": "arcane-cataclysm-condition"
    },
    {
      "event_id": "companion.legacy_transform_unlocked",
      "condition_policy_id": "arcane-companion-condition"
    },
    {
      "event_id": "world.event_occurred",
      "event_filter_tags": ["arcane-ritual", "leyline-activation"],
      "condition_policy_id": "arcane-world-event-condition"
    }
  ],
  "activation_policy_id": "arcane-activation-policy"
}
```

Правила:
- `trigger_sources` — минимум один источник;
- допустимые источники: `cataclysm.*`, `companion.legacy_transform_unlocked`, `world.event_occurred`;
- каждый источник имеет `condition_policy_id`;
- триггер публикует событие `hidden_branch.trigger_evaluated`.

### SPEC-TRANS-025. Переиспользование `MechanicDefinition`

Механики трансформации используют тот же контракт, что и корабельные, с обязательными `role_tags` (например, `["transformation", "mutation"]`) и строгим разделением на resolver и tracker.

Пример резолвера:

```json
{
  "id": "transformation-arcane-resonance-resolver",
  "kind": "resolver",
  "faction_tags": ["ancient-arcane"],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["transformation", "mutation"],
  "params": {},
  "consumes": [
    "combat.duel_action_executed",
    "world.tick_advanced"
  ],
  "emits": [
    "hidden_branch.arcane_resonance_applied"
  ],
  "state_schema": null,
  "counterplay_tags": ["arcane", "ritual"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "captain",
    "persisted": false
  }
}
```

Пример трекера:

```json
{
  "id": "transformation-arcane-corruption-tracker",
  "kind": "tracker",
  "faction_tags": ["ancient-arcane"],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["transformation", "corruption"],
  "params": {},
  "consumes": [
    "world.tick_advanced",
    "cataclysm.effect_applied"
  ],
  "emits": [
    "hidden_branch.corruption_increased",
    "hidden_branch.state_transition_ready"
  ],
  "state_schema": {
    "$id": "mechanics/transformation-arcane-corruption-tracker/1",
    "type": "object",
    "properties": {
      "corruption_level": { "type": "number" },
      "active_nodes": {
        "type": "array",
        "items": { "type": "string" }
      }
    },
    "required": ["corruption_level"]
  },
  "counterplay_tags": ["arcane-disruption"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "captain",
    "persisted": true
  }
}
```

Правила:
- контракт `MechanicDefinition` един для всех доменов;
- `role_tags` обязательно содержит `transformation`;
- namespace событий — `hidden_branch.*`;
- механики проходят те же проверки валидации.

### SPEC-TRANS-026. `CaptainTransformationInstance` (Runtime)

Снимок состояния в Memento:

```json
{
  "captain_id": "captain-player",
  "active_branches": [
    {
      "branch_id": "arcane-path",
      "current_state_id": "state-awakening",
      "activated_tick": 1200,
      "active_tracker_states": {
        "transformation-arcane-corruption-tracker": {
          "corruption_level": 0.3,
          "active_nodes": ["mutation-node-arcane-saturation"]
        }
      }
    }
  ],
  "completed_branches": [
    {
      "branch_id": "industrial-path",
      "final_state_id": "state-mastery",
      "completed_tick": 1500,
      "epilogue_facts": ["epilogue.transformation.industrial-mastery"]
    }
  ],
  "transformation_events_journal": [
    {
      "event_id": "hidden_branch.trigger_evaluated",
      "tick": 1200,
      "branch_id": "arcane-path",
      "trigger_source": "cataclysm.hidden_branch_opened",
      "epilogue_facts": ["epilogue.transformation.arcane_awakened"]
    },
    {
      "event_id": "hidden_branch.state_transitioned",
      "tick": 1350,
      "branch_id": "arcane-path",
      "from_state_id": "state-awakening",
      "to_state_id": "state-mastery",
      "epilogue_facts": ["epilogue.transformation.arcane-mastery"]
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

### SPEC-TRANS-030. Каноническое ядро

Нормативный минимум:

| Событие | Назначение |
| --- | --- |
| hidden_branch.trigger_evaluated | триггер трансформации оценён |
| hidden_branch.activated | ветка активирована |
| hidden_branch.state_transitioned | переход между состояниями |
| hidden_branch.node_activated | узел трансформации активирован |
| hidden_branch.node_deactivated | узел трансформации деактивирован |
| hidden_branch.combination_formed | сформирована комбинация узлов |
| hidden_branch.final_state_reached | достигнут финальный状态 |
| hidden_branch.meta_epilogue_unlocked | мета-слой эпилога разблокирован |
| hidden_branch.symptom_triggered | симптом трансформации проявлен |

Правила:
- эти события обязательны для ContentRegistry;
- механики трансформации могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий.

### SPEC-TRANS-031. Фракционные расширения

Каждая фракция объявляет события в своём пространстве имён:

`hidden_branch.industrial-steam.*`  
`hidden_branch.ancient-arcane.*`  
`hidden_branch.necromantic-corpse.*`  
`hidden_branch.living-artifact.*`

Примеры:

`hidden_branch.industrial-steam.machine-integration-progressed`  
`hidden_branch.ancient-arcane.arcane-corruption-increased`  
`hidden_branch.necromantic-corpse.necrotic-communion-deepened`  
`hidden_branch.living-artifact.artifact-symbiosis-strengthened`

Правила:
- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику.

### SPEC-TRANS-032. Мосты с другими доменами

Мост hidden_branch ↔ cataclysm:

`cataclysm.hidden_branch_opened` → `hidden_branch.trigger_evaluated`  
`cataclysm.player_transformed` → `hidden_branch.meta_epilogue_unlocked`

Мост hidden_branch ↔ companion:

`companion.legacy_transform_unlocked` → `hidden_branch.trigger_evaluated`

Мост hidden_branch ↔ world:

`world.event_occurred` → `hidden_branch.trigger_evaluated` (с фильтрацией по тегам)

Мост hidden_branch ↔ narrative:

Публикация фактов в `EpilogueFactPort`:

`epilogue.transformation.arcane_awakened`  
`epilogue.transformation.arcane-mastery`  
`epilogue.transformation.arcane-obsession`  
`epilogue.transformation.industrial-integration`  
`epilogue.transformation.necrotic-communion`  
`epilogue.transformation.player-became-threat`

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

---

## 5. Детерминизм и RNG

### SPEC-TRANS-040. Детерминизм

Симуляция трансформаций полностью детерминирована от seed.

Правила:
- обязательна для тестов и реплеев;
- вся случайность — через seeded RNG service;
- сохранение + загрузка дают идентичное продолжение.

### SPEC-TRANS-041. Именованные потоки RNG

Нормативные потоки:

| Поток | Назначение |
| --- | --- |
| rng.hidden_branch.trigger | оценка триггеров трансформации |
| rng.hidden_branch.progression | продвижение по древу состояний |
| rng.hidden_branch.combination | формирование комбинаций узлов |
| rng.hidden_branch.outcome | выбор финального состояния |
| rng.hidden_branch.symptom | проявление симптомов |

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено.

---

## 6. Сохранения и состояние

### SPEC-TRANS-050. Полные JSON-снимки + журнал

Состояние трансформации сохраняется через полные снимки `CaptainTransformationInstance` (Memento pattern).

Отдельный массив `transformation_events_journal` хранит ключевые события для использования генератором эпилога.

Правила:
- каждый капитан имеет снимок;
- снимок валидируется по JSON Schema;
- журнал событий — отдельный массив;
- загрузка не восстанавливает поведение через журнал дельт;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-TRANS-051. Валидация при загрузке

При загрузке:

- состояние трансформации проверяется по JSON Schema;
- состояние трекеров проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу.

---

## 7. Валидация и CI

### SPEC-TRANS-060. Уровень валидации

Обязательный уровень: Schema + graph + gameplay lint.

### SPEC-TRANS-061. Schema validation

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
- корректность ссылок на узлы и состояния.

### SPEC-TRANS-062. Graph integrity

Проверяется целостность графа контента:

```
CaptainTransformationInstance
  → TransformationBranchDefinition[]
    → TransformationTreeDefinition
      → StateDefinition[]
    → TransformationNodeDefinition[]
    → MechanicDefinition[]
      → EventDefinition[]
```

Обязательные проверки:

- каждая ветка имеет минимум 1 триггер;
- каждое древо имеет минимум 2 состояния;
- каждое древо имеет минимум 1 финальное состояние;
- каждый узел имеет минимум 1 effect_tag;
- все referenced mechanics существуют;
- все referenced events существуют;
- все referenced nodes существуют;
- все transitions ссылаются на существующие состояния.

### SPEC-TRANS-063. Gameplay lint

Дополнительные игровые проверки:

- каждая ветка имеет минимум 1 контрплейный тег;
- отсутствие циклических ссылок в древе состояний;
- все `mechanic_ids` существуют в реестре и имеют корректные `role_tags` с `transformation`;
- каждое финальное состояние публикует факт в `EpilogueFactPort`;
- каждый триггер ссылается на валидный источник события;
- ContentRegistry не должен содержать дублирующихся ID.

---

## 8. Нормативные скелеты первой волны

### SPEC-TRANS-070. Базовые `TransformationNode` (5)

Минимум 5 базовых узлов:

`mutation-node-arcane-saturation`  
- тип: mutation  
- эффект: резонанс с арканой, искажение реальности  
- комбинации: arcane, metaphysical  
- уязвимости: arcane-disruption  
- контрплей: arcane, ritual

`mutation-node-industrial-integration`  
- тип: mutation  
- эффект: механизация тела, интеграция с паровыми системами  
- комбинации: industrial, machine  
- уязвимости: pressure, fire  
- контрплей: cold, machine

`mutation-node-necrotic-communion`  
- тип: mutation  
- эффект: связь с мёртвыми, некромантское восприятие  
- комбинации: death, spirit  
- уязвимости: death, plague  
- контрплей: fire, cold

`mutation-node-artifact-symbiosis`  
- тип: mutation  
- эффект: симбиоз с живым артефактом, адаптация  
- комбинации: machine, arcane  
- уязвимости: machine, arcane  
- контрплей: pressure, ritual

`mutation-node-cataclysmic-ascension`  
- тип: mutation  
- эффект: возвышение через катаклизм, метафизическая трансформация  
- комбинации: metaphysical, cataclysm  
- уязвимости: reality-tear  
- контрплей: arcane, ritual

### SPEC-TRANS-071. Ветки первой волны (3)

Минимум 3 ветки с полным циклом:

`arcane-path`  
- триггеры: катаклизм аркан-типа, смерть напарника-мага, мировое событие активации лей-линии  
- древо: awakening → mastery / obsession  
- узлы: mutation-node-arcane-saturation, mutation-node-arcane-mastery  
- финалы: контроль над магией (мастерство), полная одержимость (падение)  
- мета-слой: игрок становится арканической угрозой

`industrial-path`  
- триггеры: катаклизм индустриального типа, смерть напарника-инженера, мировое событие промышленной катастрофы  
- древо: awakening → integration / rejection  
- узлы: mutation-node-industrial-integration, mutation-node-machine-symbiosis  
- финалы: полное слияние с машиной (интеграция), отторжение механизмов (отказ)  
- мета-слой: игрок становится индустриальной угрозой

`necromantic-path`  
- триггеры: катаклизм некромантского типа, смерть напарника-некроманта, мировое событие чумной эпидемии  
- древо: awakening → communion / corruption  
- узлы: mutation-node-necrotic-communion, mutation-node-death-mastery  
- финалы: мастерство над смертью (коммуния), полное разложение (коррупция)  
- мета-слой: игрок становится некромантической угрозой

---

## 9. Вертикальный срез первой сборки

### SPEC-TRANS-080. Нормативный вертикальный срез

Первая сборка включает:

- 5 базовых `TransformationNode`;
- 3 ветки с полным циклом (arcane-path, industrial-path, necromantic-path);
- работающий триггер через `Cataclysm` и `WorldEvent`;
- древо состояний с минимум 2 финалами на ветку;
- модификацию игровых систем через `MechanicDefinition`;
- нарративную доставку через 4 канала (текст, визуал, аудио, реакции напарников);
- публикацию фактов в `EpilogueFactPort`;
- мета-слой эпилога (игрок как угроза);
- рабочие мосты с катаклизмами, напарниками, нарративом;
- рабочий мост с `EpilogueFactPort`.

Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.

---

## 10. Критерии приёмки спецификации

Спецификация считается принятой, если:

✅ зафиксированы границы доменного контекста `HiddenBranches`;  
✅ зафиксировано, что трансформация применяется только к `Captain`;  
✅ зафиксирована событийно-ориентированная модель триггеров через `Cataclysm` и `WorldEvent`;  
✅ зафиксирована архитектура древа состояний с несколькими финалами;  
✅ зафиксирована модель модификации систем через `MechanicDefinition` и теги;  
✅ зафиксирована нарративная доставка через 4 канала без точных цифр;  
✅ зафиксирована интеграция с `EpilogueFactPort`;  
✅ зафиксирован мета-слой эпилога (игрок как угроза);  
✅ зафиксирован модульный конструктор из 5 базовых `TransformationNode`;  
✅ зафиксировано полное переиспользование `MechanicDefinition`;  
✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;  
✅ зафиксированы мосты с катаклизмами, напарниками, нарративом;  
✅ зафиксирован `EpilogueFactPort`;  
✅ зафиксированы именованные потоки RNG;  
✅ зафиксированы полные снимки + журнал событий;  
✅ зафиксирован уровень CI: schema + graph + gameplay lint;  
✅ зафиксированы 5 базовых узлов трансформации;  
✅ зафиксированы 3 ветки первой волны;  
✅ зафиксирован вертикальный срез первой сборки.

---

## 11. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:

- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали генератора эпилога и миграции сохранений;
- детали системы капитана (базовые статы, навыки, экипировка);
- детали боя, дуэли, экономики, катаклизмов, напарников (только контрактные мосты);
- конкретные нарративные тексты;
- производительность на мобильных устройствах на уровне конкретных механик.

---

## 12. Приложение. Журнал решений по сбору данных

| Вопрос | Решение |
| --- | --- |
| 1 | B — Только сущность `Captain` трансформируется |
| 2 | D — Событийно-ориентированная модель: триггеры только через `Cataclysm` или `WorldEvent` |
| 3 | B — Древо состояний с несколькими финалами внутри одной ветки |
| 4 | B — Модификация текущих систем через `MechanicDefinition` и теги |
| 5 | B — Нарастающие "симптомы" через 4 нарративных канала, без точных цифр |
| 6 | B+C — Генерация `EpilogueFact` + мета-слой эпилога (игрок как угроза) |
| 7 | D — Модульный конструктор: 5 базовых `TransformationNode` |
```