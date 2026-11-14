```markdown
# SPECIFICATION v1.0 — «Генератор эпилога»

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
`SPECIFICATION v1.0 — «Скрытые ветки трансформации»`  
`SPECIFICATION v1.0 — «Сюжет и лор»`

**Покрываемые требования:**  
`INT-31` — эпилог как итог забега  
`INT-32` — мета-слой: игрок как угроза следующего забега  
`INT-33.12` — обязательная глубокая проработка генератора эпилога  
`GD-07` — контент как данные, `ContentRegistry`, валидация схем  
`GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **генератор эпилога** как data-driven доменную подсистему, охватывающую архитектуру пайплайна обработки фактов, модель атомарных фактов, алгоритм тематического плетения нарратива, адаптивный стиль повествования, визуальную подачу через анимированные сцены, финальный выбор игрока, полностью процедурную модель мета-слоя угрозы и интеграцию со всеми источниками нарратива.

Спецификация фиксирует:
- границы доменного контекста `Epilogue`;
- архитектуру чистого пайплайна: `FactCollector → FactFilter → FactSorter → TextComposer → Renderer`;
- модель `EpilogueFact` как иерархического тематического атома с подфактами и нарративной классификацией;
- гибридную ось категоризации: источник → нарративная роль → значимость;
- алгоритм тематического плетения фактов в единые нарративные арки;
- адаптивный стиль повествования, зависящий от типа финала и доминирующих фактов;
- визуальную подачу через текст + анимированные сцены Babylon.js;
- финальный выбор игрока в конце эпилога, влияющий на мета-слой следующего забега;
- полностью процедурную модель мета-слоя угрозы без фиксированных архетипов;
- полную вариативность через RNG, включая интерпретацию фактов;
- равноправный гибрид всех источников нарратива через `EpilogueFactPort`;
- plugin-based архитектуру на базе полного переиспользования `MechanicDefinition`;
- событийную модель и мосты с другими доменами;
- модель RNG, сохранений и требования к CI.

Спецификация не фиксирует:
- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали миграции сохранений;
- детали системы капитана, боя, дуэли, экономики, катаклизмов, напарников, скрытых веток, сюжета и лора (только контрактные мосты);
- конкретные нарративные тексты и диалоги;
- производительность на мобильных устройствах на уровне конкретных механик.

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-EPI-001. Границы доменного контекста `Epilogue`

`Epilogue` владеет только логикой генерации финального нарратива из фактов. Факты, нарратив, катаклизмы, напарники, трансформации находятся в других контекстах.

Правила:
- `Epilogue` не владеет состоянием капитана;
- `Epilogue` не владеет состоянием мира;
- `Epilogue` не владеет состоянием фракций;
- `Epilogue` общается с другими контекстами только через события и порты;
- `Epilogue` потребляет факты из `EpilogueFactPort`.

### SPEC-EPI-002. Архитектура чистого пайплайна

Используется архитектура чистого пайплайна:
**`FactCollector → FactFilter → FactSorter → TextComposer → Renderer`**

Правила:
- каждый этап — отдельный `MechanicDefinition`-плагин;
- `FactCollector` собирает факты из всех источников через `EpilogueFactPort`;
- `FactFilter` фильтрует факты по значимости и релевантности;
- `FactSorter` сортирует факты по тематическим нитям;
- `TextComposer` плетёт нарратив из отсортированных фактов;
- `Renderer` визуализирует нарратив через текст + анимированные сцены;
- все этапы декларативны и data-driven.

### SPEC-EPI-003. Модель `EpilogueFact` как иерархического тематического атома

`EpilogueFact` — это иерархический тематический атом с подфактами и нарративной классификацией.

Правила:
- факт имеет `fact_id`, `source_system`, `timestamp`, `payload`, `tags`, `significance`;
- факт имеет `theme` (нарративная тема: `war`, `betrayal`, `ascension`, `fall`, `mystery`, `sacrifice`, `triumph`, `tragedy`);
- факт имеет `emotional_tone` (эмоциональная окраска);
- факт имеет `narrative_weight` (нарративный вес);
- факт может содержать `sub_facts[]` (подфакты);
- факт декларируется через `epilogue_fact_policy_id`;
- конкретные факты — data-driven.

### SPEC-EPI-004. Гибридная ось категоризации фактов

Используется гибридная модель категоризации:
**Первичная группировка по источнику → вторичная по нарративной роли → третичная по значимости**

Правила:
- первичная группировка: `cataclysm.*`, `party.*`, `narrative.*`, `hidden_branch.*`, `economy.*`, `fleet.*`;
- вторичная группировка: `triumph`, `tragedy`, `betrayal`, `sacrifice`, `ascension`, `fall`, `mystery`;
- третичная группировка: `world_shaping`, `personal`, `factional`, `minor`;
- все группировки декларативны и data-driven.

### SPEC-EPI-005. Алгоритм тематического плетения фактов

Используется алгоритм тематического плетения:
**Генератор ищет "нити" (связанные факты из разных систем) и плетёт их в единые нарративные арки**

Правила:
- генератор анализирует `theme`, `tags`, `related_facts` для поиска связей;
- связанные факты объединяются в нарративные нити;
- нити плетутся в единый связный нарратив;
- порядок нитей определяется их `narrative_weight`;
- алгоритм декларируется через `weaving_policy_id`;
- конкретные правила — data-driven.

### SPEC-EPI-006. Адаптивный стиль повествования

Стиль повествования адаптивный:
**Стиль зависит от типа финала и доминирующих фактов**

Правила:
- для метафизического возвышения — мистический стиль;
- для индустриальной интеграции — технический стиль;
- для некромантской коммунии — мрачный стиль;
- для арканического мастерства — эпический стиль;
- для трагических финалов — элегический стиль;
- стиль декларируется через `narrative_style_policy_id`;
- конкретные тексты — data-driven.

### SPEC-EPI-007. Визуальная подача через текст + анимированные сцены

Используется модель:
**Текст + анимированные сцены: ключевые моменты — короткие анимированные сцены (Babylon.js) с нарративным текстом поверх**

Правила:
- основной нарратив — текст с прокруткой;
- ключевые моменты сопровождаются анимированными сценами;
- сцены генерируются через Babylon.js на основе фактов;
- сцены имеют `scene_policy_id`;
- конкретные ассеты — вне scope этой спецификации.

### SPEC-EPI-008. Финальный выбор игрока

В конце эпилога — один крупный выбор:
**Выбор влияет на мета-слой следующего забега**

Правила:
- выбор декларируется через `final_choice_policy_id`;
- выбор влияет на параметры мета-слоя угрозы;
- выбор публикует факты в `EpilogueFactPort`;
- конкретные варианты выбора — data-driven.

### SPEC-EPI-009. Полностью процедурная модель мета-слоя угрозы

Мета-слой угрозы полностью процедурный:
**Угроза не имеет архетипа, генерируется целиком из фактов, может быть непредсказуемой**

Правила:
- угроза генерируется на основе всех фактов забега;
- угроза имеет уникальное имя, доктрину, модификаторы;
- угроза влияет на следующий забег через `meta_threat_policy_id`;
- конкретные параметры — data-driven.

### SPEC-EPI-010. Полная вариативность через RNG

RNG влияет на всё:
**RNG влияет на порядок, шаблоны, тон, выбор сцен, интерпретацию фактов**

Правила:
- RNG влияет на порядок фактов внутри нитей;
- RNG влияет на выбор шаблонов повествования;
- RNG влияет на тон отдельных абзацев;
- RNG влияет на выбор анимированных сцен;
- RNG влияет на интерпретацию фактов (один факт может быть подан как триумф или трагедия);
- вся случайность — через seeded RNG service.

### SPEC-EPI-011. Переиспользование механик

Полное переиспользование `MechanicDefinition` из SPEC-FLEET, SPEC-PARTY, SPEC-CATA, SPEC-TRANS и SPEC-LORE.

Правила:
- механики эпилога живут в общем реестре;
- namespace событий — `epilogue.*`;
- механики используют те же правила валидации;
- `role_tags` обязательно содержит `epilogue`;
- контракт `MechanicDefinition` един для всех доменов.

### SPEC-EPI-012. Событийная модель

Ядро + фракционные расширения (аналогично SPEC-FLEET-042 и SPEC-ECON-082).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

### SPEC-EPI-013. Модель RNG

Именованные изолированные потоки.

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

### SPEC-EPI-014. Модель сохранений

Полные JSON-снимки состояния эпилога + журнал ключевых событий для нарратива.

Правила:
- состояние эпилога сохраняется через полные снимки (Memento pattern);
- отдельный массив `epilogue_events_journal` хранит ключевые события;
- снимки валидируются по JSON Schema.

### SPEC-EPI-015. Уровень валидации и CI

Schema + graph + gameplay lint (аналогично SPEC-FLEET-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

### SPEC-EPI-016. Масштаб первой волны

Расширенный масштаб:
- 12+ типов фактов;
- 10+ шаблонов эпилога;
- 4 мета-слоя с вариациями;
- 5 стилей повествования;
- 20+ анимированных сцен.

---

## 3. Data-контракты

### SPEC-EPI-020. Общие правила JSON-контента

`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `epilogue.fact.cataclysm-survived.name`
- `epilogue.theme.triumph.description`
- `epilogue.style.mystical.name`
- `epilogue.scene.arcane-ascension.name`
- `epilogue.choice.accept-legacy.name`

### SPEC-EPI-021. `EpilogueFactDefinition`

Пример структуры:
```json
{
  "id": "epilogue-fact-cataclysm-survived",
  "display_name_key": "epilogue.fact.cataclysm-survived.name",
  "description_key": "epilogue.fact.cataclysm-survived.description",
  "source_system": "cataclysm",
  "theme": "triumph",
  "emotional_tone": "relief",
  "narrative_weight": 0.8,
  "significance": "world_shaping",
  "payload": {
    "cataclysm_id": "arcane-leyline-rupture",
    "resolution": "external_intervention",
    "affected_nodes": ["ancient-arcane-trade-node-grove"]
  },
  "sub_facts": [
    {
      "id": "epilogue-fact-cataclysm-scar-applied",
      "theme": "mystery",
      "emotional_tone": "unease",
      "narrative_weight": 0.4
    }
  ],
  "tags": ["cataclysm", "arcane", "survival"],
  "related_facts": ["epilogue-fact-companion-sacrifice", "epilogue-fact-faction-alliance"]
}
```

Правила:
- `id` уникален;
- `source_system` — один из нормативных источников;
- `theme` — один из нормативных тем;
- `significance` — один из нормативных уровней;
- `sub_facts` — опциональный массив;
- факт не хранит рантайм-состояние.

### SPEC-EPI-022. `EpilogueTemplateDefinition`

Пример:
```json
{
  "id": "epilogue-template-arcane-mastery",
  "display_name_key": "epilogue.template.arcane-mastery.name",
  "description_key": "epilogue.template.arcane-mastery.description",
  "dominant_themes": ["triumph", "ascension", "mystery"],
  "narrative_style_policy_id": "mystical-style",
  "weaving_policy_id": "arcane-weaving-policy",
  "scene_policy_ids": [
    "scene-arcane-ascension",
    "scene-leyline-convergence"
  ],
  "final_choice_policy_id": "arcane-mastery-final-choice",
  "meta_threat_policy_id": "arcane-meta-threat"
}
```

Правила:
- `id` уникален;
- `dominant_themes` — минимум один;
- `narrative_style_policy_id` — обязательное поле;
- `weaving_policy_id` — обязательное поле;
- шаблон не хранит рантайм-состояние.

### SPEC-EPI-023. `NarrativeStyleDefinition`

Пример:
```json
{
  "id": "narrative-style-mystical",
  "display_name_key": "narrative.style.mystical.name",
  "description_key": "narrative.style.mystical.description",
  "tone_tags": ["mystical", "ethereal", "prophetic"],
  "text_template_policy_id": "mystical-text-template",
  "audio_theme_policy_id": "mystical-audio-theme"
}
```

Правила:
- `id` уникален;
- `tone_tags` — минимум один;
- стиль не хранит рантайм-состояние.

### SPEC-EPI-024. `EpilogueSceneDefinition`

Пример:
```json
{
  "id": "epilogue-scene-arcane-ascension",
  "display_name_key": "epilogue.scene.arcane-ascension.name",
  "description_key": "epilogue.scene.arcane-ascension.description",
  "scene_type": "animated",
  "duration_policy_id": "arcane-ascension-duration",
  "visual_elements_policy_id": "arcane-ascension-visuals",
  "text_overlay_policy_id": "arcane-ascension-text",
  "audio_policy_id": "arcane-ascension-audio"
}
```

Правила:
- `id` уникален;
- `scene_type` — один из: `animated`, `static`, `procedural`;
- сцена не хранит рантайм-состояние.

### SPEC-EPI-025. `FinalChoiceDefinition`

Пример:
```json
{
  "id": "final-choice-accept-legacy",
  "display_name_key": "final.choice.accept-legacy.name",
  "description_key": "final.choice.accept-legacy.description",
  "choice_type": "meta_influence",
  "outcomes": [
    {
      "outcome_id": "accept-legacy-outcome",
      "meta_threat_modifiers": {
        "intensity_multiplier": 1.2,
        "additional_tags": ["legacy-accepted"]
      },
      "epilogue_facts": ["epilogue.choice.legacy-accepted"]
    }
  ]
}
```

Правила:
- `id` уникален;
- `choice_type` — один из: `meta_influence`, `narrative_only`;
- `outcomes` — минимум один;
- выбор не хранит рантайм-состояние.

### SPEC-EPI-026. `MetaThreatDefinition`

Пример:
```json
{
  "id": "meta-threat-procedural-arcane",
  "display_name_key": "meta.threat.procedural-arcane.name",
  "description_key": "meta.threat.procedural-arcane.description",
  "generation_policy_id": "arcane-threat-generation",
  "doctrine_tags": ["arcane", "metaphysical"],
  "modifiers_policy_id": "arcane-threat-modifiers",
  "narrative_hooks_policy_id": "arcane-threat-hooks"
}
```

Правила:
- `id` уникален;
- `generation_policy_id` — обязательное поле;
- угроза не хранит рантайм-состояние.

### SPEC-EPI-027. Переиспользование `MechanicDefinition`

Механики эпилога используют тот же контракт, что и корабельные, с обязательными `role_tags` (например, `["epilogue", "weaving"]`) и строгим разделением на resolver и tracker.

Пример резолвера:
```json
{
  "id": "epilogue-fact-weaving-resolver",
  "kind": "resolver",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["epilogue", "weaving"],
  "params": {},
  "consumes": [
    "epilogue.facts_collected",
    "epilogue.facts_filtered"
  ],
  "emits": [
    "epilogue.narrative_threads_formed"
  ],
  "state_schema": null,
  "counterplay_tags": [],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "epilogue",
    "persisted": false
  }
}
```

Пример трекера:
```json
{
  "id": "epilogue-fact-collection-tracker",
  "kind": "tracker",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["epilogue", "collection"],
  "params": {},
  "consumes": [
    "epilogue.generation_started",
    "world.tick_advanced"
  ],
  "emits": [
    "epilogue.facts_collected"
  ],
  "state_schema": {
    "$id": "mechanics/epilogue-fact-collection-tracker/1",
    "type": "object",
    "properties": {
      "collected_facts": {
        "type": "array",
        "items": { "type": "string" }
      },
      "collection_progress": { "type": "number" }
    },
    "required": ["collected_facts", "collection_progress"]
  },
  "counterplay_tags": [],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "epilogue",
    "persisted": true
  }
}
```

Правила:
- контракт `MechanicDefinition` един для всех доменов;
- `role_tags` обязательно содержит `epilogue`;
- namespace событий — `epilogue.*`;
- механики проходят те же проверки валидации.

### SPEC-EPI-028. `EpilogueInstance` (Runtime)

Снимок состояния в Memento:
```json
{
  "epilogue_id": "epilogue-run-1",
  "captain_id": "captain-player",
  "generation_started_tick": 2000,
  "generation_completed_tick": 2050,
  "collected_facts": [
    "epilogue-fact-cataclysm-survived",
    "epilogue-fact-companion-sacrifice",
    "epilogue-fact-faction-alliance"
  ],
  "formed_narrative_threads": [
    {
      "thread_id": "thread-arcane-ascension",
      "fact_ids": ["epilogue-fact-cataclysm-survived", "epilogue-fact-companion-sacrifice"],
      "dominant_theme": "triumph",
      "narrative_weight": 0.9
    }
  ],
  "selected_template_id": "epilogue-template-arcane-mastery",
  "narrative_style_id": "narrative-style-mystical",
  "generated_scenes": [
    "epilogue-scene-arcane-ascension",
    "epilogue-scene-leyline-convergence"
  ],
  "final_choice_id": "final-choice-accept-legacy",
  "meta_threat_id": "meta-threat-procedural-arcane",
  "epilogue_events_journal": [
    {
      "event_id": "epilogue.generation_started",
      "tick": 2000
    },
    {
      "event_id": "epilogue.facts_collected",
      "tick": 2010,
      "facts_count": 15
    },
    {
      "event_id": "epilogue.narrative_threads_formed",
      "tick": 2020,
      "threads_count": 3
    },
    {
      "event_id": "epilogue.final_choice_made",
      "tick": 2040,
      "choice_id": "final-choice-accept-legacy"
    }
  ]
}
```

Правила:
- каждый эпилог имеет снимок;
- снимок валидируется по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

---

## 4. Событийная модель

### SPEC-EPI-030. Каноническое ядро

Нормативный минимум:

| Событие | Назначение |
| --- | --- |
| epilogue.generation_started | генерация эпилога начата |
| epilogue.facts_collected | факты собраны |
| epilogue.facts_filtered | факты отфильтрованы |
| epilogue.facts_sorted | факты отсортированы |
| epilogue.narrative_threads_formed | нарративные нити сформированы |
| epilogue.text_composed | нарративный текст скомпонован |
| epilogue.scenes_generated | анимированные сцены сгенерированы |
| epilogue.final_choice_presented | финальный выбор представлен |
| epilogue.final_choice_made | финальный выбор сделан |
| epilogue.meta_threat_generated | мета-угроза сгенерирована |
| epilogue.generation_completed | генерация эпилога завершена |

Правила:
- эти события обязательны для ContentRegistry;
- механики эпилога могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий.

### SPEC-EPI-031. Фракционные расширения

Каждая фракция объявляет события в своём пространстве имён:
- `epilogue.industrial-steam.*`
- `epilogue.ancient-arcane.*`
- `epilogue.necromantic-corpse.*`
- `epilogue.living-artifact.*`

Примеры:
- `epilogue.industrial-steam.integration-completed`
- `epilogue.ancient-arcane.mastery-achieved`
- `epilogue.necromantic-corpse.communion-deepened`
- `epilogue.living-artifact.symbiosis-strengthened`

Правила:
- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику.

### SPEC-EPI-032. Мосты с другими доменами

Мост epilogue ↔ cataclysm:
- `cataclysm.ended` → `epilogue.fact_published`
- `cataclysm.player_transformed` → `epilogue.fact_published`

Мост epilogue ↔ party:
- `party.companion_died` → `epilogue.fact_published`
- `party.companion_betrayed` → `epilogue.fact_published`

Мост epilogue ↔ narrative:
- `narrative.ending_reached` → `epilogue.generation_started`
- `narrative.faction_arc_completed` → `epilogue.fact_published`

Мост epilogue ↔ hidden_branch:
- `hidden_branch.final_state_reached` → `epilogue.fact_published`
- `hidden_branch.meta_epilogue_unlocked` → `epilogue.meta_threat_generation_enabled`

Мост epilogue ↔ economy:
- `economy.scar_applied` → `epilogue.fact_published`

Мост epilogue ↔ world:
- `world.ruler_changed` → `epilogue.fact_published`
- `world.city_fallen` → `epilogue.fact_published`

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

---

## 5. Детерминизм и RNG

### SPEC-EPI-040. Детерминизм

Симуляция эпилога полностью детерминирована от seed.

Правила:
- обязательна для тестов и реплеев;
- вся случайность — через seeded RNG service;
- сохранение + загрузка дают идентичное продолжение.

### SPEC-EPI-041. Именованные потоки RNG

Нормативные потоки:

| Поток | Назначение |
| --- | --- |
| rng.epilogue.fact_collection | сбор фактов |
| rng.epilogue.fact_filtering | фильтрация фактов |
| rng.epilogue.thread_weaving | плетение нарративных нитей |
| rng.epilogue.style_selection | выбор стиля повествования |
| rng.epilogue.scene_selection | выбор анимированных сцен |
| rng.epilogue.fact_interpretation | интерпретация фактов |
| rng.epilogue.meta_threat_generation | генерация мета-угрозы |

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено.

---

## 6. Сохранения и состояние

### SPEC-EPI-050. Полные JSON-снимки + журнал

Состояние эпилога сохраняется через полные снимки `EpilogueInstance` (Memento pattern).

Отдельный массив `epilogue_events_journal` хранит ключевые события для нарратива.

Правила:
- каждый эпилог имеет снимок;
- снимок валидируется по JSON Schema;
- журнал событий — отдельный массив;
- загрузка не восстанавливает поведение через журнал дельт;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-EPI-051. Валидация при загрузке

При загрузке:
- состояние эпилога проверяется по JSON Schema;
- состояние трекеров проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу.

---

## 7. Валидация и CI

### SPEC-EPI-060. Уровень валидации

Обязательный уровень: Schema + graph + gameplay lint.

### SPEC-EPI-061. Schema validation

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
- корректность ссылок на шаблоны, стили, сцены.

### SPEC-EPI-062. Graph integrity

Проверяется целостность графа контента:
```
EpilogueInstance
  → EpilogueFactDefinition[]
  → EpilogueTemplateDefinition[]
    → NarrativeStyleDefinition
    → EpilogueSceneDefinition[]
    → FinalChoiceDefinition
    → MetaThreatDefinition
  → MechanicDefinition[]
    → EventDefinition[]
```

Обязательные проверки:
- каждый шаблон имеет минимум 1 доминирующую тему;
- каждый шаблон имеет стиль повествования;
- каждый шаблон имеет минимум 1 сцену;
- каждый шаблон имеет финальный выбор;
- каждый шаблон имеет мета-угрозу;
- все referenced mechanics существуют;
- все referenced events существуют;
- все referenced styles существуют;
- все referenced scenes существуют.

### SPEC-EPI-063. Gameplay lint

Дополнительные игровые проверки:
- каждый шаблон имеет минимум 3 нарративные нити;
- каждый стиль имеет минимум 1 tone_tag;
- каждая сцена имеет duration_policy_id;
- каждый финальный выбор имеет минимум 1 исход;
- каждая мета-угроза имеет generation_policy_id;
- отсутствие циклических ссылок;
- все `mechanic_ids` существуют в реестре и имеют корректные `role_tags` с `epilogue`;
- ContentRegistry не должен содержать дублирующихся ID.

---

## 8. Нормативные скелеты первой волны

### SPEC-EPI-070. Типы фактов первой волны (12+)

Минимум 12 типов фактов:
- `epilogue-fact-cataclysm-survived` (катаклизм пережит)
- `epilogue-fact-cataclysm-caused` (катаклизм вызван)
- `epilogue-fact-companion-recruited` (напарник нанят)
- `epilogue-fact-companion-lost` (напарник потерян)
- `epilogue-fact-companion-betrayed` (напарник предал)
- `epilogue-fact-companion-sacrificed` (напарник пожертвовал собой)
- `epilogue-fact-faction-alliance` (союз с фракцией)
- `epilogue-fact-faction-enmity` (вражда с фракцией)
- `epilogue-fact-economy-scar` (экономический шрам)
- `epilogue-fact-transformation-awakened` (трансформация пробуждена)
- `epilogue-fact-transformation-mastery` (мастерство трансформации)
- `epilogue-fact-transformation-fall` (падение через трансформацию)

### SPEC-EPI-071. Шаблоны эпилога первой волны (10+)

Минимум 10 шаблонов:
- `epilogue-template-arcane-mastery` (арканическое мастерство)
- `epilogue-template-arcane-obsession` (арканическая одержимость)
- `epilogue-template-industrial-integration` (индустриальная интеграция)
- `epilogue-template-industrial-rejection` (индустриальное отторжение)
- `epilogue-template-necromantic-communion` (некромантская коммуния)
- `epilogue-template-necromantic-corruption` (некромантская коррупция)
- `epilogue-template-metaphysical-ascension` (метафизическое возвышение)
- `epilogue-template-faction-victory` (победа фракции)
- `epilogue-template-tragic-fall` (трагическое падение)
- `epilogue-template-mystery-unresolved` (неразрешённая тайна)

### SPEC-EPI-072. Стили повествования первой волны (5)

Минимум 5 стилей:
- `narrative-style-mystical` (мистический)
- `narrative-style-technical` (технический)
- `narrative-style-dark` (мрачный)
- `narrative-style-epic` (эпический)
- `narrative-style-elegiac` (элегический)

### SPEC-EPI-073. Анимированные сцены первой волны (20+)

Минимум 20 сцен:
- `epilogue-scene-arcane-ascension`
- `epilogue-scene-leyline-convergence`
- `epilogue-scene-industrial-forge`
- `epilogue-scene-machine-integration`
- `epilogue-scene-necromantic-ritual`
- `epilogue-scene-death-communion`
- `epilogue-scene-metaphysical-tear`
- `epilogue-scene-reality-ascension`
- `epilogue-scene-faction-victory`
- `epilogue-scene-companion-sacrifice`
- `epilogue-scene-betrayal-reveal`
- `epilogue-scene-city-fallen`
- `epilogue-scene-cataclysm-peak`
- `epilogue-scene-cataclysm-resolution`
- `epilogue-scene-economy-collapse`
- `epilogue-scene-economy-recovery`
- `epilogue-scene-transformation-awakening`
- `epilogue-scene-transformation-mastery`
- `epilogue-scene-transformation-fall`
- `epilogue-scene-final-choice`

### SPEC-EPI-074. Мета-угрозы первой волны (4 с вариациями)

Минимум 4 мета-угрозы с вариациями:
- `meta-threat-arcane` (арканическая угроза)
- `meta-threat-industrial` (индустриальная угроза)
- `meta-threat-necromantic` (некромантская угроза)
- `meta-threat-metaphysical` (метафизическая угроза)

Каждая угроза имеет вариации в зависимости от финального выбора.

---

## 9. Вертикальный срез первой сборки

### SPEC-EPI-080. Нормативный вертикальный срез

Первая сборка включает:
- 4 шаблона эпилога (по одному на каждую трансформацию);
- 16 типов фактов (по 4 на каждую систему);
- 4 мета-слоя с вариациями (по одному на каждую трансформацию);
- 5 стилей повествования;
- 20+ анимированных сцен;
- работающий пайплайн: `FactCollector → FactFilter → FactSorter → TextComposer → Renderer`;
- работающий алгоритм тематического плетения;
- адаптивный стиль повествования;
- визуальную подачу через текст + анимированные сцены;
- финальный выбор игрока;
- полностью процедурную генерацию мета-угрозы;
- публикацию фактов из всех систем через `EpilogueFactPort`;
- рабочие мосты с катаклизмами, напарниками, экономикой, трансформациями, нарративом;
- рабочий мост с `EpilogueFactPort`.

Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.

---

## 10. Критерии приёмки спецификации

Спецификация считается принятой, если:
✅ зафиксированы границы доменного контекста `Epilogue`;  
✅ зафиксирована архитектура чистого пайплайна (`FactCollector → FactFilter → FactSorter → TextComposer → Renderer`);  
✅ зафиксирована модель `EpilogueFact` как иерархического тематического атома;  
✅ зафиксирована гибридная ось категоризации (источник → нарративная роль → значимость);  
✅ зафиксирован алгоритм тематического плетения фактов;  
✅ зафиксирован адаптивный стиль повествования;  
✅ зафиксирована визуальная подача через текст + анимированные сцены;  
✅ зафиксирован финальный выбор игрока;  
✅ зафиксирована полностью процедурная модель мета-слоя угрозы;  
✅ зафиксирована полная вариативность через RNG;  
✅ зафиксировано полное переиспользование `MechanicDefinition`;  
✅ зафиксированы новые ядерные события и потоки RNG;  
✅ зафиксированы правила gameplay lint для эпилога;  
✅ зафиксирован вертикальный срез первой сборки;  
✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;  
✅ зафиксированы мосты с катаклизмами, напарниками, экономикой, трансформациями, нарративом;  
✅ зафиксирован `EpilogueFactPort`;  
✅ зафиксированы именованные потоки RNG;  
✅ зафиксированы полные снимки + журнал событий;  
✅ зафиксирован уровень CI: schema + graph + gameplay lint;  
✅ зафиксированы 4 шаблона, 16 типов фактов, 4 мета-слоя, 5 стилей, 20+ сцен.

---

## 11. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:
- числовой баланс (пороги, множители, шансы);
- финальные тексты, лорные названия, арт, VFX, аудио;
- мобильный UX и конкретные экраны;
- детали миграции сохранений;
- детали системы капитана, боя, дуэли, экономики, катаклизмов, напарников, скрытых веток, сюжета и лора (только контрактные мосты);
- конкретные нарративные тексты и диалоги;
- производительность на мобильных устройствах на уровне конкретных механик.

---

## 12. Приложение. Журнал решений по сбору данных

| Вопрос | Решение (Ваш ответ) | Краткая расшифровка |
| --- | --- | --- |
| 1 | A | Чистый пайплайн: `FactCollector → FactFilter → FactSorter → TextComposer → Renderer` |
| 2 | D | Полностью свободная форма: нет глав, единый связный нарративный текст |
| 3 | C+D | Гибрид: иерархический атом с подфактами + тематический атом с нарративной классификацией |
| 4 | D | Гибрид: первичная группировка по источнику, вторичная — по нарративной роли, третичная — по значимости |
| 5 | B | Тематическое плетение: генератор ищет "нити" и плетёт их в единые нарративные арки |
| 6 | D | Адаптивный: стиль зависит от типа финала и доминирующих фактов |
| 7 | D | Текст + анимированные сцены: ключевые моменты — короткие анимированные сцены (Babylon.js) |
| 8 | C | Финальный выбор: в конце эпилога — один крупный выбор, влияющий на мета-слой |
| 9 | D | Полностью процедурная: угроза не имеет архетипа, генерируется целиком из фактов |
| 10 | D | Полная: RNG влияет на всё, включая интерпретацию фактов |
| 11 | C | Расширенный: 12+ типов фактов, 10+ шаблонов, 4 мета-слоя, 5 стилей, 20+ сцен |
| 12 | D | Полноценный: 4 шаблона + 16 типов фактов + 4 мета-слоя + текст + анимированные сцены + финальный выбор |
```