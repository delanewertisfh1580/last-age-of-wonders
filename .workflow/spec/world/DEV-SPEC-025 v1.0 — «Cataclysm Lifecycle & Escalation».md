# DEV-SPEC-025 v1.0 — «Cataclysm Lifecycle & Escalation»

**Тип документа:** Спецификация к разработке  
**Дата:** 2026-11-04  
**Статус:** draft  
**Волна:** Wave 4 (World & Cataclysms, третья — после DEV-SPEC-023/024, параллельно 026)  
**Зависит от:** `DEV-SPEC-001…007`, `DEV-SPEC-023` (PoliticalMapState — мишени политического удара), `DEV-SPEC-024` (омены и давление в календаре), `DEV-SPEC-020/022` (мост `cataclysm_lines → economy`, давление `cataclysm_pressure` из hooks 022)  
**Блокирует:** `DEV-SPEC-026` (эффекты и шрамы предоставляют события стадии), `DEV-SPEC-033` (путь «игрок как катаклизм» → hidden-branch контракты), `DEV-SPEC-034/036` (narративная доставка и факты эпилога о катаклизмах), `DEV-SPEC-039`  
**Основана на:** `DESIGN v1.0 — «Катаклизмы»` (SPEC-CATA-001…007, 041…043, 050…052, 060…061, 070…071, 080…083, 090…091), `INTENT v1.0` (INT-13, INT-15), `GENERAL DESIGN v1.0` (GD-04, GD-05, GD-07/08, GD-09, GD-17)  
**Связанные DEV-SPEC:** `DEV-SPEC-023` (контроль городов), `DEV-SPEC-024` (омены), `DEV-SPEC-020/022` (шоки/шрамы экономики).

---

## 1. Назначение и границы

### 1.1. Что спецификация делает
Определяет систему глобальных катаклизмов: типологию (4 архетипа-источника × эффекты-теги), источники возникновения (`procedural | scripted | player_or_faction_driven`), масштаб (`point | regional | global`), модель жизненного цикла из стадий (`stage_definitions`, минимум 2), гибридную эскалацию (линейный каркас + декларативные модификаторы скорости/ветвления), политики завершения (`resolution_policy`), plugin-based архитектуру (переиспользование `MechanicDefinition`, контракты 004), событийную модель и мосты на домены, RNG, memento и CI.

Также фиксирует: механики scope `cataclysm` (2 трекера + 2 резолвера), шедуллер запуска (процедурные катаклизмы по давлению/таймеру), пульт сценарного запуска (триггеры мира — готовые события 023/024), контент первой волны — 6 катаклизмов (SPEC-CATA-090).

### 1.2. Что спецификация НЕ делает
- Не применяет последствия кworldState напрямую: эффекты и шрамы — DEV-SPEC-026 (здесь только события стадий).
- Не решает числовой баланс: длительности стадий, множители_intensity — политики/контент.
- Не реализует путь «игрок как катаклизм» (→ `DEV-SPEC-033`): только хук `player-ascension-catalyst`.
- Не penaepствует арте VIewFx/Audio: нарративная доставка — контракты каналов (034, 011, 015).

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| SPEC-CATA-001 | 4 archetype_tags, effect_tags | нет |
| SPEC-CATA-002 | 3 source_type | нет |
| SPEC-CATA-003 | scale_level 3 уровня | нет |
| SPEC-CATA-004 | duration_policy данные, без классов | нет |
| SPEC-CATA-005 | стадии: id, duration/effect policies, миним 2 | нет |
| SPEC-CATA-006 | гибридная эскалация | нет |
| SPEC-CATA-007 | resolution_policy (5 сценариев + комбинации) | нет |
| SPEC-CATA-017/018 |CataclysmDefinition + MechanicDefinition, role_tags | нет |
| SPEC-CATA-019/020/050 | ядро `cataclysm.*` + фрагмент extensions + мосты | нет |
| SPEC-CATA-021 | именованные RNG потоки (уже в каталоге) | нет |
| SPEC-CATA-022/070 | снимки + журнал завершённых | нет |
| SPEC-CATA-026 | вертикальный срез 4 катаклизма (первая сборка) | нет |

---

## 2. Зависимости

### 2.1. Обязательные
- `DEV-SPEC-001/002` — Result; EventRegistry: 12 ядерных `cataclysm.*` (§6.3).
- `DEV-SPEC-003` — ContentKind `cataclysm`, `cataclysm-doctrine`, `cataclysm-quest-template` по необходимости (2 регистрационные схемы: definition, instance).
- `DEV-SPEC-004` — механики scope `cataclysm` (§7.1); контракт solo конфликтов исключён: опыт 020/022-механик переносится.
- `DEV-SPEC-005` — потоки `rng.cataclysm.spawn`, `rng.cataclysm.escalation`, `rng.cataclysm.effects`, `rng.cataclysm.resolution`, `rng.cataclysm.hidden_branch` (уже в каталоге).
- `DEV-SPEC-006` — memento: активные снимки + `completed_cataclysms_journal`.
- `DEV-SPEC-007` — фаза `scope:cataclysm` (после `scope:world`, перед `scope:party`).  
- `DEV-SPEC-023` — приёмник политических последствий (`world.city_control_changed` — эффект на мир).
- `DEV-SPEC-020/022` — мосты экономических последствий (026 реализует).

### 2.2. Мягкие
- `DEV-SPEC-024` — события-омены повышают мировое давление (счётчик inside scheduler).
- `DEV-SPEC-027/028` — напарники как unary реагенты: реакции по `companion_reaction_policy_id` (контракт фикс, реализация 028).
- `DEV-SPEC-033` — пермиilled хук `cataclysm.hidden_branch_opened`.

### 2.3. Внешние
Нет.

---

## 3. Термины

| Термин | Смысл |
|---|---|
| **Архетип-источник** | natural | arcane | industrial | metaphysical — происхождение катаклизма |
| **Стадия** | Единица жизненного цикла: длительность + эффект-политика |
| **Эскалация** | Изменение интенсивности/следка стадий под влиянием состояния мира и игрока |
| **Резолюция** | Способ завершения (самоугасание / вмешательство / трансформация / шрам) |
| **Шедуллер** | Планировщик запусков катаклизмов (procedural) |
| **Давление (pressure)** | Накопленный счётчик, повышаемый оменами/событиями/вмешательством игрока |

---

## 4. Архитектурное размещение

```
src/domain/cataclysm/
  entities/
    CataclysmInstance.ts      # runtime-экземпляр (спека-агрегат для группы активных)
  aggregates/
    CataclysmEngine.ts        # реестр активных + журнал
  valueObjects/
    StageProgress.ts          # текущая стадия/прогресс
    EscalationState.ts
  mechanics/
    cataclysm-scheduler-tracker.ts      # spawn: pressure/таймеры/условия
    cataclysm-stage-tracker.ts          # стадии: таймеры, stage_changed
    cataclysm-escalation-resolver.ts    # velocity/branch резолвы
    cataclysm-resolution-resolver.ts    # завершение (policy)
    definitions/
  index.ts
src/application/useCases/
  TriggerCataclysmManually.ts   # отладочный/сценарный ручной запуск (GD-debug)
  ChangeCatalogPressure.ts      # use case для hooks 022/033
src/domain/ports/
  ICataclysmPoliticalOut.ts    # публикация political_impact_applied (пот. 023)
  ICataclysmEconomicOut.ts     # публикация shock/scar событий (пот. 020/022, impl 026)
  ICataclysmHiddenBranchOut.ts # employment hidden_branch hooks (impl 033)
```

ContentKind: `cataclysm` (definition), `cataclysm-doctrine`, `cataclysm-quest-template` (26 — опционально). Пакет вехи: `cataclysm-core`.

Фазовая привязка: механики scope `cataclysm`, priorities 280/270/260/250 — после `scope:world`-механик (023/024: 360–340), до `scope:party`. RNG-потоки уже в каталоге (023 их не расширяла дальше `rng.world.*`).

---

## 5. Domain-модель

### 5.1. `CataclysmDefinition` (контент-контракт)

```ts
export type CataclysmArchetype = 'natural' | 'arcane' | 'industrial' | 'metaphysical';
export type CataclysmScale = 'point' | 'regional' | 'global';
export type CataclysmSource = 'procedural' | 'scripted' | 'player_or_faction_driven';
export type ResolutionKind = 'self_extinguishing' | 'external_intervention' | 'transformation' | 'persistent_scar';

export interface CataclysmStageDefinition {
  readonly id: string;
  readonly duration_policy_id: string;
  readonly effect_policy_id: string;      // реализуется послеeffects 026
}

export interface CataclysmDefinition {
  readonly kind: 'cataclysm';
  readonly id: string;
  readonly display_name_key: string;
  readonly source_type: CataclysmSource;
  readonly archetype_tags: readonly CataclysmArchetype[];  // минимум 1
  readonly effect_tags: readonly string[];
  readonly scale_level: CataclysmScale;
  readonly stage_definitions: readonly CataclysmStageDefinition[]; // минимум 2
  readonly escalation_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly resolution_policy_id: string;
  readonly faction_interaction_policy_id: string;
  readonly political_impact_policy_id: string;
  readonly player_reaction_policy_id: string;
  readonly narrative_delivery_policy_id: string;
  readonly hidden_branch_hook_policy_id: string | null; // SPEC-CATA-029
}
```

### 5.2. `CataclysmInstance` (runtime)

```ts
export interface CataclysmInstance {
  readonly instance_id: string;
  readonly definition_id: string;
  readonly current_stage_id: string;
  readonly started_tick: number;
  readonly affected_entities: {
    readonly node_ids: readonly string[];
    readonly city_ids: readonly string[];
    readonly faction_ids: readonly string[];
    readonly ship_ids: readonly string[];
  };
  readonly escalation_state: { readonly current_velocity: number; readonly branch_taken: string | null };
  readonly active_tracker_states: Record<string, unknown>; // state_schema механик-трекеров
}
```

### 5.3. Давление и запуск (procedural)

```ts
export interface CataclysmSpawnState {
  readonly pressure: number;         // 0..∞, потолок наст lingstr config
  readonly pressure_ceiling: number;
  readonly last_spawn_tick: number;
}
```

Правила:
- давление растёт от оменов 024 (`cataclysm-omen`), hooks 022 (`cataclysm_pressure` API), политических стрессов 023 (войн healing intensity);
- порог давлений запускает candidate-ротацию из пула `procedural` катаклизмов (`rng.cataclysm.spawn`);

---

## 6. Data-контракты и схемы

### 6.1. Схемы пакетов
- `content/cataclysm/cataclysm.schema.json`;
- `content/cataclysm-doctrine/policy.schema.json` (026);
- `state/cataclysm-instance.schema.json`;
- `state/cataclysm-spawn-state.schema.json`.

### 6.2. Пример (сжатый, по SPEC-CATA-041)

```json
{
  "id": "arcane-leyline-rupture",
  "display_name_key": "cataclysm.arcane-leyline-rupture.name",
  "source_type": "scripted",
  "archetype_tags": ["arcane", "metaphysical"],
  "effect_tags": ["magic-disruption", "reality-tear"],
  "scale_level": "regional",
  "stage_definitions": [
    { "id": "stage-buildup", "duration_policy_id": "rupture-buildup-duration", "effect_policy_id": "rupture-buildup-effects" },
    { "id": "stage-peak", "duration_policy_id": "rupture-peak-duration", "effect_policy_id": "rupture-peak-effects" },
    { "id": "stage-decay", "duration_policy_id": "rupture-decay-duration", "effect_policy_id": "rupture-decay-effects" }
  ],
  "escalation_policy_id": "arcane-rupture-escalation",
  "mechanic_ids": ["cataclysm-stage-tracker", "cataclysm-escalation-resolver"],
  "resolution_policy_id": "arcane-rupture-resolution",
  "political_impact_policy_id": "rupture-political-impact",
  "hidden_branch_hook_policy_id": "rupture-arcane-hidden-hook"
}
```

### 6.3. Ядро событий (SPEC-CATA-050)

`cataclysm.triggered`, `cataclysm.stage_changed`, `cataclysm.escalated`, `cataclysm.effect_applied`, `cataclysm.ended`, `cataclysm.scar_applied` (026), `cataclysm.scar_removed` (026), `cataclysm.political_impact_applied`, `cataclysm.player_intervention_attempted`, `cataclysm.faction_interaction_applied`, `cataclysm.hidden_branch_opened`, `cataclysm.player_transformed` (033).

Delivery: `Immediate` — `triggered`, `player_…`; `AfterScene` — `ended`, `political_impact_applied`; `NextTick` — `stage_changed`, `escalated`.

### 6.4. Memento

```json
{
  "domain": "cataclysm",
  "version": 1,
  "active_cataclysms": [ "полный снимок CataclysmInstance, ..."],
  "completed_cataclysms_journal": [
    { "instance_id": "...", "definition_id": "...", "ended_tick": 1200, "resolution": "self_extinguishing", "scar_ids": ["..."] }
  ],
  "spawn_state": { "pressure": 0.42, "pressure_ceiling": 1.0, "last_spawn_tick": 900 }
}
```

Валидация при загрузке — по схеме; несовпадение — повреждение сохранения.

---

## 7. Рантайм-поведение

### 7.1. Механики

| ID | kind | priority | persist | Назначение |
|---|---|---|---|---|
| `cataclysm-scheduler-tracker` | tracker | 280 | да | Давление/таймеры: pick candidate, запуск `triggered` |
| `cataclysm-stage-tracker` | tracker | 270 | да | Прогрес staged, `stage_changed`, запуск effect_policy (026 применяет) |
| `cataclysm-escalation-resolver` | resolver | 260 | нет | velocity/branch: модификаторы стадии из `escalation_policy` |
| `cataclysm-resolution-resolver` | resolver | 250 | нет | ResoLution policy: завершение/трансформация/шрам; публикация `ended` или delegate 026 (scar) |

State machine стадий:

```
[s1 → s2 → … → sN] притом:
  - каждый stage: duration_policy_id ticks (модифицировано velocity)
  - branch_policy может переставить очередность (в data, не в схеме кода)
  - после последней стадии → resolution-resolver → ended | scar/transformation (026/033)
```

### 7.2. Поток такта (scope cataclysm)
`scope:cataclysm` → scheduler (280) → stage-tracker (270) → escalation-resolver (260) → resolution-resolver (250) → обычная доставка событий. Эфементные эффекты mid-stage публикуются как `cataclysm.effect_applied` и потребляются 026 (эффекты) и 017 (fleet sailing conditions).

### 7.3. Последовательность: procedural spawn
```
омены 024 / hooks 022: pressure + Δ
→ panic триггер: pressure ≥ ceiling → scheduler: rng.cataclysm.spawn выбирает candidate (procedural пул)
→ scale/zone - target_selector из данных → CataclysmInstance создан
→ cataclysm.triggered (Immediate) → флот 017: sailing_conditions_changed → oil 020/022 (026)
```

### 7.4. Последовательность: направление scripted
```
событие мира (023/024) совпадает с trigger_policy_id
→ CataclysmInstance создаётся → [эквивалентно процедурному запуску от стадии 0]
```

---

## 8. Порты и адаптеры

```ts
export interface ICataclysmContextPort {  // наружу (прочим)
  getActiveByTag(tag: string): readonly { instance_id: string; definition_id: string }[];
  getPressure(): number;
  isStageInstance(instanceOrId: string, stageId: string): boolean;
}
export interface ICataclysmPoliticalOut { // → 023
  applyPoliticalImpact(inst: CataclysmInstance, policyPayload: unknown): void;
}
export interface ICataclysmEconomicOut {  // → 020/022 (закрывается 026)
  publishShock(tag: string, payload: unknown): void;
}
```

Интеграционные точки реквизита:
- **023:** political impact (`political_impact_applied` → cities/rulers);
- **017:** флотов sailing conditions; контрплейные tags (`counterplay_tags`);
- **020/022:** шоки/шрамы (026);
- **028:** companion reaction (`companion_reaction_policy_id`);
- **033:** hidden branch (`hidden_branch_opened`, `player_transformed`);
- **036:** факты эпилога (`survived_global_event`, `caused_cataclysm`, `prevented_cataclysm`, `became_cataclysm`).

---

## 10. Обработка ошибок

`Result<T, CataclysmError>`; `CataclysmError = 'DEFINITION_NOT_FOUND' | 'STAGE_POLICY_NOT_FOUND' | 'ESCALATION_CONTRACT_VIOLATION' | 'SPAWN_POOL_EMPTY' | 'INVALID_INSTANCE_STATE'`. Никогда не бросаем исключения; валидация снимков — damage saving contract.

---

## 11. Критерии приёмки

- **AC01:** живления lifecycle: stage-фиксация детерминирована (seed); 2k тиков — крайне стабильные снепшоты.
- **AC02:** минимум 2 стадии; ветвление через `escalation_policy` — данные.
- **AC03:** 3 источника равноправны: procedural/spawned/scripted производят валидные инстансы (сокрытие одинаковой длялегации).
- **AC04:** resolution_policy: все 4 kind + комбинации программиругого результата через данные (тестированный гравокств любого kind).
- **AC05:** pressure: растёт от всех 3 каналов (omens/hooks/политический стресс) и потолок обрезает; срабатывает spawn при превышении.
- **AC06 (SPEC-CATA-090):** 6 катаклизмов первой волны валидируются; все 4 архетипа покрыты.
- **AC07 (SPEC-CATA-100):** вертикальный срез: 4 каталоков + мосты economy/fleet — интеграционный тест зелёный.
- **AC08:** memento: активные — full snapshots; журнал — append; валидация по схеме.
- **AC09:** события сокрытия и delivery policy соблюдаются через конвейер 007 (Immediate/NextTick/AfterScene).
- **AC10 (CI):** schemas + graph (все ссылки на mechanics/events/doctrines/scars exist && role_tags ⊇ cataclysm), gameplay lint (≥1 контрплей, ≥2 канала delivery, мост в другой домен — обязательны).

---

## 12. Тест-план
unit: scheduler, stage, escalation, resolution — по тесту на механику + тест pressure API.
integration: `cataclysm-world-political.test.ts` (023), `cataclysm-economy-shocks.test.ts` (020/022/026), `cataclysm-fleet-conditions.test.ts` (017).
contract: `cataclysm.schema.test.ts`, events payload, journal schema.
determinism: 5 k тиков × 2 прогона — идентичные журнал+снимки; save/load — продолжение идентично.

---

## 13. Производительность
Активные катаклизмы — единицы; стоимость такта O(A×Trackers); давление-очередь — O(log n); < 0.5 мс бюджет. Ограничение max active instances — конфиг (default 6).

---

## 14. Миграции
Новая подсистема — нет миграций; снимки v1; журнал — append-only.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокер? | Решение / статус |
|---|---|---|---|
| Q-01 | Пул procedural катаклизмов при low-pressure невозможность | нет | `spawn_pool` может быть пуст → SP(x)... `SPAWN_POOL_EMPTY` — валидный no-op |
| Q-02 | Кто счётчик давления держит | нет | `cataclysm-scheduler-tracker` (active state) — API `ChangeCataclysmPressure` use case |
| Q-03 | Player-as-cataclysm: с какой стадии | нет | Хук от 033;instance-level событие `player_transformed` — контракт здесь |

---

## 16. Что остаётся вне scope
Эффекты/шрамы (026); «реак,vfx/музыкальная реализация каналов (011/015/034);battle-напарники (027/028); hidden branch логика (033); баланс; тексты.

Контент первой волны (SPEC-CATA-090/091): `natural-storm-archipelago`, `arcane-leyline-rupture`, `industrial-smog-blanket`, `metaphysical-reality-tear`, `necromantic-plague-tide`, `player-ascension-catalyst` — полный перечень скелетов в DESIGN §8 и переносится 1:1 в пакеты контента.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест |
|---|---|---|---|
| SPEC-CATA-001/002/003 | archetypes/sources/scale | AC03, AC06 | content tests |
| SPEC-CATA-004/005/006 | stages/escalation | AC02 | stage tracker tests |
| SPEC-CATA-007 | resolutions | AC04 | resolution tests |
| SPEC-CATA-019/020/050–052 | events & bridges | AC09 | event delivery + bridge tests |
| SPEC-CATA-021 | RNG-потоки | AC01 | stream isolation tests |
| SPEC-CATA-022/070/071 | memento + журнал | AC08 | save/load tests |
| SPEC-CATA-080–083 | schema+graph+lint | AC10 | ci validate |
| SPEC-CATA-090/100 | первая волна/вертикальный срез | AC06/AC07 | integration |
