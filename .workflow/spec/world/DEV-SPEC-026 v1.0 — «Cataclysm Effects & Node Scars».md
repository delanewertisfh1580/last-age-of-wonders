# DEV-SPEC-026 v1.0 — «Cataclysm Effects & Node Scars»

**Тип документа:** Спецификация к разработке  
**Дата:** 2026-11-04  
**Статус:** draft  
**Волна:** Wave 4 (World & Cataclysms, четвёртая — после DEV-SPEC-025, финальная в волне)  
**Зависит от:** `DEV-SPEC-025` (stage/effect события, `CataclysmInstance`, policies), `DEV-SPEC-023` (PoliticalMapState как мишень), `DEV-SPEC-020` (рыночные модификаторы `economy.price_changed`, схемы цен 020), `DEV-SPEC-022` (`NodeScarDefinition` — переносится из экономики в свой контент-пакет, экономические шоки), `DEV-SPEC-001…007`  
**Блокирует:** `DEV-SPEC-033` (шрамы-причины hidden branch: шок-состояния мира), `DEV-SPEC-034` (лорный слой «шрамов ландшафта»), `DEV-SPEC-036/037` (факты о разрушении узлов), `DEV-SPEC-039`  
**Основана на:** `DESIGN v1.0 — «Катаклизмы»` (SPEC-CATA-008…016, 044…045, 052, 072, 077…029), `DESIGN v1.0 — «Экономика»` (SPEC-ECON-038, 072 — контракты шрамов и шоков), `INTENT v1.0` (INT-14, INT-15), `GENERAL DESIGN v1.0` (GD-04, GD-07/08, GD-17)  
**Связанные DEV-SPEC:** `DEV-SPEC-020/022` — потребители события `economy.scar_applied`; `DEV-SPEC-017` — sailing conditions и урон от катаклизма; `DEV-SPEC-027/028` — panic-реакции напарников/отряда.

---

## 1. Назначение и границы

### 1.1. Что спецификация делает
Определяет применение последствий катаклизмов к состоянию мира:

1. **Эффекты стадий** — `effect_policy` стадии 025 разворачивается в декларативный набор действий: локальные рыночные шоки (`economy.price_changed`), продовольственные дефициты, блокады (022), sailing conditions (017), панели урона (029), fantasy-reactions (027/028);
2. **Персистентные шрамы** — `NodeScarDefinition` из 022 подносится из economy-пакета и расширяется: шрамы на города/узлы/корабли/фракции, политика длительности (`duration_policy`, `removable_by`), контрплейные теги;
3. **Необратимость** — гибрид «восстановимые эффекты» vs «шрамы до явного снятия» (SPEC-CATA-008);
4. **Фракционная асимметрия** — интерфейс и реализация `CataclysmDoctrineDefinition` (уязвимости, бонусы, interaction_modes: feast | channel | contain | blend), взаимодействие фракций;
5. **Нарративный контракт** — delivery-каналы и факты (`survived_global_event`, `prevented_cataclysm` и т.д.).

### 1.2. Что спецификация НЕ делает
Не считает lifecycle (025), не решаетPoliticalMapState (023 — только публикуется `political_impact_applied`), не рисует VFX/шейдеры (011/012 — контракты каналов), неoralizes музыку (015), не реализует hidden branch (033), не балансирует числа.

### 1.3. Связь с DESIGN

| DESIGN-блок | Реализация | Расхождение |
|---|---|---|
| SPEC-CATA-008 | recoverable effects + NodeScar | нет |
| SPEC-CATA-009 | political impact декларативен | нет |
| SPEC-CATA-010 | economy шоки через мост | нет |
| SPEC-CATA-011 | fleet: sailing + ship damage | нет |
| SPEC-CATA-013 | путь player-cataclysm — hook-контракт | нет |
| SPEC-CATA-014 | 4 канала доставки обязательны | нет |
| SPEC-CATA-015/016 | doctrine: vulnerability/bonus/interaction | нет |
| SPEC-CATA-044/045 | doctrine/quest-template схемы | нет |
| SPEC-CATA-052 | мосты economy/fleet/narrative/companions | нет |
| SPEC-ECON-038/072 | NodeScarDefinition + duration/removable | нет |

---

## 2. Зависимости

### 2.1. Обязательные
- `DEV-SPEC-025` — события стадий/эффектов; `CataclysmInstance`; policies;
- `DEV-SPEC-023` — города/узлы как targets; publish `political_impact_applied`;
- `DEV-SPEC-020` — рыночные модификаторы (`price_modifier` договора 020), `MarketState` пересчёт;
- `DEV-SPEC-022` — `NodeScarDefinition` (переносится в content-kinded класс), экономические шок-события, `cataclysm_pressure` API;
- `DEV-SPEC-001/002/003/004/005/006` — Result; события `cataclysm.scar_*`; ContentKind `node-scar` + `cataclysm-doctrine`; mechanics; `rng.cataclysm.effects`; memento.

### 2.2. Мягкие
- `DEV-SPEC-027/028` — panic/ реакции на шоки (контракт через `companion.reaction_triggered`);
- `DEV-SPEC-029` — урон корабля через `fleet.ship_damaged_by_cataclysm` (мост, реализация 029);
- `DEV-SPEC-033` — hidden branch hooks (`ruined_node`, `scar`-preserved worlds).

### 2.3. Внешние
нет.

---

## 3. Термины

| Термин | Смысл |
|---|---|
| **Эффект стадии** | Действие, применяемое в момент/в течение стадии катаклизма |
| **Шок (shock)** | Кратковременный рыночный/социальный эффект, снимется по таймеру |
| **Шрам (Scar)** | Персистаентный эффект до явного снятия (`removable_by`) |
| **Доктрина катаклизма** | Данные-интерфейс фракции: уязвимости/бонусы/модели взаимодействия |
| **Контрплейный tag** | Декларативный метод борьбы, который другие домены только читают |

---

## 4. Архитектурное размещение

```
src/domain/cataclysm/
  mechanics/
    cataclysm-effect-tracker.ts     # применяет effect_policy стадий; приоритет 240
    node-scar-tracker.ts            # шрамы: жив. цикл, снятие; приоритет 230
    definitions/
  ports:
    ICataclysmEconomicOut.scala impl — публикует шоки/шрамы (025 §8 контракты)
    ICataclysmPoliticalOut impl
src/content/node-scars/    # перенесённые + новые шрамы
src/content/cataclysm-doctrines/
```

ContentKind: `node-scar` (из 022), `cataclysm-doctrine` (025), `cataclysm-quest-template` (045). Пакет вехи: `cataclysm-effects`.

Фазовая привязка: механики scope `cataclysm`, priorities 240/230 — после resolver-блока 025 (280–250), но до `scope:party`. RNG: `rng.cataclysm.effects`.

---

## 5. Domain-модель

### 5.1. Эффекты стадий

```ts
export type EffectAction =
  | { readonly kind: 'market_shock'; readonly node_selector_id: string; readonly price_tag: string }
  | { readonly kind: 'supply_shock'; readonly good_id: string; readonly node_selector_id: string }
  | { readonly kind: 'blockade'; readonly node_selector_id: string }
  | { readonly kind: 'sailing_condition'; readonly region_tag: string; readonly condition_tag: string }
  | { readonly kind: 'party_panic'; readonly intensity_tag: string }
  | { readonly kind: 'ship_damage_zone'; readonly region_tag: string; readonly severity_tag: string }
  | { readonly kind: 'political_impact'; readonly impact_policy_id: string }
  | { readonly kind: 'apply_scar'; readonly scar_ids: readonly string[] };

export interface StageEffectPolicyDefinition { readonly id: string; readonly actions: readonly EffectAction[] }
```

Правила: action — декларация; имя их executing Agent — self (effect-tracker) издали событие или вызывает порт; political impact идёт через 025-bridge (`political_impact_applied` → 023), не напрямую (AC05).

### 5.2. Шрамы (расширение 022-контракта)

```ts
export interface NodeScarDefinition {
  readonly kind: 'node-scar';
  readonly id: string;
  readonly applies_to: 'node' | 'city' | 'faction' | 'ship' | 'world';
  readonly duration_policy: 'permanent' | 'ticks' | 'until_removed';
  readonly removable_by: readonly ('external_intervention' | 'ritual' | 'refit' | 'policy')[];
  readonly effect_tags: readonly string[];
  readonly counterplay_tags: readonly string[];
  readonly economic_hook_ids: readonly string[];   // рыночные модификаторы 020
}
```

Правила:
- шрам накладывается ТОЛЬКО через эффект `apply_scar` (или резолюцию 025 `persistent_scar`);
- `NodeScarInstance` — снимка memento; экономика 020 пересчитывает модификаторы по `economy.scar_applied`;
- снятие — только через порт `IScarRemovalPort` (IL-политика:	active_labour города, external_intervention игрока и т.д.).

### 5.3. Доктрина катаклизма (SPEC-CATA-044)

```ts
export interface CataclysmDoctrineDefinition {
  readonly kind: 'cataclysm-doctrine';
  readonly id: string;
  readonly faction_id: string;
  readonly vulnerability_tags: readonly string[];  // стык с archetype/effect tags
  readonly bonus_tags: readonly string[];
  readonly interaction_modes: readonly ('use' | 'feast' | 'channel' | 'contain' | 'blend')[];
  readonly interaction_policy_id: string;
}
```

Правила:doctrine публикует модификаторы intensity через `cataclysm.faction_interaction_applied`; способ фасимметрии — только события, не прямой вызов в 025 (низкий кластер).

---

## 6. Data-контракты и схемы

- `content/node-scar/no.de-scar.schema.json`;
- `content/cataclysm-doctrine/policy.schema.json`;
- `content/stage-effect-policy/policy.schema.json`;
- `state/node-scar-instance.schema.json`.

Пример шрама:

```json
{
  "id": "scar-leyline-rupture-morgue",
  "applies_to": "node",
  "duration_policy": "permanent",
  "removable_by": ["ritual"],
  "effect_tags": ["magic-disruption"],
  "counterplay_tags": ["ritual-suppression"],
  "economic_hook_ids": ["hook-arcane-goods-scarce"]
}
```

Ядро событий (наследует 6.3 в 025): `cataclysm.effect_applied` `{ instance_id, action }`; `cataclysm.scar_applied` `{ scar_id, target }`; `cataclysm.scar_removed` `{ scar_id, removed_by }`; `cataclysm.political_impact_applied` (эмулирует 023-трактат); delivery — `NextTick`.

---

## 7. Рантайм-поведение

### 7.1. Механики

| ID | kind | priority | persist | Назначение |
|---|---|---|---|---|
| `cataclysm-effect-tracker` | tracker | 240 | да | Применяет `StageEffectPolicy` на `effect_applied`; маршрутизация к портам |
| `node-scar-tracker` | tracker | 230 | да | Жизненный цикл шрамов; снятие по `removable_by`; публикация `scar_*` |

### 7.2. Поток такта (scope cataclysm)
scheduler → stage-tracker (025) → escalation/resolution (025) → **effect-tracker (240)** → **node-scar-tracker (230)**. Timeline: `market_shock` → immediate port `ICataclysmEconomicOut.publishShock` → 020-механика применяется на следующем тике `scope:economy`; `apply_scar` → снимок в memento мира.

### 7.3. Последовательность: arcane rupture (vertical slice)
```
025: stage-peak → effect_policy ruins-stage effects
→ market_shock arcane goods at affected nodes → 020 цены
→ ship_damage_zone (18-25%) → порт fleet
→ political_impact: узел mage-faction → 023 ruler stability decline
→ stage-decay → resolution persistent_scar → apply scar-…-grove (memento + экономика пересчёт)
```

### 7.4. Проверка объявленности (controlling AC)
Все действия effects-специфичны и обращаются к другим доменам только через объявленные порты — прямые вызовы внутренней логики смежных доменов запрещены (INT-06).

---

## 8. Порты и адаптеры

```ts
export interface IScarRemovalPort {
  remove(scar_id: string, by: 'external_intervention' | 'ritual' | 'refit' | 'policy'): boolean;
}
export interface ICataclysmEconomicOutImpl extends ICataclysmEconomicOut { // 025-контракт
  publishScar(scar_id: string): void;
}
export interface ICataclysmHiddenBranchOut { setHiddenBranchSignal(tag: string, ctx: unknown): void } // impl 033
```

---

## 9. Интеграционные точки

- **020:** `market_shock`/шоко-модификаторы, `economy.price_changed`, пересчёт supply;
- **022:** блокады; `cataclysm_pressure` hooks; шрамы уже описаны в 022 — пакет переносится тем же kind;
- **017:** sailing conditions; типовой урон;
- **023:** political impact;
- **027/028:** party panic; companion реакции;
- **033:** hidden branch signals; **036:** факт `ruined_node` (событие из 022) + scars в эпилоге.

---

## 10. Обработка ошибок

`Result<T, CataclysmEffectError>`; `CataclysmEffectError = 'SCAR_DUP' | 'SCAR_NOT_REMOVABLE_BY' | 'EFFECT_POLICY_NOT_FOUND' | 'UNKNOWN_ACTION_KIND' | 'TARGET_NOT_FOUND'`; исключения не бросаются; dup-scar — валидный no-op с логом.

---

## 11. Критерии приёмки

- **AC01 (008):** восстановимые эффекты снимаются автоматические; шрамы — только после explicit removal action.
- **AC02 (010):** `market_shock` меняет ровно те узлы, которые попали в selector; экономическая повторная отпускная цена взлетает в течение 1 такта после `effect_applied`.
- **AC03 (011):** sailing conditions обновляются в пределах такта (Fleet-интеграция тест).
- **AC04:** шрам накладывается через жизненный механику и никогда напрямую — LINT.
- **AC05:** `political_impact` публикуется как событие в 023; ключевые городские сдвиги производятся логикой 023 (разделение ответственности).
- **AC06:** доктрина фракции: если `interaction_modes` содержит канал, `faction_interaction_applied` публикуется и дьявол intensity резолвится по `escalation` (025); в противном случае — нулевой вклад.
- **AC07:** шок против шрама: таймер снятия шока не создаёт шрам ( жизненные циклы не перепутаны).
- **AC08:** `remove` по `removable_by` разрешён только для declared метода снятия; иначе `SCAR_NOT_REMOVABLE_BY`.
- **AC09:** memento: шрамы сохраняются в полном снимке, достаются при load без перезапуска.
- **AC10 (CI):** schemas + graph (scar policies, doctrine refs, effect tags) + gameplay lint (каждая резолюция `persistent_scar` имеет скелет шрамов, каждый класс ≥ 2 counterplay tags).

---

## 12. Тест-план
unit: `cataclysm-effect-tracker.test.ts`, `node-scar-tracker.test.ts`, doctrine tests.
integration: `effect-market.reaction.test.ts` (020), `effect-sailing-conditions.test.ts` (017), `effect-political.test.ts` (023), `scar-remove-ritual.test.ts` (в-vs testscar cycle).
contract: `node-scar.schema.test.ts`, doctrine schema, action schema.
determinism: arcane-rupture полный прогон: golden-снимки стадий; save/load restore.

---

## 13. Производительность
Эффекты — по несколько за такт максимум; шок-задача O(selector × nodes); шрамы — массив 0..K (десятки); всё умещается far ниже бюджета фазы (0.5 мс).

---

## 14. Миграции
`NodeScarDefinition` перенесён с kind `node-scar` (фактически тот же schema из 022 — пакет качества времени); версия снимка 1.

---

## 15. Открытые вопросы

| ID | Вопрос | Блокер? | Решение / статус |
|---|---|---|---|
| Q-01 | Кто владеет `NodeScarDefinition` — 020/022 или 026 | нет | контракт с 022; реальный content-packet живёт оба пакета (world + economy) — CI объединяет (uniqueness guarded) |
| Q-02 | Стечемость доктрин и faction data-card | нет | Doctrine ссылается только на `archetype_tags`/`vulnerability_tags`, никаких прямых чисел |
| Q-03 | Мусорные/logs scar снятия | нет | События `scar_removed` с `removed_by`; журнал в 036 эпилог reading |

---

## 16. Что остаётся вне scope
VFX/шейдеры канала визуализации (011/012 — contract only), аудио-темы (015), hidden branch механика (033), баланс чисел, лорные тексты.

Скелет первой волны: ≥ 4 шрамов в контенте (leyline-morgue; storm-coastal; smog-region; plague-tide) + 2 перeused from 022 (pomblicated); доктрины для всех 4 фракций (`industrial-steam`, `ancient-arcane`, `necromantic-corpse`, `living-artifact`).

---

## 17. Трассировка на DESIGN

| DESIGN-блок | Требование | AC | Тест |
|---|---|---|---|
| SPEC-CATA-008 | recoverable/scars гибрид | AC01, AC04, AC07 | scar lifecycle tests |
| SPEC-CATA-010 | economy shocked/scar bridge | AC02 | effect-market reaction |
| SPEC-CATA-011 | fleet sailing + damage | AC03 | sailing integration |
| SPEC-CATA-013 | player-cataclysm hook | §8 hidden branch port | contract test |
| SPEC-CATA-014 | 4 канала доставки | contract §8 | narrative contract lint |
| SPEC-CATA-015/016/044 | doctrine | AC06 | doctrine tests |
| SPEC-CATA-052 | все мосты | §9 | bridge tests |
| SPEC-ECON-038/072 | NodeScar контракты | AC04/AC08 | cross-package tests |
