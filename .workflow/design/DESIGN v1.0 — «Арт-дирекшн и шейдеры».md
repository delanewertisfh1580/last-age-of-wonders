```markdown
# SPECIFICATION v1.0 — «Арт-дирекшн и шейдеры»

**Тип документа:** Спецификация, уровень 2 в SDD-процессе  
**Дата:** 2026-11-02  
**Статус:** ✅ утверждено (актуализировано 2026-11-14 — источник DEV-SPEC-011…012 и арт-правил CI)  
**Основана на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
`SPECIFICATION v1.0 — «Сюжет и лор»`  
`SPECIFICATION v1.0 — «Катаклизмы (эскалация, последствия, трансформация)»`  
`SPECIFICATION v1.0 — «Бой команд на фоне дуэли»`  
`SPECIFICATION v1.0 — «Система напарников»`  

**Покрываемые требования:**  
`INT-04` — уникальный визуальный стиль «наука против магии»  
`INT-05` — визуальная асимметрия фракций как часть нарратива  
`INT-30` — нарратив через 4 канала (визуал — равноправный канал)  
`INT-33.9` — обязательная глубокая проработка арт-дирекшна и шейдеров  
`GD-01` — технологический стек (Babylon.js, WebGL, кастомные шейдеры)  
`GD-14` — мобильная адаптация (упрощённые шейдеры, LOD)  
`GD-07` — контент как данные, `ContentRegistry`, валидация схем  
`GD-08` — детальные схемы дефинишенов выносятся на этап спецификаций  

**Следующий шаг:** декомпозиция в атомарные тикеты после утверждения спецификации.

---

## 1. Назначение и границы спецификации

Настоящая спецификация нормативно описывает **арт-дирекшн и шейдерный пайплайн** как data-driven доменную подсистему, охватывающую визуальный язык проекта, фракционную асимметрию, управление материалами, VFX, пост-процессинг, процедурное блендирование параметров и связь визуала с нарративом, катаклизмами и состоянием мира.

Спецификация фиксирует:
- основной вектор стилизации (Arcane-punk / Steampunk hybrid со стилизованным PBR);
- модель динамического масштабирования качества шейдеров для десктопа и мобильных устройств;
- радикальную визуальную асимметрию 4 фракций через раздельные шейдерные графы и VFX-системы;
- гибридную модель проявления катаклизмов (глобальный пост-процессинг + локализованные шейдерные оверрайды);
- процедурное блендирование параметров шейдеров через `transition_policy_id`;
- plugin-based архитектуру на базе полного переиспользования `MechanicDefinition`;
- событийную модель и мосты с другими доменами (катаклизмы, фракции, нарратив, бой, напарники);
- модель RNG, сохранений и требования к CI.

Спецификация не фиксирует:
- числовой баланс (яркости, плотности, тайминги переходов);
- финальные ассеты (текстуры, модели, меши, аудио);
- конкретные значения uniform-переменных шейдеров;
- мобильный UX и конкретные экраны;
- детали генератора эпилога и миграции сохранений;
- детали скрытых веток трансформации;
- детали боя, экономики, напарников, катаклизмов (только контрактные мосты);
- производительность на конкретных устройствах.

Это сознательный выбор уровня нормативно-контрактной детализации: документ должен позволять декомпозировать работу в тикеты, не замораживая баланс и контент prematurely.

---

## 2. Ключевые нормативные решения

### SPEC-ART-001. Основной вектор стилизации
Используется вектор **Arcane-punk / Steampunk hybrid**: акцент на светящихся рунах, латуни, частицах пара и стилизованном PBR с высокой детализацией материалов.

Правила:
- стилизация декларируется через `StylizationProfileDefinition`;
- базовая модель — стилизованный PBR (не фотореализм);
- ключевые визуальные маркеры: свечение (emission), латунные/бронзовые поверхности, пар/дым как постоянный визуальный элемент, руны как носитель магической семантики;
- конкретные ассеты — вне scope этой спецификации.

### SPEC-ART-002. Динамическое масштабирование качества шейдеров
Используется модель **динамического масштабирования качества**: единые графы шейдеров, но движок динамически отключает дорогие проходы в зависимости от тира устройства.

Правила:
- каждый шейдер имеет минимум 3 уровня качества (`quality_tier`: `low`, `medium`, `high`);
- уровни декларируются через `ShaderQualityTierDefinition`;
- переключение уровня — через `quality_policy_id`;
- дорогие проходы (отражения, сложные частицы, volumetric fog) отключаются на `low`;
- конкретные правила отключения — data-driven.

### SPEC-ART-003. Радикальная визуальная асимметрия фракций
Используется модель **радикальной асимметрии**: у каждой фракции принципиально разные шейдерные графы и системы VFX.

Правила:
- каждая фракция имеет `FactionVisualDoctrineDefinition`;
- фракционные шейдерные графы не сводятся к разным цветам — это разные алгоритмы;
- фракционные VFX имеют разные базовые системы частиц;
- фракционная доктрина декларирует уникальные визуальные маркеры;
- конкретные графы — data-driven.

### SPEC-ART-004. Гибридная модель проявления катаклизмов
Используется модель **гибридного проявления**: глобальные пост-процессинговые настройки + локализованные VFX/шейдерные оверрайды на затронутых сущностях и ландшафте.

Правила:
- глобальные эффекты декларируются через `GlobalPostProcessProfileDefinition`;
- локализованные эффекты декларируются через `LocalShaderOverrideDefinition`;
- катаклизм ссылается на обе политики;
- конкретные параметры — data-driven.

### SPEC-ART-005. Процедурное блендирование параметров шейдеров
Используется модель **процедурного блендирования**: шейдеры плавно интерполируют между несколькими наборами параметров с течением времени на основе `transition_policy_id`.

Правила:
- каждый переход декларируется через `ShaderTransitionPolicyDefinition`;
- переход имеет `from_state_id`, `to_state_id`, `duration_policy_id`, `easing_policy_id`;
- интерполяция выполняется на стороне рендер-слоя;
- конкретные кривые — data-driven.

### SPEC-ART-006. Визуальный язык фракций (нормативный минимум)
Каждая фракция имеет уникальный визуальный язык, декларируемый через `FactionVisualDoctrineDefinition`.

Нормативные языки:
- **industrial-steam**: латунь, пар, шестерни, тёплые оранжево-жёлтые эмиссии, механические VFX (искры, дым, струи пара);
- **ancient-arcane**: кристаллы, руны, холодное голубое/фиолетовое свечение, рефракционные VFX, лей-линии;
- **necromantic-corpse**: гниющая плоть, кости, зелёно-чёрные эмиссии, тяжёлый туман, VFX разложения и некротической энергии;
- **living-artifact**: полированный металл, геометрические узоры, пульсирующее янтарное свечение, VFX адаптации и реконструкции.

Правила:
- каждая фракция имеет минимум 1 уникальную шейдерную технику;
- каждая фракция имеет минимум 1 уникальную VFX-систему;
- фракционные языки не пересекаются по базовым техникам.

### SPEC-ART-007. Связь визуала с нарративом
Визуал — равноправный канал доставки нарратива (INT-30).

Правила:
- каждый нарративный элемент имеет `visual_delivery_policy_id`;
- визуал реагирует на состояние мира, катаклизмы, отношения фракций, состояние напарников;
- визуал публикует факты в `EpilogueFactPort` через `visual.fact_recorded`;
- конкретные ассеты — вне scope.

### SPEC-ART-008. Переиспользование механик
Полное переиспользование `MechanicDefinition` из SPEC-FLEET, SPEC-PARTY, SPEC-CATA, SPEC-LORE.

Правила:
- механики визуала живут в общем реестре;
- namespace событий — `visual.*` и `shader.*`;
- механики используют те же правила валидации;
- `role_tags` обязательно содержит `visual` или `shader`;
- контракт `MechanicDefinition` един для всех доменов.

### SPEC-ART-009. Событийная модель
Ядро + фракционные расширения (аналогично SPEC-FLEET-042, SPEC-ECON-082, SPEC-CATA-051).

Правила:
- каноническое ядро обязательно для ContentRegistry;
- фракционные расширения — в пространстве имён фракций;
- мосты с другими доменами — через порты.

### SPEC-ART-010. Модель RNG
Именованные изолированные потоки (дополнение к SPEC-PARTY-041).

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено;
- вся случайность — через seeded RNG service.

### SPEC-ART-011. Модель сохранений
Полные JSON-снимки состояния визуальных настроек и активных переходов.

Правила:
- снимки валидируются по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-ART-012. Уровень валидации и CI
Schema + graph + gameplay lint (аналогично SPEC-PARTY-083).

Правила:
- schema validation — обязательна;
- graph integrity — обязательна;
- gameplay lint — обязателен.

### SPEC-ART-013. Масштаб первой волны
- 4 `FactionVisualDoctrineDefinition` (по одной на фракцию);
- 8+ `MaterialDefinition` (базовые материалы для каждой фракции);
- 6+ `ShaderGraphDefinition` (ключевые шейдерные графы);
- 4+ `GlobalPostProcessProfileDefinition` (атмосферные профили);
- 4+ `LocalShaderOverrideDefinition` (катаклизмические оверрайды);
- 4+ `ShaderTransitionPolicyDefinition` (переходы между состояниями).

---

## 3. Data-контракты

### SPEC-ART-020. Общие правила JSON-контента

`snake_case` для полей, `kebab-case` для ID. Все display-имена выносятся в локализацию.

Примеры ключей локализации:
- `visual-doctrine.industrial-steam.name`
- `material.brass-runic.name`
- `shader-graph.stylized-pbr.name`
- `post-process.arcane-atmosphere.name`
- `shader-override.leyline-rupture.name`
- `transition.cataclysm-buildup.name`

### SPEC-ART-021. `StylizationProfileDefinition`

Определяет общий визуальный стиль проекта.

```json
{
  "id": "stylization-arcane-punk",
  "display_name_key": "stylization.arcane-punk.name",
  "base_model": "stylized_pbr",
  "key_visual_markers": ["emission", "brass_surfaces", "steam_particles", "runic_glow"],
  "quality_policy_id": "adaptive-quality-policy",
  "default_material_policy_id": "default-stylized-pbr"
}
```

Правила:
- `id` уникален;
- `base_model` — один из нормативных типов;
- `key_visual_markers` — минимум 1 маркер;
- профиль не хранит рантайм-состояние.

### SPEC-ART-022. `ShaderQualityTierDefinition`

Определяет уровни качества для шейдеров.

```json
{
  "id": "shader-quality-tier-high",
  "quality_tier": "high",
  "enabled_passes": ["base_color", "normal", "emission", "reflections", "volumetric_fog", "complex_particles"],
  "disabled_passes": [],
  "target_fps_policy_id": "target-60fps"
}
```

```json
{
  "id": "shader-quality-tier-low",
  "quality_tier": "low",
  "enabled_passes": ["base_color", "normal", "emission"],
  "disabled_passes": ["reflections", "volumetric_fog", "complex_particles"],
  "target_fps_policy_id": "target-30fps"
}
```

Правила:
- `quality_tier` — один из: `low`, `medium`, `high`;
- `enabled_passes` и `disabled_passes` не пересекаются;
- каждый уровень имеет `target_fps_policy_id`;
- уровень не хранит рантайм-состояние.

### SPEC-ART-023. `FactionVisualDoctrineDefinition`

Определяет визуальный язык фракции.

```json
{
  "id": "visual-doctrine-industrial-steam",
  "faction_id": "industrial-steam",
  "display_name_key": "visual-doctrine.industrial-steam.name",
  "description_key": "visual-doctrine.industrial-steam.description",
  "primary_palette_id": "palette-brass-orange",
  "secondary_palette_id": "palette-iron-grey",
  "emission_color_id": "emission-warm-orange",
  "unique_shader_technique_ids": [
    "technique-steam-volumetrics",
    "technique-brass-specular"
  ],
  "unique_vfx_system_ids": [
    "vfx-steam-jet",
    "vfx-spark-shower",
    "vfx-gear-rotation"
  ],
  "material_policy_id": "steam-materials-policy",
  "visual_markers": ["steam", "brass", "gears", "warm_glow"]
}
```

```json
{
  "id": "visual-doctrine-ancient-arcane",
  "faction_id": "ancient-arcane",
  "display_name_key": "visual-doctrine.ancient-arcane.name",
  "description_key": "visual-doctrine.ancient-arcane.description",
  "primary_palette_id": "palette-crystal-blue",
  "secondary_palette_id": "palette-arcane-purple",
  "emission_color_id": "emission-cold-blue",
  "unique_shader_technique_ids": [
    "technique-runic-glow",
    "technique-refraction-field"
  ],
  "unique_vfx_system_ids": [
    "vfx-leyline-pulse",
    "vfx-rune-activation",
    "vfx-arcane-resonance"
  ],
  "material_policy_id": "arcane-materials-policy",
  "visual_markers": ["crystals", "runes", "refraction", "cold_glow"]
}
```

```json
{
  "id": "visual-doctrine-necromantic-corpse",
  "faction_id": "necromantic-corpse",
  "display_name_key": "visual-doctrine.necromantic-corpse.name",
  "description_key": "visual-doctrine.necromantic-corpse.description",
  "primary_palette_id": "palette-decay-green",
  "secondary_palette_id": "palette-bone-white",
  "emission_color_id": "emission-necrotic-green",
  "unique_shader_technique_ids": [
    "technique-decay-surface",
    "technique-heavy-fog"
  ],
  "unique_vfx_system_ids": [
    "vfx-miasma-cloud",
    "vfx-bone-fragment",
    "vfx-soul-drain"
  ],
  "material_policy_id": "necromantic-materials-policy",
  "visual_markers": ["decay", "bones", "miasma", "necrotic_glow"]
}
```

```json
{
  "id": "visual-doctrine-living-artifact",
  "faction_id": "living-artifact",
  "display_name_key": "visual-doctrine.living-artifact.name",
  "description_key": "visual-doctrine.living-artifact.description",
  "primary_palette_id": "palette-polished-metal",
  "secondary_palette_id": "palette-amber-glow",
  "emission_color_id": "emission-amber-pulse",
  "unique_shader_technique_ids": [
    "technique-geometric-pattern",
    "technique-reconstruction"
  ],
  "unique_vfx_system_ids": [
    "vfx-adaptation-pulse",
    "vfx-geometric-reconfigure",
    "vfx-amber-resonance"
  ],
  "material_policy_id": "artifact-materials-policy",
  "visual_markers": ["polished_metal", "geometric", "amber_pulse", "reconstruction"]
}
```

Правила:
- `id` уникален;
- `faction_id` — обязательное поле;
- `unique_shader_technique_ids` — минимум 1 уникальная техника;
- `unique_vfx_system_ids` — минимум 1 уникальная VFX-система;
- доктрина не хранит рантайм-состояние.

### SPEC-ART-024. `MaterialDefinition`

Определяет конкретный материал.

```json
{
  "id": "material-brass-runic",
  "display_name_key": "material.brass-runic.name",
  "shader_graph_id": "shader-graph-stylized-pbr",
  "base_parameters": {
    "base_color": "#b87333",
    "metallic": 0.9,
    "roughness": 0.3,
    "emission_intensity": 0.2
  },
  "runic_overlay_policy_id": "runic-overlay-steam",
  "weathering_policy_id": "brass-weathering",
  "quality_overrides": {
    "low": { "runic_overlay_enabled": false },
    "medium": { "runic_overlay_enabled": true },
    "high": { "runic_overlay_enabled": true, "weathering_enabled": true }
  }
}
```

Правила:
- `id` уникален;
- `shader_graph_id` — обязательное поле;
- `base_parameters` — обязательное поле;
- `quality_overrides` — опционально, но рекомендуется;
- материал не хранит рантайм-состояние.

### SPEC-ART-025. `ShaderGraphDefinition`

Определяет шейдерный граф.

```json
{
  "id": "shader-graph-stylized-pbr",
  "display_name_key": "shader-graph.stylized-pbr.name",
  "graph_type": "pbr_stylized",
  "input_parameters": [
    { "name": "base_color", "type": "color" },
    { "name": "metallic", "type": "float" },
    { "name": "roughness", "type": "float" },
    { "name": "emission_intensity", "type": "float" }
  ],
  "output_parameters": ["final_color", "final_normal", "final_emission"],
  "quality_tier_ids": [
    "shader-quality-tier-low",
    "shader-quality-tier-medium",
    "shader-quality-tier-high"
  ],
  "mechanic_ids": [
    "visual-pbr-resolver"
  ]
}
```

Правила:
- `id` уникален;
- `graph_type` — один из нормативных типов;
- `input_parameters` — минимум 1;
- `quality_tier_ids` — минимум 1;
- граф не хранит рантайм-состояние.

### SPEC-ART-026. `GlobalPostProcessProfileDefinition`

Определяет глобальный пост-процессинговый профиль.

```json
{
  "id": "post-process-arcane-atmosphere",
  "display_name_key": "post-process.arcane-atmosphere.name",
  "color_grading_policy_id": "arcane-color-grading",
  "fog_policy_id": "arcane-volumetric-fog",
  "bloom_policy_id": "arcane-bloom",
  "distortion_policy_id": "arcane-screen-distortion",
  "ambient_particles_policy_id": "arcane-dust-particles",
  "transition_policy_id": "transition-to-arcane-atmosphere"
}
```

Правила:
- `id` уникален;
- все политики опциональны, но минимум одна должна быть задана;
- профиль не хранит рантайм-состояние.

### SPEC-ART-027. `LocalShaderOverrideDefinition`

Определяет локализованный шейдерный оверрайд (для катаклизмов, зон, сущностей).

```json
{
  "id": "shader-override-leyline-rupture",
  "display_name_key": "shader-override.leyline-rupture.name",
  "override_type": "surface_distortion",
  "target_filter_tags": ["terrain", "leyline-affected"],
  "shader_graph_id": "shader-graph-leyline-distortion",
  "intensity_policy_id": "leyline-rupture-intensity",
  "transition_policy_id": "transition-to-leyline-rupture",
  "mechanic_ids": [
    "visual-leyline-override-tracker"
  ]
}
```

Правила:
- `id` уникален;
- `override_type` — один из: `surface_distortion`, `color_shift`, `emission_pulse`, `particle_overlay`, `geometry_warp`;
- `target_filter_tags` — минимум 1;
- оверрайд не хранит рантайм-состояние.

### SPEC-ART-028. `ShaderTransitionPolicyDefinition`

Определяет политику перехода между визуальными состояниями.

```json
{
  "id": "transition-to-arcane-atmosphere",
  "display_name_key": "transition.arcane-atmosphere.name",
  "from_state_id": "state-normal",
  "to_state_id": "state-arcane-cataclysm",
  "duration_policy_id": "duration-cataclysm-buildup",
  "easing_policy_id": "easing-smooth-step",
  "interpolated_parameters": [
    { "parameter": "fog_density", "from_value": 0.1, "to_value": 0.8 },
    { "parameter": "emission_intensity", "from_value": 0.0, "to_value": 0.5 },
    { "parameter": "distortion_strength", "from_value": 0.0, "to_value": 0.3 }
  ]
}
```

Правила:
- `id` уникален;
- `duration_policy_id` — обязательное поле;
- `easing_policy_id` — обязательное поле;
- `interpolated_parameters` — минимум 1;
- политика не хранит рантайм-состояние.

### SPEC-ART-029. `VfxSystemDefinition`

Определяет систему визуальных эффектов.

```json
{
  "id": "vfx-steam-jet",
  "display_name_key": "vfx.steam-jet.name",
  "vfx_type": "particle_system",
  "faction_id": "industrial-steam",
  "emitter_policy_id": "steam-jet-emitter",
  "particle_policy_id": "steam-jet-particles",
  "lifetime_policy_id": "steam-jet-lifetime",
  "quality_overrides": {
    "low": { "max_particles": 50, "shadows_enabled": false },
    "medium": { "max_particles": 200, "shadows_enabled": false },
    "high": { "max_particles": 500, "shadows_enabled": true }
  }
}
```

Правила:
- `id` уникален;
- `vfx_type` — один из: `particle_system`, `ribbon`, `beam`, `distortion_field`, `screen_overlay`;
- `faction_id` — опционально (для фракционных VFX);
- `quality_overrides` — опционально;
- система не хранит рантайм-состояние.

### SPEC-ART-030. Переиспользование `MechanicDefinition`

Механики визуала используют тот же контракт, что и корабельные, с обязательными `role_tags` (например, `["visual", "post-process"]`) и строгим разделением на resolver и tracker.

Пример резолвера:

```json
{
  "id": "visual-pbr-resolver",
  "kind": "resolver",
  "faction_tags": [],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["visual", "shader"],
  "params": {},
  "consumes": [
    "visual.material_parameter_changed",
    "world.tick_advanced"
  ],
  "emits": [
    "visual.shader_uniform_updated"
  ],
  "state_schema": null,
  "counterplay_tags": [],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 100,
  "lifecycle": {
    "scope": "visual",
    "persisted": false
  }
}
```

Пример трекера:

```json
{
  "id": "visual-leyline-override-tracker",
  "kind": "tracker",
  "faction_tags": ["ancient-arcane"],
  "branch_tags": [],
  "ship_class_tags": [],
  "facet_tags": [],
  "role_tags": ["visual", "cataclysm-override"],
  "params": {},
  "consumes": [
    "cataclysm.stage_changed",
    "cataclysm.effect_applied"
  ],
  "emits": [
    "visual.override_intensity_changed",
    "visual.override_activated"
  ],
  "state_schema": {
    "$id": "mechanics/visual-leyline-override-tracker/1",
    "type": "object",
    "properties": {
      "current_intensity": { "type": "number" },
      "affected_entity_ids": {
        "type": "array",
        "items": { "type": "string" }
      },
      "override_active": { "type": "boolean" }
    },
    "required": ["current_intensity", "override_active"]
  },
  "counterplay_tags": ["arcane", "containment"],
  "validation_rules": {
    "params_schema": { "type": "object" }
  },
  "priority": 90,
  "lifecycle": {
    "scope": "visual",
    "persisted": true
  }
}
```

Правила:
- контракт `MechanicDefinition` един для всех доменов;
- `role_tags` обязательно содержит `visual` или `shader`;
- namespace событий — `visual.*` и `shader.*`;
- механики проходят те же проверки валидации.

### SPEC-ART-031. `VisualStateInstance` (Runtime)

Снимок состояния в Memento:

```json
{
  "visual_state_id": "visual-state-player-1",
  "current_stylization_profile_id": "stylization-arcane-punk",
  "current_quality_tier": "high",
  "active_global_post_process_profile_id": "post-process-arcane-atmosphere",
  "active_local_overrides": [
    {
      "override_id": "shader-override-leyline-rupture",
      "intensity": 0.7,
      "started_tick": 1450
    }
  ],
  "active_transitions": [
    {
      "transition_id": "transition-to-arcane-atmosphere",
      "progress": 0.6,
      "started_tick": 1440
    }
  ],
  "active_tracker_states": {
    "visual-leyline-override-tracker": {
      "current_intensity": 0.7,
      "affected_entity_ids": ["node-leyline-grove"],
      "override_active": true
    }
  },
  "faction_visual_state": {
    "industrial-steam": {
      "dominance_in_view": 0.3,
      "visual_influence": 0.4
    },
    "ancient-arcane": {
      "dominance_in_view": 0.5,
      "visual_influence": 0.7
    }
  }
}
```

Правила:
- каждый мир имеет снимок;
- снимок валидируется по JSON Schema;
- Memento pattern из GD-09 остаётся основным механизмом.

---

## 4. Событийная модель

### SPEC-ART-040. Каноническое ядро

Добавляются следующие обязательные события:

| Событие | Назначение |
| --- | --- |
| visual.quality_tier_changed | уровень качества шейдеров изменён |
| visual.material_parameter_changed | параметр материала изменён |
| visual.shader_uniform_updated | uniform шейдера обновлён |
| visual.post_process_profile_activated | глобальный пост-процессинг активирован |
| visual.post_process_profile_deactivated | глобальный пост-процессинг деактивирован |
| visual.local_override_activated | локализованный оверрайд активирован |
| visual.local_override_deactivated | локализованный оверрайд деактивирован |
| visual.override_intensity_changed | интенсивность оверрайда изменилась |
| visual.transition_started | переход между состояниями начат |
| visual.transition_completed | переход между состояниями завершён |
| visual.vfx_system_spawned | система VFX создана |
| visual.vfx_system_destroyed | система VFX уничтожена |
| visual.faction_visual_dominance_changed | визуальное доминирование фракции изменилось |
| visual.cataclysm_visual_manifested | катаклизм визуально проявился |
| visual.narrative_visual_cue_triggered | нарративный визуальный сигнал сработал |
| shader.graph_switched | шейдерный граф переключён |
| shader.technique_activated | шейдерная техника активирована |

Правила:
- эти события обязательны для ContentRegistry;
- механики визуала могут ссылаться только на зарегистрированные события;
- фракции не могут переопределять семантику ядерных событий.

### SPEC-ART-041. Фракционные расширения

Каждая фракция объявляет события в своём пространстве имён:

`visual.industrial-steam.*`
`visual.ancient-arcane.*`
`visual.necromantic-corpse.*`
`visual.living-artifact.*`

Примеры:
- `visual.industrial-steam.steam-pressure-increased`
- `visual.ancient-arcane.leyline-resonance-amplified`
- `visual.necromantic-corpse.decay-intensity-changed`
- `visual.living-artifact.corpus-reconstruction-triggered`

Правила:
- фракционное событие обязано быть зарегистрировано;
- обязано иметь payload schema;
- не может совпадать по ID с ядерным событием;
- не может ломать ядерную семантику.

### SPEC-ART-042. Мосты с другими доменами

Мост visual ↔ cataclysm:
- `cataclysm.triggered` → `visual.cataclysm_visual_manifested`
- `cataclysm.stage_changed` → `visual.transition_started`
- `cataclysm.effect_applied` → `visual.local_override_activated`
- `cataclysm.ended` → `visual.post_process_profile_deactivated`

Мост visual ↔ narrative:
- публикация фактов в `EpilogueFactPort`:
  - `epilogue.visual.world_atmosphere_shifted`
  - `epilogue.visual.faction_dominance_changed`
  - `epilogue.visual.cataclysm_visually_manifested`

Мост visual ↔ faction:
- `faction.dominance_changed` → `visual.faction_visual_dominance_changed`
- `faction.territory_changed` → `visual.local_override_activated`

Мост visual ↔ combat:
- `combat.started` → `visual.post_process_profile_activated` (боевой профиль)
- `combat.ended` → `visual.post_process_profile_deactivated`

Мост visual ↔ companion:
- `companion.reaction_triggered_macro` → `visual.narrative_visual_cue_triggered`

Мост visual ↔ world:
- `world.time_of_day_changed` → `visual.post_process_profile_activated`
- `world.weather_changed` → `visual.post_process_profile_activated`

Правила:
- мосты декларативны;
- каждый мост имеет нормативный набор событий;
- мосты не раскрывают внутреннюю логику смежных доменов.

---

## 5. Детерминизм и RNG

### SPEC-ART-050. Детерминизм

Симуляция визуальных переходов и вариативности VFX полностью детерминирована от seed.

Правила:
- обязательна для тестов и реплеев;
- вся случайность — через seeded RNG service;
- сохранение + загрузка дают идентичное продолжение.

### SPEC-ART-051. Именованные потоки RNG (дополнение к SPEC-PARTY-041)

Добавляются изолированные потоки:

| Поток | Назначение |
| --- | --- |
| rng.visual.vfx_variation | вариативность VFX (траектории частиц, тайминги) |
| rng.visual.transition_jitter | небольшой джиттер в переходах для естественности |
| rng.visual.material_wear | вариативность износа материалов |
| rng.visual.faction_visual_mix | смешение визуальных языков в пограничных зонах |

Правила:
- каждый поток изолирован;
- каждый поток именован;
- смешение потоков запрещено.

---

## 6. Сохранения и состояние

### SPEC-ART-060. Полные JSON-снимки

Состояние визуала сохраняется через полные снимки `VisualStateInstance` (Memento pattern).

Правила:
- каждый мир имеет снимок;
- снимок валидируется по JSON Schema;
- загрузка не восстанавливает поведение через журнал дельт;
- Memento pattern из GD-09 остаётся основным механизмом.

### SPEC-ART-061. Валидация при загрузке

При загрузке:
- состояние визуала проверяется по JSON Schema;
- состояние трекеров проверяется по JSON Schema;
- несоответствие схемы считается повреждением сохранения;
- миграции схем выносятся в отдельную будущую задачу.

---

## 7. Валидация и CI

### SPEC-ART-070. Уровень валидации

Обязательный уровень: Schema + graph + gameplay lint.

### SPEC-ART-071. Schema validation

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
- корректность ссылок на фракции, материалы, шейдерные графы.

### SPEC-ART-072. Graph integrity

Проверяется целостность графа контента:

```
VisualStateInstance
  → StylizationProfileDefinition
  → FactionVisualDoctrineDefinition[] (по фракциям)
    → MaterialDefinition[]
      → ShaderGraphDefinition[]
        → ShaderQualityTierDefinition[]
    → VfxSystemDefinition[]
  → GlobalPostProcessProfileDefinition[]
  → LocalShaderOverrideDefinition[]
  → ShaderTransitionPolicyDefinition[]
  → MechanicDefinition[]
    → EventDefinition[]
```

Обязательные проверки:
- каждая фракция имеет визуальную доктрину;
- каждый материал ссылается на существующий шейдерный граф;
- каждый шейдерный граф имеет минимум 1 уровень качества;
- каждый переход имеет `duration_policy_id` и `easing_policy_id`;
- все referenced mechanics существуют;
- все referenced events существуют;
- все referenced factions существуют;
- все referenced materials существуют;
- все referenced shader graphs существуют.

### SPEC-ART-073. Gameplay lint

Дополнительные игровые проверки:
- каждая фракционная визуальная доктрина имеет минимум 1 уникальную шейдерную технику;
- каждая фракционная визуальная доктрина имеет минимум 1 уникальную VFX-систему;
- отсутствие циклических ссылок в переходах;
- все `mechanic_ids` существуют в реестре и имеют корректные `role_tags` с `visual` или `shader`;
- каждый катаклизм имеет минимум 1 визуальное проявление (глобальное или локализованное);
- каждый переход имеет минимум 1 интерполируемый параметр;
- ContentRegistry не должен содержать дублирующихся ID;
- фракционные визуальные языки не пересекаются по базовым техникам.

---

## 8. Нормативные скелеты первой волны

### SPEC-ART-080. `FactionVisualDoctrineDefinition` первой волны (4)

Минимум 4 доктрины (по одной на фракцию):
- `visual-doctrine-industrial-steam` (латунь, пар, тёплое свечение)
- `visual-doctrine-ancient-arcane` (кристаллы, руны, холодное свечение)
- `visual-doctrine-necromantic-corpse` (гниение, кости, туман)
- `visual-doctrine-living-artifact` (полированный металл, геометрические узоры, янтарь)

### SPEC-ART-081. `MaterialDefinition` первой волны (8+)

Минимум 8 базовых материалов:
- `material-brass-runic` (industrial-steam)
- `material-iron-plate` (industrial-steam)
- `material-crystal-arcane` (ancient-arcane)
- `material-rune-stone` (ancient-arcane)
- `material-decayed-flesh` (necromantic-corpse)
- `material-bone-surface` (necromantic-corpse)
- `material-polished-artifact` (living-artifact)
- `material-amber-core` (living-artifact)

### SPEC-ART-082. `ShaderGraphDefinition` первой волны (6+)

Минимум 6 шейдерных графов:
- `shader-graph-stylized-pbr` (базовый стилизованный PBR)
- `shader-graph-steam-volumetrics` (паровые объёмы)
- `shader-graph-runic-glow` (свечение рун)
- `shader-graph-refraction-field` (рефракционные поля)
- `shader-graph-decay-surface` (поверхности гниения)
- `shader-graph-leyline-distortion` (искажение лей-линий)

### SPEC-ART-083. `GlobalPostProcessProfileDefinition` первой волны (4+)

Минимум 4 атмосферных профиля:
- `post-process-normal-atmosphere` (нормальное состояние мира)
- `post-process-arcane-atmosphere` (арканный катаклизм)
- `post-process-industrial-smog` (индустриальный смог)
- `post-process-necrotic-miasma` (некротическая чума)

### SPEC-ART-084. `LocalShaderOverrideDefinition` первой волны (4+)

Минимум 4 локализованных оверрайда:
- `shader-override-leyline-rupture` (разрыв лей-линии)
- `shader-override-industrial-smog-zone` (зона смога)
- `shader-override-necrotic-plague-area` (зона чумы)
- `shader-override-metaphysical-tear` (метафизический разрыв)

### SPEC-ART-085. `ShaderTransitionPolicyDefinition` первой волны (4+)

Минимум 4 политики переходов:
- `transition-to-arcane-atmosphere` (переход в арканную атмосферу)
- `transition-to-industrial-smog` (переход в индустриальный смог)
- `transition-to-necrotic-miasma` (переход в некротический туман)
- `transition-to-normal` (возврат к нормальному состоянию)

---

## 9. Вертикальный срез первой сборки

### SPEC-ART-090. Нормативный вертикальный срез

Первая сборка включает:
- 4 `FactionVisualDoctrineDefinition` с уникальными техниками и VFX;
- 8 `MaterialDefinition` (по 2 на фракцию);
- 6 `ShaderGraphDefinition` (базовый PBR + 5 фракционно-специфичных);
- 4 `GlobalPostProcessProfileDefinition` (нормальный + 3 катаклизмических);
- 4 `LocalShaderOverrideDefinition` (по одному на катаклизм);
- 4 `ShaderTransitionPolicyDefinition` (переходы между состояниями);
- работающий механизм динамического масштабирования качества (low/medium/high);
- работающий механизм процедурного блендирования параметров;
- рабочие мосты с катаклизмами (визуальное проявление);
- рабочие мосты с нарративом (публикация фактов в `EpilogueFactPort`);
- рабочие мосты с фракциями (визуальное доминирование);
- рабочие мосты с боем (боевые пост-процессинговые профили).

Этот срез является нормативным минимальным завершаемым набором для интеграционного тестирования.

---

## 10. Критерии приёмки спецификации

Спецификация считается принятой, если:

✅ зафиксирован основной вектор стилизации (Arcane-punk / Steampunk hybrid со стилизованным PBR);  
✅ зафиксирована модель динамического масштабирования качества шейдеров (low/medium/high);  
✅ зафиксирована радикальная визуальная асимметрия 4 фракций (раздельные шейдерные графы и VFX);  
✅ зафиксирована гибридная модель проявления катаклизмов (глобальный пост-процессинг + локализованные оверрайды);  
✅ зафиксирована модель процедурного блендирования параметров шейдеров через `transition_policy_id`;  
✅ зафиксированы 4 нормативных визуальных языка фракций;  
✅ зафиксирована связь визуала с нарративом как равноправного канала;  
✅ зафиксировано полное переиспользование `MechanicDefinition`;  
✅ зафиксированы новые ядерные события и потоки RNG;  
✅ зафиксированы правила gameplay lint для визуала;  
✅ зафиксирован вертикальный срез первой сборки;  
✅ зафиксирована событийная модель «каноническое ядро + фракционные расширения»;  
✅ зафиксированы мосты с катаклизмами, нарративом, фракциями, боем, напарниками, миром;  
✅ зафиксирован `EpilogueFactPort`;  
✅ зафиксированы именованные потоки RNG;  
✅ зафиксированы полные снимки состояния визуала;  
✅ зафиксирован уровень CI: schema + graph + gameplay lint;  
✅ зафиксированы 4 фракционные доктрины, 8+ материалов, 6+ шейдерных графов, 4+ пост-процессинговых профиля, 4+ оверрайда, 4+ перехода.

---

## 11. Что остаётся за пределами этой спецификации

Следующее выносится в отдельные спецификации или будущие итерации:
- числовой баланс (яркости, плотности, тайминги переходов);
- финальные ассеты (текстуры, модели, меши, аудио);
- конкретные значения uniform-переменных шейдеров;
- мобильный UX и конкретные экраны;
- детали генератора эпилога (только публикация фактов);
- детали скрытых веток трансформации;
- детали боя, экономики, напарников, катаклизмов (только контрактные мосты);
- производительность на конкретных устройствах;
- миграции сохранений;
- конкретные концепт-арты и референсы.

---

## 12. Приложение. Журнал решений по сбору данных

| Вопрос | Ответ пользователя | Решение в спецификации |
| --- | --- | --- |
| 1. Основной вектор стилизации 3D-графики | A | Arcane-punk / Steampunk hybrid: акцент на светящихся рунах, латуни, частицах пара и стилизованном PBR с высокой детализацией материалов. |
| 2. Компромисс между сложностью шейдеров и мобильной оптимизацией | B | Динамическое масштабирование качества: единые графы шейдеров, но движок динамически отключает дорогие проходы (отражения, сложные частицы) в зависимости от тира устройства. |
| 3. Степень визуальной асимметрии между 4 фракциями | A | Радикальная асимметрия: у каждой фракции принципиально разные шейдерные графы и системы VFX (например, пар использует плотные непрозрачные частицы, а магия — прозрачные рефракционные свечения). |
| 4. Визуальное проявление катаклизмов | D | Гибридный подход: комбинация глобальных пост-процессинговых настроек + локализованные VFX/шейдерные оверрайды на затронутых сущностях и ландшафте. |
| 5. Управление параметрами шейдеров из data-driven слоя | D | Процедурное блендирование параметров: шейдеры плавно интерполируют между несколькими наборами параметров с течением времени на основе `transition_policy_id`, указанного в JSON-событии. |
```