# DEV-SPEC-OVERVIEW v1.0 — «Каталог спецификаций к разработке»

**Тип документа:** Каталог спецификаций к разработке (Development Specification Catalog)  
**Дата:** 2026-11-02  
**Статус:** сформирован, ожидает утверждения  
**Основан на:**  
`INTENT v1.0 — «Наука против Магии»`  
`GENERAL DESIGN v1.0 — «Наука против Магии»`  
Все `DESIGN v1.0 — «...»` документы  
**Назначение:** зафиксировать полный перечень спецификаций к разработке, их зависимости, порядок реализации и правила именования.

---

## 1. Чем спецификация к разработке отличается от дизайн-документа

Дизайн-документы (`DESIGN v1.0`) фиксируют **решения и границы**: что делаем, какие модели, какие политики, какие события. Они data-driven и нормативно-контрактные, но намеренно не содержат полных JSON Schema, TypeScript-интерфейсов, state machines, критериев приёмки и тест-планов.

Спецификация к разработке (`DEV-SPEC`) — это **реализационный контракт**. Она обязана содержать:

- точные TypeScript-интерфейсы и типы;
- полные JSON Schema (или ссылки на пакет схем);
- state machines / sequence diagrams там, где есть рантайм-поведение;
- контракты портов и адаптеров;
- обработку ошибок через `Result<T, E>`;
- критерии приёмки (Given/When/Then);
- тест-план (unit / integration / contract / E2E);
- структуру файлов и директорий, куда это ложится;
- зависимости от других `DEV-SPEC`;
- что явно вне scope.

Дизайн-документы остаются **источником истины для решений**. `DEV-SPEC` наследует их решения и добавляет реализационную детализацию. Если `DEV-SPEC` противоречит `DESIGN`, `DESIGN` имеет приоритет, а противоречие должно быть зафиксировано как открытый вопрос.

---

## 2. Конвенции именования

| Артефакт | Формат | Пример |
|---|---|---|
| Файл спецификации | `DEV-SPEC-{NNN} v1.0 — «{Название}».md` | `DEV-SPEC-004 v1.0 — «Mechanic Runtime».md` |
| ID спецификации | `DEV-SPEC-{NNN}` | `DEV-SPEC-004` |
| ID требования внутри спеки | `{DEV-SPEC-NNN}-R{NN}` | `DEV-SPEC-004-R01` |
| ID критерия приёмки | `{DEV-SPEC-NNN}-AC{NN}` | `DEV-SPEC-004-AC03` |
| ID теста | `{DEV-SPEC-NNN}-T{NN}` | `DEV-SPEC-004-T07` |
| Ссылка из тикета | `[DEV-SPEC-004-R01]` | — |

Префиксы доменов в ID сущностей сохраняются из дизайн-документов (`industrial-steam`, `coal-to-steel-chain`, `vfx-steam-jet` и т.д.).

---

## 3. Каталог спецификаций

### 3.1. Foundation — фундамент

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-001` | Core Primitives, Result, DI & Bootstrap | GD-16, GD-17 | — |
| `DEV-SPEC-002` | Event Bus & Event Registry | GD-04, все событийные модели | 001 |
| `DEV-SPEC-003` | Content Registry & JSON Schema Package | GD-07, GD-08, все data-контракты | 001, 002 |
| `DEV-SPEC-004` | Mechanic Runtime (resolver / tracker / plugin registry) | SPEC-FLEET-035…038, все домены | 001, 002, 003 |
| `DEV-SPEC-005` | Seeded RNG Service & Named Streams | все модели RNG | 001 |
| `DEV-SPEC-006` | Save/Load & Memento Composition | GD-09, GD-10, все модели сохранений | 001, 002, 003, 004, 005 |
| `DEV-SPEC-007` | Game Clock & World Tick Pipeline | GD-05, GD-06 | 001, 002, 005 |
| `DEV-SPEC-008` | CI Validation Pipeline (schema + graph + gameplay lint) | все разделы CI | 003, 004 |
| `DEV-SPEC-009` | Localization System | SPEC-*-020 у всех доменов | 001, 003 |

### 3.2. Presentation — презентация и рендер

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-010` | Scene Manager & Render Pipeline | GD-11, GD-12, GD-13 | 001, 002 |
| `DEV-SPEC-011` | Shader Pipeline & Quality Tiers | SPEC-ART-001…005, 021…028 | 010, 003, 004 |
| `DEV-SPEC-012` | VFX Runtime | SPEC-ART-029, 040…042 | 010, 011, 004 |
| `DEV-SPEC-013` | UI Framework (HTML/CSS + Babylon GUI) | GD-14 | 001, 002 |
| `DEV-SPEC-014` | Input System (Desktop / Mobile) | GD-14 | 013 |
| `DEV-SPEC-015` | Audio System (SceneAudioAdapter, AudioManager) | GD-15 | 001, 002, 003 |
| `DEV-SPEC-016` | Mobile Adaptation & Performance Budget | GD-14, INT-04 | 010, 011, 012, 013, 014 |

### 3.3. Fleet — флот и морской бой

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-017` | Ship & Fleet Domain | SPEC-FLEET-001…038 | 001…007 |
| `DEV-SPEC-018` | Naval Combat Real-time (movement, maneuvers, ship damage) | INT-18, GD-13 поток 13.2 | 017, 007, 004 |
| `DEV-SPEC-019` | Doctrine & Branch Unlock System | SPEC-FLEET-020…025, 060…062 | 017, 003, 004 |

### 3.4. Economy — экономика

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-020` | Market & Trade Core (goods, recipes, chains, prices, inventories) | SPEC-ECON-001…022, 050…066 | 001…007 |
| `DEV-SPEC-021` | Guilds, Quest Generation & Trade Agents | SPEC-ECON-023…035, 067…068, 073 | 020, 002, 004 |
| `DEV-SPEC-022` | Investments, Enterprises & Legality | SPEC-ECON-041…046, 069…074 | 020, 021 |

### 3.5. World & Cataclysms — мир и катаклизмы

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-023` | World Simulation & Political Map (cities, rulers, wars, alliances) | INT-10…12, GD-05 | 001…007, 020 |
| `DEV-SPEC-024` | World Events & Location Changes | INT-13…15 | 023 |
| `DEV-SPEC-025` | Cataclysm Lifecycle & Escalation | SPEC-CATA-001…007, 041…043 | 023, 024, 004 |
| `DEV-SPEC-026` | Cataclysm Effects & Node Scars | SPEC-CATA-008…016, 044…045, 072 | 025, 020 |

### 3.6. Party & Combat — отряд и бой

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-027` | Party Management (roster, equipment, morale, salary) | SPEC-PARTY-001…017, 021…024 | 001…007, 020 |
| `DEV-SPEC-028` | Companion System (recruitment, relationships, synergy, permadeath legacy) | SPEC-COMP-001…041 | 027, 004, 023 |
| `DEV-SPEC-029` | Combat Orchestrator & Damage Model (HP, wounds, traumas, death) | SPEC-COMBAT-001…016, 021, 025 | 017, 027, 028, 007 |
| `DEV-SPEC-030` | Duel System (fencing, boarding equipment, faction doctrines) | SPEC-COMBAT-003, 007, 022 | 029, 004 |
| `DEV-SPEC-031` | Party Battlefield & Combat Resolution | SPEC-COMBAT-004…006, 009, 030…032 | 029, 027, 028 |

### 3.7. Captain & Narrative — капитан и нарратив

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-032` | Captain Domain (stats, skills, aging, pension, reputation, oaths) | INT-24, SPEC-LORE-002, упоминания везде | 001…007 |
| `DEV-SPEC-033` | Hidden Branches / Transformation | SPEC-TRANS-001…063 | 032, 025, 026, 004 |
| `DEV-SPEC-034` | Story Beacons, Narrative Arcs & Dialogue | SPEC-LORE-001…042 | 023, 028, 033 |
| `DEV-SPEC-035` | Lore Revelation, Key NPCs & Environmental Storytelling | SPEC-LORE-004, 008, 012, 025…030 | 034, 026 |

### 3.8. Epilogue — эпилог

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-036` | Epilogue Pipeline & EpilogueFactPort | SPEC-EPI-001…041 | 002, 028, 033, 034 |
| `DEV-SPEC-037` | Meta Threat Generation & Ending Integration | SPEC-EPI-008…010, 025…026, 074 | 036 |

### 3.9. Integration & Tooling — интеграция и инструменты

| ID | Название | Покрывает из DESIGN | Зависит от |
|---|---|---|---|
| `DEV-SPEC-038` | Content Authoring Tools (schema generation, content packs, lint CLI) | GD-07, GD-08, все CI | 003, 008 |
| `DEV-SPEC-039` | Playable Vertical Slice Integration | все `SPEC-*-080/090/100` | все предыдущие |

---

## 4. Волны реализации

Порядок отражает жёсткие зависимости. Внутри волны можно распараллеливать.

### Wave 0 — Foundation (без него ничего не собирается)
`001 → 002 → 003 → 004 → 005 → 007 → 006 → 008 → 009`

### Wave 1 — Presentation skeleton
`010 → 011 → 013 → 014 → 015 → 012 → 016`

### Wave 2 — First domain: Fleet
`017 → 018 → 019`

### Wave 3 — Economy core
`020 → 021 → 022`

### Wave 4 — World & Cataclysms
`023 → 024 → 025 → 026`

### Wave 5 — Party, Companions & Combat
`027 → 028 → 029 → 030 → 031`

### Wave 6 — Captain, Narrative, Hidden Branches
`032 → 033 → 034 → 035`

### Wave 7 — Epilogue
`036 → 037`

### Wave 8 — Integration
`038 → 039`

---

## 5. Кросс-доменные контракты, которые должны быть зафиксированы до Wave 1

Следующие решения обязаны быть приняты внутри `DEV-SPEC-001…008` и не могут «всплыть» позже:

1. **Канонический реестр событий** — единый `EventDefinition` с `payload_schema`, `delivery_policy`, `source` (`core` / `faction_extension`). Все `DESIGN`-документы ссылаются на события; до `DEV-SPEC-002` они не зарегистрированы.
2. **Единый формат `MechanicDefinition`** — включая `state_schema`, `lifecycle`, `priority`, правило «resolver не персистит, tracker персистит». До `DEV-SPEC-004` все домены описывают механики «по мотивам».
3. **Порядок такта** — кто вызывает `world.tick_advanced`, в каком порядке тикают `Market`, `Cataclysm`, `Party`, `Combat`, `Visual`, `Epilogue`-трекеры, как обрабатывается `DeliveryPolicy` (`Immediate` / `NextTick` / `AfterScene` / `WarningThenImpact`). Это `DEV-SPEC-007`.
4. **Композиция Memento** — как снимки `VisualStateInstance`, `PartyInstance`, `CombatInstance`, `CataclysmInstance`, `NarrativeStateInstance`, `EpilogueInstance` собираются в один save-файл. Это `DEV-SPEC-006`.
5. **`EpilogueFactPort`** — единый тип `EpilogueFact`, правила публикации, `narrative_weight`, `theme`, `significance`. Это `DEV-SPEC-036`, но тип должен быть в `DEV-SPEC-002`/`003`.
6. **`CargoCapacityPort`** — контракт между экономикой и флотом. `DEV-SPEC-020` ↔ `DEV-SPEC-017`.
7. **`TickBudget` / LOD-контракт** — экономика, рендер, VFX должны уметь работать в бюджете. `DEV-SPEC-016`.
8. **Капитан как сущность** — до `DEV-SPEC-032` капитан упоминается везде, но нигде не определён. `DEV-SPEC-032` должен войти в Wave 5 (не позже), иначе бой, дуэль и скрытые ветки не соберутся.
9. **Реальный морской бой** — `DEV-SPEC-018` должен войти в Wave 2, иначе `SPEC-FLEET` останется без исполнения.

---

## 6. Соглашения по схемам контента

Пакет JSON Schema (`DEV-SPEC-003`) должен покрыть **все** сущности из всех `DESIGN`-документов. До его готовности `DEV-SPEC-008` (CI) не может работать.

Список сущностей, которые обязаны быть в пакете схем:

- Foundation: `MechanicDefinition`, `EventDefinition`, `DeliveryPolicy`, `EpilogueFact`.
- Fleet: `FactionDefinition`, `DoctrineDefinition`, `FactionShipBranchDefinition`, `ShipDefinition`.
- Economy: `GoodDefinition`, `RecipeDefinition`, `ProductionChainDefinition`, `TradeNodeDefinition`, `TradeRouteDefinition`, `MarketDefinition`, `MarketState`, `GuildDefinition`, `GuildChapterDefinition`, `GuildQuestTemplateDefinition`, `InvestmentProjectDefinition`, `EnterpriseDefinition`, `NodeScarDefinition`, `EconomyDoctrineDefinition`, `TradeAgentDefinition`, `LegalityDefinition`, `ContractDefinition`, `PriceModifierDefinition`.
- World: `CityDefinition`, `RulerDefinition`, `PoliticalMapState`, `WorldEventDefinition`.
- Cataclysms: `CataclysmDefinition`, `CataclysmInstance`, `CataclysmDoctrineDefinition`, `CataclysmQuestTemplateDefinition`.
- Party & Companions: `CompanionDefinition`, `EquipmentDefinition`, `PartyInstance`, `RelationshipThresholdsDefinition`, `CompanionSynergyDefinition`, `PermadeathLegacyDefinition`, `AcquisitionHookDefinition`, `ReactionGranularityDefinition`.
- Combat: `CombatDefinition`, `DuelDoctrineDefinition`, `CrewMemberDefinition`, `CombatInstance`.
- Captain & Narrative: `CaptainDefinition`, `CaptainInstance`, `TransformationBranchDefinition`, `TransformationNodeDefinition`, `TransformationTreeDefinition`, `TransformationTriggerDefinition`, `BackgroundDefinition`, `StoryBeaconDefinition`, `NarrativeArcDefinition`, `FactionNarrativeArcDefinition`, `LoreLayerDefinition`, `KeyNpcDefinition`, `DialogueDefinition`, `PrologueDefinition`, `EndingDefinition`, `LoreRevelationLayerDefinition`, `NarrativeStateInstance`.
- Epilogue: `EpilogueFactDefinition`, `EpilogueTemplateDefinition`, `NarrativeStyleDefinition`, `EpilogueSceneDefinition`, `FinalChoiceDefinition`, `MetaThreatDefinition`, `EpilogueInstance`.
- Art: `StylizationProfileDefinition`, `ShaderQualityTierDefinition`, `FactionVisualDoctrineDefinition`, `MaterialDefinition`, `ShaderGraphDefinition`, `GlobalPostProcessProfileDefinition`, `LocalShaderOverrideDefinition`, `ShaderTransitionPolicyDefinition`, `VfxSystemDefinition`, `VisualStateInstance`.

Если какая-то сущность не имеет схемы — `DEV-SPEC-008` обязан падать. Это и есть «схемы контента как контракт».

---

## 7. Definition of Done для спецификации к разработке

Спецификация к разработке считается готовой к тикетам, если:

- ✅ имеет все секции шаблона (`DEV-SPEC-TEMPLATE`);
- ✅ все TypeScript-интерфейсы и типы зафиксированы;
- ✅ все JSON Schema либо вложены, либо даны ссылкой на пакет;
- ✅ все state machines / sequence diagrams для рантайм-поведения описаны;
- ✅ все порты и адаптеры имеют контракт;
- ✅ все ошибки описаны через `Result<T, E>`;
- ✅ каждая `R`-требование имеет минимум один `AC`-критерий;
- ✅ тест-план покрывает unit / integration / contract / E2E;
- ✅ структура файлов и директорий зафиксирована;
- ✅ зависимости на другие `DEV-SPEC` перечислены;
- ✅ открытые вопросы либо закрыты, либо явно помечены как блокеры;
- ✅ `DESIGN`-источник указан, и расхождения с ним явно отмечены.

---

## 8. Что остаётся вне каталога

- Числовой баланс — отдельный будущий документ «Balance & Tuning».
- Финальные тексты, лорные названия, арт, VFX, аудио — контентные пакеты, не `DEV-SPEC`.
- Миграции сохранений между версиями — отдельная будущая спека.
- Серверная часть, мультиплеер, облачные сохранения — вне scope по INTENT.