# DEV-SPEC-033 v1.0 — «Hidden Branches / Transformation»

**Тип документа:** Спецификация к разработке
**Дата:** 2026-11-15
**Статус:** draft
**Волна:** Wave 6 (Captain, Narrative, Hidden Branches), второй блок
**Зависит от:** `DEV-SPEC-001…008`, `DEV-SPEC-032`, `DEV-SPEC-025`, `DEV-SPEC-026`
**Блокирует:** `DEV-SPEC-034`, `DEV-SPEC-036`, `DEV-SPEC-037`, `DEV-SPEC-039`
**Основана на:** `DESIGN v1.0 — «Скрытые ветки трансформации»` (SPEC-TRANS-001…015, 020…026, 030…032, 040/041, 050/051, 060…063, 070/071, 080)
**Связанные DEV-SPEC:** `DEV-SPEC-017` (механики фракций), `DEV-SPEC-023/024` (world-события), `DEV-SPEC-025/026` (катаклизмы), `DEV-SPEC-027` (реакции напарников), `DEV-SPEC-028` (`legacy_transform_unlocked`), `DEV-SPEC-032` (капитан), `DEV-SPEC-036` (факты эпилога), `DEV-SPEC-037` (мета-угроза)
**Порождает веху:** `TICKETS-M28`

---

## 0. Как читать эту спеку

Спека владеет **только логикой трансформации капитана**. Состояние капитана, корабля, отряда и экономики не принадлежит ей (SPEC-TRANS-001/002). Триггеры — только прямые последствия катаклизмов, мировых событий и наследия напарников; фоновых трекеров «скверны» нет (SPEC-TRANS-003).

---

## 1. Назначение и границы

### 1.1. Что спецификация делает

- **`TransformationBranchDefinition`**: ветка трансформации (триггер, древо, узлы, механики, факты эпилога, мета-слой);
- **`TransformationNodeDefinition`**: модульный узел-мутация (`mutation` / `state` / `final`) с тегами комбинации, уязвимости и контрплея;
- **`TransformationTreeDefinition`**: древо состояний с переходами и финальными состояниями;
- **`TransformationTriggerDefinition`**: источники триггера (`cataclysm.*`, `world.event_occurred`, `companion.legacy_transform_unlocked`) и условия;
- **`CaptainTransformationInstance`**: рантайм активных/завершённых веток, узлов, состояния и журнала;
- **резолверы и трекеры** трансформации на общем контракте `MechanicDefinition`;
- **события** `hidden_branch.*` (9 ядерных тем) + фракционные namespace'ы;
- **RNG**: изолированные потоки `rng.transformation.*`;
- **сохранения**: снимок трансформации + журнал;
- **CI**: schema + graph + gameplay lint;
- **демо** `demo:m28`.

### 1.2. Что спецификация НЕ делает

- Не владеет состоянием капитана → `DEV-SPEC-032`.
- Не порождает катаклизмы и мировые события → `DEV-SPEC-024/025`.
- Не реализует наследие напарников → `DEV-SPEC-028` (только потребляет `companion.legacy_transform_unlocked`).
- Не реализует диалоги и симптомы как сцены → `DEV-SPEC-034` (здесь — декларация симптомов и доставка).
- Не генерирует эпилог → `DEV-SPEC-036`; не реализует мета-угрозу следующего забега → `DEV-SPEC-037`.
- Не содержит числовой баланс, тексты, арт/VFX/аудио.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождения |
|---|---|---|
| `SPEC-TRANS-001` (границы контекста) | §1.1/§1.2, R01 | нет |
| `SPEC-TRANS-002` (только капитан) | §5.5, R01 | нет |
| `SPEC-TRANS-003` (событийные триггеры) | §5.4, §7.1, R02 | нет |
| `SPEC-TRANS-004` (древо состояний) | §5.3, R03 | нет |
| `SPEC-TRANS-005` (модификация механиками) | §6.1, R04 | нет |
| `SPEC-TRANS-006` (4 канала доставки) | §6.3, R07 | нет |
| `SPEC-TRANS-007` (EpilogueFactPort) | §9.3, R08 | нет |
| `SPEC-TRANS-008` (мета-слой эпилога) | §5.1, §9.3 | нет |
| `SPEC-TRANS-009` (модульные узлы) | §5.2, §7.5, R05 | нет |
| `SPEC-TRANS-010` (переиспользование механик) | §6.1, R04 | нет |
| `SPEC-TRANS-011` (события) | §6.4, R06 | нет |
| `SPEC-TRANS-012` (RNG) | §7.4, R09 | нет |
| `SPEC-TRANS-013` (снимки) | §5.5, R10 | нет |
| `SPEC-TRANS-014` (CI) | §12.6, R11 | нет |
| `SPEC-TRANS-015` (масштаб) | §6.5, R12 | нет |
| `SPEC-TRANS-020…026` (контракты) | §5, §6 | нет |
| `SPEC-TRANS-030/031` (ядро и расширения) | §6.4 | нет |
| `SPEC-TRANS-032` (мосты) | §9.3 | нет |
| `SPEC-TRANS-040/041` (детерминизм) | §7.4 | нет |
| `SPEC-TRANS-050/051` (снимки) | §5.5, §14 | нет |
| `SPEC-TRANS-060…063` (валидация) | §12.6 | нет |
| `SPEC-TRANS-070/071` (скелеты) | §6.5 | нет |
| `SPEC-TRANS-080` (срез) | §11 R13 | нет |

**Расхождения:** в DESIGN-таблицах событий встречаются смешанные snake_case/kebab-case имена (`hidden_branch.trigger_evaluated` и «финальный状态»). Нормативно: все топики — `hidden_branch.<kebab-case>` (OQ-01).

---

## 2. Зависимости

### 2.1. Обязательные

| Спека | Контракт |
|---|---|
| `DEV-SPEC-001…008` | примитивы, события, контент, механики, RNG, save, clock, CI |
| `DEV-SPEC-032` | `CaptainInstance`, `ICaptainStatePort` |
| `DEV-SPEC-025` | `cataclysm.hidden_branch_opened`, `cataclysm.effect_applied` |
| `DEV-SPEC-026` | эффекты стадий, шрамы (симптомы) |

### 2.2. Мягкие

`DEV-SPEC-017` (фракционные механики), `DEV-SPEC-024` (`world.event_occurred`), `DEV-SPEC-027` (реакции напарников), `DEV-SPEC-028` (`legacy_transform_unlocked`), `DEV-SPEC-034` (симптомы как сцены), `DEV-SPEC-036/037` (эпилог и мета-слой).

### 2.3. Внешние

Новых зависимостей нет. Запрет `Math.random`/`Date.now` в `src/domain/transformation/**`, `src/application/transformation/**`.

---

## 3. Термины

| Термин | Определение |
|---|---|
| Branch | Ветка трансформации капитана с триггером, древом и финалами |
| Node | Модульный узел-мутация, комбинируемый с другими |
| Tree | Древо состояний ветки с переходами и финалами |
| Trigger Source | Событие-источник активации ветки |
| Symptom | Нарративный признак трансформации, доставляемый 4 каналами |
| Meta Epilogue | Мета-слой эпилога: капитан как угроза следующего забега |
| Final State | Терминальное состояние ветки, публикующее факт эпилога |

---

## 4. Архитектурное размещение

### 4.1. Слои

- `src/domain/transformation/` — определения, рантайм, модели (`TreeModel`, `NodeModel`, `TriggerModel`), ошибки, порты.
- `src/application/transformation/` — use cases.
- `src/infrastructure/transformation/` — store, трекеры/резолверы, event-handlers, memento.
- `content/{transformationBranch,transformationNode,transformationTree,transformationTrigger,transformationPolicy}/`, `content/mechanics/transformation.json`.
- `tools/ci/stages/validate-transformation-graph.ts`, `validate-transformation-lint.ts`.

### 4.2. Файлы

```text
src/domain/transformation/
  TransformationBranchDefinition.ts
  TransformationNodeDefinition.ts
  TransformationTreeDefinition.ts
  TransformationTriggerDefinition.ts
  CaptainTransformationInstance.ts
  TransformationErrors.ts
  TreeModel.ts
  NodeModel.ts
  TriggerModel.ts
  ICaptainTransformationPort.ts
  ICompanionLegacyPort.ts
src/application/transformation/
  EvaluateTransformationTrigger.ts
  ActivateBranch.ts
  TransitionBranchState.ts
  ActivateNode.ts
  CombineNodes.ts
  GetTransformationState.ts
src/infrastructure/transformation/
  TransformationStore.ts
  TransformationTickHandlers.ts
  TransformationEventHandler.ts
  TransformationStateMementoProvider.ts
  NullCompanionLegacyPort.ts
content/schemas/
  transformation-branch.json
  transformation-node.json
  transformation-tree.json
  transformation-trigger.json
  captain-transformation-state.json
content/transformationBranch/core.json
content/transformationNode/core.json
content/transformationTree/core.json
content/transformationTrigger/core.json
content/mechanics/transformation.json
tools/ci/stages/validate-transformation-graph.ts
tools/ci/stages/validate-transformation-lint.ts
test/transformation/…
scripts/demo-m28.ts
```

### 4.3. DI

| Токен | Реализация | Жизненный цикл | Стадия |
|---|---|---|---|
| `ITransformationStore` | `TransformationStore` | singleton | `domain-init` |
| `ICaptainTransformationPort` | адаптер к 032 | singleton | `integration` |
| `ICompanionLegacyPort` | `NullCompanionLegacyPort` (замена в 028) | singleton | `integration` |
| `IMementoProvider('transformation')` | `TransformationStateMementoProvider` | singleton | `save-composition` |
| `transformation-*` механики | `MechanicRegistry` | — | `mechanics` |

---

## 5. Domain-модель

### 5.1. TransformationBranchDefinition

```ts
export interface TransformationBranchDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly trigger_policy_id: string;
  readonly tree_policy_id: string;
  readonly mechanic_ids: readonly string[];
  readonly node_ids: readonly string[];
  readonly combination_policy_id: string;
  readonly epilogue_fact_policy_id: string;
  readonly meta_epilogue_policy_id: string;
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `TRANS-INV-01` — `trigger_policy_id` и `tree_policy_id` обязательны и разрешаются; `TRANS-INV-02` — все `node_ids` существуют; `TRANS-INV-03` — ветка не хранит рантайм.

### 5.2. TransformationNodeDefinition

```ts
export type NodeType = 'mutation' | 'state' | 'final';

export interface TransformationNodeDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly description_key: string;
  readonly node_type: NodeType;
  readonly effect_tags: readonly string[];        // ≥1
  readonly mechanic_ids: readonly string[];
  readonly combination_tags: readonly string[];
  readonly vulnerability_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
}
```

Инварианты: `TRANS-INV-04` — `effect_tags.length ≥ 1`; `TRANS-INV-05` — `node_type` ∈ 3 нормативных.

### 5.3. TransformationTreeDefinition

```ts
export interface TransformationStateDef {
  readonly id: string;
  readonly display_name_key: string;
  readonly entry_conditions_policy_id: string;
  readonly exit_conditions_policy_id: string | null;
  readonly symptoms_policy_id: string;
  readonly is_final: boolean;
  readonly epilogue_fact?: string;
}

export interface TransformationTransition {
  readonly from_state_id: string;
  readonly to_state_id: string;
  readonly condition_policy_id: string;
}

export interface TransformationTreeDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly states: readonly TransformationStateDef[];
  readonly transitions: readonly TransformationTransition[];
}
```

Инварианты: `TRANS-INV-06` — `states.length ≥ 2`; `TRANS-INV-07` — ≥1 `is_final=true`; `TRANS-INV-08` — каждый переход ссылается на существующие состояния; `TRANS-INV-09` — из любого состояния достижим ≥1 финал.

### 5.4. TransformationTriggerDefinition

```ts
export interface TransformationTriggerSource {
  readonly event_id: string;
  readonly condition_policy_id: string;
  readonly event_filter_tags?: readonly string[];
}

export interface TransformationTriggerDefinition {
  readonly id: string;
  readonly display_name_key: string;
  readonly trigger_sources: readonly TransformationTriggerSource[];   // ≥1
  readonly activation_policy_id: string;
}
```

Инварианты: `TRANS-INV-10` — `event_id` ∈ {`cataclysm.*`, `world.event_occurred`, `companion.legacy_transform_unlocked`}; `TRANS-INV-11` — все события зарегистрированы.

### 5.5. CaptainTransformationInstance

```ts
export interface ActiveBranch {
  readonly branch_id: string;
  readonly current_state_id: string;
  readonly activated_tick: number;
  readonly active_nodes: readonly string[];
  readonly active_tracker_states: Readonly<Record<string, unknown>>;
}

export interface CompletedBranch {
  readonly branch_id: string;
  readonly final_state_id: string;
  readonly completed_tick: number;
  readonly epilogue_facts: readonly string[];
}

export interface CaptainTransformationInstance {
  readonly captain_id: string;
  readonly active_branches: readonly ActiveBranch[];
  readonly completed_branches: readonly CompletedBranch[];
  readonly meta_epilogue_unlocked: boolean;
  readonly journal: readonly TransformationJournalEntry[];
}
```

Инварианты: `TRANS-INV-12` — одна ветка не может быть одновременно активной и завершённой; `TRANS-INV-13` — завершённая ветка терминальна; `TRANS-INV-14` — журнал монотонен по `(tick, seq)`.

---

## 6. Data-контракты и схемы

### 6.1. Механики

| id | kind | scope | priority | consumes | emits | state_schema |
|---|---|---|---|---|---|---|
| `transformation-trigger-resolver` | resolver | captain | 240 | `cataclysm.hidden_branch_opened`, `world.event_occurred`, `companion.legacy_transform_unlocked` | `hidden_branch.trigger_evaluated` | `null` |
| `transformation-arcane-corruption-tracker` | tracker | captain | 90 | `world.tick_advanced`, `cataclysm.effect_applied` | `hidden_branch.corruption_increased`, `hidden_branch.state_transition_ready` | `{ corruption_level, active_nodes }` |
| `transformation-arcane-resonance-resolver` | resolver | captain | 100 | `combat.duel_action_executed`, `world.tick_advanced` | `hidden_branch.arcane_resonance_applied` | `null` |
| `transformation-symptom-tracker` | tracker | captain | 80 | `hidden_branch.state_transitioned`, `hidden_branch.node_activated` | `hidden_branch.symptom_triggered` | `{ symptom_ids }` |
| `transformation-meta-unlock-resolver` | resolver | captain | 70 | `hidden_branch.final_state_reached` | `hidden_branch.meta_epilogue_unlocked` | `null` |

### 6.2. JSON Schema

- `transformation-branch.json` — `trigger_policy_id`/`tree_policy_id` required; `node_ids` minItems 1; `counterplay_tags` minItems 1.
- `transformation-node.json` — `node_type` enum 3; `effect_tags` minItems 1.
- `transformation-tree.json` — `states` minItems 2; `transitions` minItems 1; if/then: `is_final` ⇒ `epilogue_fact` required.
- `transformation-trigger.json` — `trigger_sources` minItems 1; `event_id` pattern topic.
- `captain-transformation-state.json` — `active_branches`, `completed_branches`, `journal` items required [event_id, tick]; `additionalProperties: false`.

### 6.3. Политики

`trigger_policy_id`, `tree_policy_id`, `combination_policy_id`, `epilogue_fact_policy_id`, `meta_epilogue_policy_id`, `delivery_policy_id` (4 канала), `symptoms_policy_id`. Все числа — в контенте; в игре нет прогресс-баров и точных цифр (SPEC-TRANS-006).

### 6.4. События

Ядро (9): `hidden_branch.trigger_evaluated`, `hidden_branch.activated`, `hidden_branch.state_transitioned`, `hidden_branch.node_activated`, `hidden_branch.node_deactivated`, `hidden_branch.combination_formed`, `hidden_branch.final_state_reached`, `hidden_branch.meta_epilogue_unlocked`, `hidden_branch.symptom_triggered`.

Фракционные: `hidden_branch.industrial-steam.*`, `hidden_branch.ancient-arcane.*`, `hidden_branch.necromantic-corpse.*`, `hidden_branch.living-artifact.*`.

### 6.5. Контент первой волны

5 базовых узлов (`mutation-node-arcane-saturation`, `mutation-node-arcane-mastery`, `mutation-node-machine-integration`, `mutation-node-necrotic-communion`, `mutation-node-artifact-symbiosis`), 3 ветки (`arcane-path`, `industrial-path`, `necrotic-path`) с полным циклом «пробуждение → мастерство/падение».

---

## 7. Рантайм-поведение

### 7.1. State machines

**(a) Триггер → активация**

```
[dormant] --trigger_event--> [evaluating]
[evaluating] --condition ok--> [activated] + emit activated
[evaluating] --condition false--> [dormant] + emit trigger_evaluated{result:false}
```

**(b) Древо**

```
[state(n)] --transition_condition--> [state(n+1)] + emit state_transitioned
[state(n)] --is_final--> [final] + emit final_state_reached + fact
[final] --meta_policy--> [meta_unlocked] + emit meta_epilogue_unlocked
```

**(c) Узлы**

```
[inactive] --activate_node--> [active] + emit node_activated
[active] --combination_ok--> [combined] + emit combination_formed
[active] --deactivate_node--> [inactive] + emit node_deactivated
```

### 7.2. Sequence: активация ветки

```
cataclysm.hidden_branch_opened{branch_hint}
  → transformation-trigger-resolver: match trigger_sources
  → EvaluateTransformationTrigger{branch_id}
      → ICaptainTransformationPort.captainId() → Ok
      → condition_policy → Ok
      → emit hidden_branch.trigger_evaluated
  → ActivateBranch{branch_id} → active_branches += {branch_id, state='state-awakening'}
  → emit hidden_branch.activated
  → IEpilogueFactPort.publish('epilogue.transformation.arcane_awakened')
```

### 7.3. Tick-контракт

`scope:captain` (032) — трекеры трансформации идут с priority §6.1 после капитана. Пропуск фазы допускается только для симптомов с детерминированным догоном; переходы состояний — никогда.

### 7.4. Идемпотентность и детерминизм

Потоки: `rng.transformation.trigger` (оценка неоднозначных условий), `rng.transformation.node_combination` (выбор при нескольких совместимых), `rng.transformation.symptom` (какой симптом проявится). Смешение запрещено. Повторная оценка того же триггера в том же такте игнорируется.

### 7.5. Комбинация узлов

```
combine(active_nodes, policy):
  candidates = pairs where tagsCompatible(a, b, policy)
  if candidates.empty: return Ok([])
  chosen = policy.deterministic ? candidates[0] : pickOne(rng.transformation.node_combination, candidates)
  return Ok([{combination_id: policy.idOf(chosen), nodes: chosen}])
```

Сложность O(n²) по активным узлам (n ≤ 10).

---

## 8. Порты и адаптеры

### 8.1. Порты

```ts
// owner: 033; impl: 032
export interface ICaptainTransformationPort {
  captainId(): Result<string, AppError>;
  isRetired(captainId: string): Result<boolean, AppError>;
  applyTransformationTags(captainId: string, tags: readonly string[]): Result<void, AppError>;
}

// owner: 033; impl: 028
export interface ICompanionLegacyPort {
  legacyBranchUnlocks(captainId: string): Result<readonly string[], AppError>;
}
```

### 8.2. Адаптеры

`NullCompanionLegacyPort` (`Ok([])`), `TransformationStateMementoProvider`.

### 8.3. Ошибки

| Код | Условие | recoverable |
|---|---|---|
| `DOMAIN_TRANS_BRANCH_UNKNOWN` | ветка не найдена | да |
| `DOMAIN_TRANS_TRIGGER_NOT_MET` | условия триггера не выполнены | да |
| `DOMAIN_TRANS_TREE_INVALID` | нет финала/битый переход | нет |
| `DOMAIN_TRANS_STATE_UNREACHABLE` | целевое состояние недостижимо | нет |
| `DOMAIN_TRANS_NODE_INCOMPATIBLE` | узлы несовместимы | да |
| `DOMAIN_TRANS_CAPTAIN_RETIRED` | капитан на пенсии | да |
| `INFRA_TRANS_SCHEMA_INVALID` | контент/снимок не проходит схему | нет |

---

## 9. Интеграционные точки

### 9.1. Потребляемые

`cataclysm.hidden_branch_opened`, `cataclysm.effect_applied`, `world.event_occurred`, `companion.legacy_transform_unlocked`, `world.tick_advanced`.

### 9.2. Эмитируемые

Темы §6.4. Consumers: 027 (реакции напарников), 032 (теги капитана), 034 (симптомы как сцены), 036 (факты), 037 (мета-угроза).

### 9.3. Мосты

`hidden_branch.activated → 034 (narrative.scene_requested)`; `hidden_branch.symptom_triggered → 011/015 (визуал/аудио)`; `hidden_branch.final_state_reached → 036 (epilogue.transformation.*)`; `hidden_branch.meta_epilogue_unlocked → 037`.

### 9.4. Use cases

| Use case | Вход | Выход | Порты | События |
|---|---|---|---|---|
| `EvaluateTransformationTrigger` | `{branch_id, source_topic, payload}` | `{met}` | Captain, Legacy | `trigger_evaluated` |
| `ActivateBranch` | `{captain_id, branch_id}` | `{state_id}` | Captain | `activated` |
| `TransitionBranchState` | `{captain_id, branch_id, to_state}` | `{state_id}` | Captain | `state_transitioned` |
| `ActivateNode` | `{captain_id, branch_id, node_id}` | `{active_nodes}` | — | `node_activated` |
| `CombineNodes` | `{captain_id, branch_id}` | `{combinations}` | — | `combination_formed` |
| `GetTransformationState` | `{captain_id}` | снимок | — | — |

---

## 10. Обработка ошибок

| Слой | Отказ | Код | Действие |
|---|---|---|---|
| content | схема | `INFRA_TRANS_SCHEMA_INVALID` | fail-fast bootstrap |
| domain | древо без финала | `DOMAIN_TRANS_TREE_INVALID` | падение загрузки контента |
| domain | несовместимые узлы | `DOMAIN_TRANS_NODE_INCOMPATIBLE` | `Err`, набор не меняется |
| application | капитан на пенсии | `DOMAIN_TRANS_CAPTAIN_RETIRED` | `Err` |
| save | снимок невалиден | `INFRA_TRANS_SCHEMA_INVALID` | reject load |

---

## 11. Критерии приёмки

### DEV-SPEC-033-R01 — Границы контекста
Требование: спека владеет только трансформацией; капитан/корабль/отряд — внешние.
Invariant: TRANS-INV-01…03.

- AC01: Given `src/domain/transformation/**`, When CI-grep, Then нет импортов `domain/party`, `domain/fleet`, `domain/economy` (кроме портов).
- AC02: Given попытка записать статы капитана из 033, When ревью/CI, Then нарушение (только `applyTransformationTags`).

### DEV-SPEC-033-R02 — Событийные триггеры
Требование: триггеры только от `cataclysm.*`, `world.event_occurred`, `companion.legacy_transform_unlocked`; фоновых трекеров нет.
Invariant: TRANS-INV-10/11.

- AC03: Given `cataclysm.hidden_branch_opened`, When условие выполнено, Then `hidden_branch.trigger_evaluated{result:true}` и `activated`.
- AC04: Given источник `economy.price_shock`, When `ci:validate --stage=graph`, Then ошибка (недопустимый источник).

### DEV-SPEC-033-R03 — Древо состояний
Требование: ≥2 состояний, ≥1 финал, переходы только по условиям.
Invariant: TRANS-INV-06…09.

- AC05: Given `state-awakening` и условие mastery, When `TransitionBranchState`, Then `state_transitioned` и `current_state_id='state-mastery'`.
- AC06: Given древо без финального состояния, When `ci:validate`, Then `DOMAIN_TRANS_TREE_INVALID`.

### DEV-SPEC-033-R04 — Механики
Требование: контракт 004; `role_tags ∋ 'transformation'`; tracker персистит.
Invariant: —

- AC07: Given `transformation-arcane-corruption-tracker`, When `--stage=mechanics`, Then `persisted=true` и `state_schema` есть.
- AC08: Given резолвер со `state_schema`, When CI, Then ошибка.

### DEV-SPEC-033-R05 — Модульные узлы
Требование: узлы комбинируются по политике; несовместимые — отклоняются.
Invariant: TRANS-INV-04/05.

- AC09: Given два совместимых узла, When `CombineNodes`, Then `hidden_branch.combination_formed`.
- AC10: Given несовместимые теги, When `CombineNodes`, Then `Err(DOMAIN_TRANS_NODE_INCOMPATIBLE)`.

### DEV-SPEC-033-R06 — События
Требование: 9 ядерных тем зарегистрированы; фракционные без коллизий.

- AC11: Given перечень §6.4, When `--stage=events`, Then все темы присутствуют.

### DEV-SPEC-033-R07 — Доставка симптомов
Требование: симптомы доставляются 4 каналами; прогресс-баров нет.
Invariant: —

- AC12: Given `state_transitioned`, When симптом, Then `hidden_branch.symptom_triggered` и политика доставки содержит ≥4 канала.
- AC13: Given политика с <4 каналами, When gameplay lint, Then ошибка.

### DEV-SPEC-033-R08 — Эпилог и мета-слой
Требование: финал публикует факт; мета-слой разблокируется политикой.

- AC14: Given `final_state_reached`, When финал, Then факт в `IEpilogueFactPort` и `hidden_branch.final_state_reached`.

### DEV-SPEC-033-R09 — RNG и сохранения
Требование: 3 потока `rng.transformation.*`; снимок валидируется.

- AC15: Given save→load, When продолжение, Then deep-equal и идентичный переход.
- AC16: Given fixture-прогон, When `--stage=rng-streams`, Then используются только разрешённые потоки.

### DEV-SPEC-033-R10 — CI
Требование: schema + graph + lint.

- AC17: Given negative-fixtures (древо без финала, недопустимый источник, узел без тегов, дубль ID), When `ci:validate`, Then каждая даёт ожидаемую ошибку.

### DEV-SPEC-033-R11 — Контент и срез
Требование: 5 узлов, 3 ветки, сценарий SPEC-TRANS-080 как `demo:m28`.

- AC18: Given `bun run demo:m28`, When завершение, Then `Ok`: триггер → активация → переход → узел → финал → save/load → идентичное состояние.

---

## 12. Тест-план

12.1 Unit: T01 схемы; T02 `TreeModel` (достижимость, финалы); T03 `NodeModel` (комбинации); T04 `TriggerModel`.
12.2 Integration: T05 use cases + recording bus; T06 мосты 025/028/032.
12.3 Contract: T07 определения против схем; T08 события.
12.4 Determinism: T09 save/load + RNG-изоляция.
12.5 E2E: T10 `demo:m28`.
12.6 CI: T11 graph; T12 lint.

---

## 13. Производительность

### 13.1. Бюджет
Триггер — O(sources); переход — O(states+transitions); комбинация — O(n²), n ≤ 10. Фаза `scope:captain`.

### 13.2. LOD
Симптомы могут батчиться; переходы и финалы — никогда.

### 13.3. Профилирование
Счётчики `hidden_branch.*`; сценарий: 3 ветки × 10 узлов × 500 тактов.

---

## 14. Миграции

`captain-transformation-state.json` v1; breaking — только через major bump save-формата.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокирует | Кому | Дедлайн |
|---|---|---|---|---|
| OQ-01 | Единый формат топиков `hidden_branch.*` (kebab-case) | R06 | arch | до M28 |
| OQ-02 | Может ли капитан иметь ≥2 активные ветки одновременно | R03 | design | до M28 |
| OQ-03 | Формат условий перехода (DSL или теги) | R03 | arch | до M28 |

---

## 16. Что остаётся вне scope

- Состояние капитана → `DEV-SPEC-032`.
- Катаклизмы и мировые события → `DEV-SPEC-024/025`.
- Реакции напарников → `DEV-SPEC-027/028`.
- Диалоги и симптомы как сцены → `DEV-SPEC-034`.
- Эпилог и мета-угроза → `DEV-SPEC-036/037`.
- Баланс, тексты, арт/VFX/аудио.

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест | TKT (M28) |
|---|---|---|---|---|
| SPEC-TRANS-001/002 | R01 | AC01,AC02 | T05 | M28-001 |
| SPEC-TRANS-003/024 | R02 | AC03,AC04 | T04,T05 | M28-002 |
| SPEC-TRANS-004/023 | R03 | AC05,AC06 | T02,T05 | M28-003 |
| SPEC-TRANS-005/010/025 | R04 | AC07,AC08 | T07 | M28-004 |
| SPEC-TRANS-009/022 | R05 | AC09,AC10 | T03 | M28-005 |
| SPEC-TRANS-011/030/031 | R06 | AC11 | T08 | M28-006 |
| SPEC-TRANS-006 | R07 | AC12,AC13 | T12 | M28-007 |
| SPEC-TRANS-007/008 | R08 | AC14 | T06 | M28-008 |
| SPEC-TRANS-012/013/040/041/050/051 | R09 | AC15,AC16 | T09 | M28-009 |
| SPEC-TRANS-014/060…063 | R10 | AC17 | T11,T12 | M28-010 |
| SPEC-TRANS-015/070/071/080 | R11 | AC18 | T10 | M28-011 |

Итог декомпозиции: 11 тикетов `TKT-M28-001…011`, демо `demo:m28`.

---

## Приложение A. Чек-лист DoD

- ✅ секции 1–17; ✅ интерфейсы (§5); ✅ схемы (§6.2); ✅ state machines (§7.1); ✅ порты (§8); ✅ `Result` (§8.3, §10); ✅ R01…R11 → AC01…AC18; ✅ тест-план (§12); ✅ файлы (§4.2); ✅ зависимости (§2); ✅ OQ (§15); ✅ трассировка (§1.3/§17).
