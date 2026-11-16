import { createHash } from 'node:crypto';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { SeededRngService } from '../../infrastructure/rng/SeededRngService.js';
import type { RngStreamState } from '../../domain/rng/RngStreamState.js';
import {
  createInventory,
  createMarket,
  executeSpotTrade,
  quotePrice,
  runProductionChain,
  type InventoryState,
  type MarketState,
} from '../../domain/economy/Economy.js';
import { createCombatant, createEncounter, runNavalEncounter, type EncounterState } from '../../domain/naval/NavalCombat.js';
import { createMember, createParty, equip, recruit, type PartyState } from '../../domain/party/Party.js';
import { createCombat, createUnit, runCombat, type CombatState } from '../../domain/combat/Combat.js';
import { createDuel, createDuelist, runDuel, type DuelState } from '../../domain/duel/Duel.js';
import { addPressure, createCataclysm, tickCataclysm, type CataclysmState } from '../../domain/cataclysm/Lifecycle.js';
import { applyCataclysmEffect, type CataclysmEffect, type NodeScar } from '../../domain/cataclysm/Effects.js';
import {
  createHiddenBranch,
  transform,
  triggerBranch,
  unlockHiddenNode,
  type HiddenBranchState,
  type HiddenNode,
} from '../../domain/transformation/HiddenBranch.js';
import {
  activateBeacon,
  advanceArc,
  createNarrative,
  dialogue,
  makeFinaleReady,
  startPrologue,
  type NarrativeState,
  type StoryArc,
  type StoryBeacon,
} from '../../domain/narrative/Narrative.js';
import { ageCaptain, computePension, createCaptain, resolveVow, swearVow, type CaptainState } from '../../domain/captain/Captain.js';
import {
  createFactPort,
  generateEpilogue,
  pickChoice,
  type EpilogueFact,
  type EpilogueResult,
} from '../../domain/epilogue/Epilogue.js';
import {
  buildCarryover,
  generateMetaThreat,
  type Carryover,
  type EndingChoice,
  type MetaThreat,
  type RunStats,
} from '../../domain/meta/MetaThreat.js';

export type SliceStepId =
  | 'prologue'
  | 'trade'
  | 'sea-battle'
  | 'party-duel'
  | 'cataclysm'
  | 'transformation'
  | 'narrative'
  | 'captain'
  | 'epilogue'
  | 'meta';

export interface SliceStepSpec {
  readonly id: SliceStepId;
  readonly scope: 'world' | 'captain' | 'narrative' | 'party' | 'combat' | 'economy' | 'epilogue' | 'meta';
}

/** TKT-M34-002: фиксированный маршрут из 10 шагов и порядок scope-фаз. */
export const SLICE_STEPS: readonly SliceStepSpec[] = [
  { id: 'prologue', scope: 'narrative' },
  { id: 'trade', scope: 'economy' },
  { id: 'sea-battle', scope: 'combat' },
  { id: 'party-duel', scope: 'party' },
  { id: 'cataclysm', scope: 'world' },
  { id: 'transformation', scope: 'party' },
  { id: 'narrative', scope: 'narrative' },
  { id: 'captain', scope: 'captain' },
  { id: 'epilogue', scope: 'epilogue' },
  { id: 'meta', scope: 'meta' },
];

export const SLICE_SCOPE_ORDER = ['world', 'captain', 'narrative', 'party', 'combat', 'economy', 'epilogue', 'meta'] as const;

export type SliceErrorCode =
  | 'SLICE_ORDER_VIOLATION'
  | 'SLICE_CHECKPOINT_UNKNOWN'
  | 'SLICE_HASH_MISMATCH'
  | 'SLICE_BUDGET_EXCEEDED'
  | 'SLICE_INCOMPLETE'
  | 'SLICE_STEP_FAILED';

export interface SliceError {
  readonly code: SliceErrorCode;
  readonly message: string;
}

export interface SliceConfig {
  readonly seed: string;
  readonly mode: 'desktop' | 'mobile';
  readonly maxTickMs?: number;
  readonly maxSaveBytes?: number;
}

export interface StepReport {
  readonly id: SliceStepId;
  readonly scope: SliceStepSpec['scope'];
  readonly hash: string;
  readonly durationMs: number;
}

export interface RunMetrics {
  readonly maxTickMs: number;
  readonly avgTickMs: number;
  readonly saveBytes: number;
  readonly loadMs: number;
}

export interface RunReport {
  readonly steps: readonly StepReport[];
  readonly hashes: readonly string[];
  readonly metrics: RunMetrics;
  readonly events: readonly string[];
  readonly passed: boolean;
  readonly errors: readonly string[];
}

export interface Checkpoint {
  readonly id: string;
  readonly stepIndex: number;
  readonly state: unknown;
  readonly rng: Record<string, RngStreamState>;
  readonly hash: string;
}

/** TKT-M34-004: реестр контрольных точек с хешем канонизированного снимка. */
export class CheckpointRegistry {
  private readonly checkpoints = new Map<string, Checkpoint>();

  save(id: string, stepIndex: number, state: unknown, rng: Record<string, RngStreamState>): Checkpoint {
    const hash = hashValue({ stepIndex, state, rng });
    const checkpoint: Checkpoint = { id, stepIndex, state: JSON.parse(JSON.stringify(state)) as unknown, rng: JSON.parse(JSON.stringify(rng)) as Record<string, RngStreamState>, hash };
    this.checkpoints.set(id, checkpoint);
    return checkpoint;
  }

  load(id: string): Result<Checkpoint, SliceError> {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return err({ code: 'SLICE_CHECKPOINT_UNKNOWN', message: `Unknown checkpoint: ${id}` });
    const actual = hashValue({ stepIndex: checkpoint.stepIndex, state: checkpoint.state, rng: checkpoint.rng });
    if (actual !== checkpoint.hash) return err({ code: 'SLICE_HASH_MISMATCH', message: `Corrupted checkpoint: ${id}` });
    return ok(checkpoint);
  }

  get(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  list(): readonly string[] {
    return [...this.checkpoints.keys()];
  }
}

export class RunReportBuilder {
  private readonly steps: StepReport[] = [];

  addStep(step: StepReport): void {
    this.steps.push(step);
  }

  build(metrics: RunMetrics, events: readonly string[], errors: readonly string[] = []): RunReport {
    return {
      steps: [...this.steps],
      hashes: this.steps.map((step) => step.hash),
      metrics,
      events: [...events],
      passed: errors.length === 0 && this.steps.length === SLICE_STEPS.length,
      errors: [...errors],
    };
  }
}

const SCARS_KEY = '__scars';

interface SerializedSliceState {
  narrative: NarrativeState;
  market: MarketState;
  inventory: InventoryState;
  naval: EncounterState | null;
  party: PartyState;
  combat: CombatState | null;
  duel: DuelState | null;
  cataclysm: CataclysmState;
  scars: [string, NodeScar][];
  hidden: HiddenBranchState;
  captain: CaptainState;
  epilogue: EpilogueResult | null;
  threat: MetaThreat | null;
  carryover: Carryover | null;
  events: string[];
}

/** TKT-M34-002…009: композиция доменов в проходимый вертикальный срез. */
export class SliceRunner {
  private narrative: NarrativeState;
  private market: MarketState;
  private inventory: InventoryState;
  private naval: EncounterState | null = null;
  private party: PartyState;
  private combat: CombatState | null = null;
  private duel: DuelState | null = null;
  private cataclysm: CataclysmState;
  private scars = new Map<string, NodeScar>();
  private hidden: HiddenBranchState;
  private captain: CaptainState;
  private epilogue: EpilogueResult | null = null;
  private threat: MetaThreat | null = null;
  private carryover: Carryover | null = null;
  private events: string[] = [];
  private stepIndex = 0;
  readonly registry = new CheckpointRegistry();
  private readonly report = new RunReportBuilder();
  private readonly durations: number[] = [];
  private loadMs = 0;

  constructor(
    readonly config: SliceConfig,
    readonly rng: SeededRngService = new SeededRngService(config.seed),
  ) {
    this.narrative = createNarrative();
    this.market = createMarket('aurum', { grain: 10, iron: 24, tools: 60 }, { grain: 120, iron: 80, tools: 20 }, { grain: 1, iron: 1, tools: 1.2 }, 0.02);
    this.inventory = createInventory(500);
    this.party = createParty(200);
    this.cataclysm = createCataclysm('slice-storm', 'storm', 'aurum');
    this.hidden = createHiddenBranch('slice-tide', 10);
    this.captain = createCaptain('voss', 'Elena Voss', 58, 45);
  }

  checkpointIdForStep(stepNumber: number): string | null {
    if ([2, 4, 5, 6, 8, 10].includes(stepNumber)) return `cp-${[2, 4, 5, 6, 8, 10].indexOf(stepNumber) + 1}`;
    return null;
  }

  currentStepIndex(): number {
    return this.stepIndex;
  }

  currentHash(): string {
    return hashValue(this.serialize());
  }

  hashes(): readonly string[] {
    return this.registry.list().map((id) => this.registry.get(id)?.hash ?? '');
  }

  /** TKT-M34-007: прогон до конца. */
  runAll(): Result<RunReport, SliceError> {
    while (this.stepIndex < SLICE_STEPS.length) {
      const next = this.runNext();
      if (!next.ok) return next as Result<RunReport, SliceError>;
    }
    const errors: string[] = [];
    const metrics = this.metrics();
    if (metrics.maxTickMs > (this.config.maxTickMs ?? Number.POSITIVE_INFINITY)) errors.push('SLICE_BUDGET_EXCEEDED: max_tick_ms');
    if (metrics.saveBytes > (this.config.maxSaveBytes ?? Number.POSITIVE_INFINITY)) errors.push('SLICE_BUDGET_EXCEEDED: save_bytes');
    return ok(this.report.build(metrics, this.events, errors));
  }

  runNext(): Result<StepReport, SliceError> {
    if (this.stepIndex >= SLICE_STEPS.length) return err({ code: 'SLICE_INCOMPLETE', message: 'All steps already executed' });
    const spec = SLICE_STEPS[this.stepIndex];
    const started = performance.now();
    const executed = this.execute(spec.id);
    if (!executed.ok) return executed as Result<StepReport, SliceError>;
    const durationMs = performance.now() - started;
    this.durations.push(durationMs);
    this.stepIndex += 1;
    const step: StepReport = { id: spec.id, scope: spec.scope, hash: this.currentHash(), durationMs };
    this.report.addStep(step);
    const checkpointId = this.checkpointIdForStep(this.stepIndex);
    if (checkpointId) this.registry.save(checkpointId, this.stepIndex, this.serialize(), this.rng.serializeAll());
    return ok(step);
  }

  /** TKT-M34-004: восстановление и продолжение с контрольной точки. */
  restoreCheckpoint(id: string): Result<void, SliceError> {
    const started = performance.now();
    const checkpoint = this.registry.load(id);
    if (!checkpoint.ok) return checkpoint as Result<void, SliceError>;
    this.deserialize(checkpoint.value.state);
    for (const [stream, state] of Object.entries(checkpoint.value.rng)) {
      const restored = this.rng.restoreState(stream as never, state);
      if (!restored.ok) return err({ code: 'SLICE_STEP_FAILED', message: restored.error.message });
    }
    this.stepIndex = checkpoint.value.stepIndex;
    this.loadMs = performance.now() - started;
    return ok(undefined);
  }

  metrics(): RunMetrics {
    const max = this.durations.length === 0 ? 0 : Math.max(...this.durations);
    const avg = this.durations.length === 0 ? 0 : this.durations.reduce((sum, value) => sum + value, 0) / this.durations.length;
    return {
      maxTickMs: Math.round(max * 1000) / 1000,
      avgTickMs: Math.round(avg * 1000) / 1000,
      saveBytes: Buffer.byteLength(JSON.stringify(this.registry.get('cp-6')?.state ?? this.serialize()), 'utf8'),
      loadMs: Math.round(this.loadMs * 1000) / 1000,
    };
  }

  /** TKT-M34-001: в прогоне встречаются только канонические топики швов. */
  seamEvents(): readonly string[] {
    return this.events;
  }

  private execute(id: SliceStepId): Result<void, SliceError> {
    switch (id) {
      case 'prologue':
        return this.stepPrologue();
      case 'trade':
        return this.stepTrade();
      case 'sea-battle':
        return this.stepSeaBattle();
      case 'party-duel':
        return this.stepPartyDuel();
      case 'cataclysm':
        return this.stepCataclysm();
      case 'transformation':
        return this.stepTransformation();
      case 'narrative':
        return this.stepNarrative();
      case 'captain':
        return this.stepCaptain();
      case 'epilogue':
        return this.stepEpilogue();
      case 'meta':
        return this.stepMeta();
    }
  }

  private fail(step: string, message: string): Result<never, SliceError> {
    return err({ code: 'SLICE_STEP_FAILED', message: `${step}: ${message}` });
  }

  private stepPrologue(): Result<void, SliceError> {
    this.narrative = createNarrative();
    startPrologue(this.narrative, { id: 'scholar', title: 'Disgraced Scholar', flags: ['prologue-done', 'science'], bonusSkill: 'lore' });
    makeFinaleReady(this.narrative);
    this.events.push('narrative.arc_started');
    return ok(undefined);
  }

  private stepTrade(): Result<void, SliceError> {
    const grain = executeSpotTrade({ market: this.market, inventory: this.inventory, goodId: 'grain', qty: 20, side: 'buy', cargoCapacity: 120 });
    if (!grain.ok) return this.fail('trade', grain.error.message);
    const iron = executeSpotTrade({ market: this.market, inventory: this.inventory, goodId: 'iron', qty: 10, side: 'buy', cargoCapacity: 120 });
    if (!iron.ok) return this.fail('trade', iron.error.message);
    const chain = runProductionChain(
      [
        { id: 'smelt', inputs: { iron: 4 }, outputs: { tools: 1 }, ticks: 1 },
        { id: 'forge', inputs: { tools: 1 }, outputs: { grain: 2 }, ticks: 1 },
      ],
      this.inventory,
      1,
    );
    if (!chain.ok) return this.fail('trade', chain.error.message);
    const sold = executeSpotTrade({ market: this.market, inventory: this.inventory, goodId: 'grain', qty: 5, side: 'sell' });
    if (!sold.ok) return this.fail('trade', sold.error.message);
    const quote = quotePrice(this.market, 'tools');
    if (!quote.ok) return this.fail('trade', quote.error.message);
    this.events.push('economy.trade_completed');
    return ok(undefined);
  }

  private stepSeaBattle(): Result<void, SliceError> {
    this.naval = createEncounter(
      'slice-sea',
      createCombatant({ id: 'player', hp: 160, armor: 6, power: 42, morale: 80 }),
      createCombatant({ id: 'corsair', hp: 120, armor: 4, power: 30, morale: 60 }),
    );
    this.events.push('combat.started');
    const result = runNavalEncounter(this.naval, this.rng, 12);
    if (!result.ok) return this.fail('sea-battle', result.error.message);
    this.events.push('combat.resolved');
    return ok(undefined);
  }

  private stepPartyDuel(): Result<void, SliceError> {
    this.party = createParty(200);
    recruit(this.party, createMember({ id: 'cap', name: 'Captain', role: 'captain', attack: 22, defense: 10, maxHp: 90, salary: 20, slots: 3 }));
    recruit(this.party, createMember({ id: 'gun', name: 'Gunner', role: 'gunner', attack: 18, defense: 6, maxHp: 60, salary: 18, slots: 2 }));
    recruit(this.party, createMember({ id: 'doc', name: 'Surgeon', role: 'surgeon', attack: 8, defense: 5, maxHp: 50, salary: 15, slots: 2 }));
    equip(this.party, 'cap', 'sabre');
    equip(this.party, 'gun', 'rifle');

    const combat = createCombat(
      [
        createUnit({ id: 'cap', name: 'Captain', attack: 22, defense: 10, hp: 90, maxHp: 90, morale: 80 }),
        createUnit({ id: 'gun', name: 'Gunner', attack: 18, defense: 6, hp: 60, maxHp: 60, morale: 70 }),
        createUnit({ id: 'doc', name: 'Surgeon', attack: 8, defense: 5, hp: 50, maxHp: 50, morale: 60 }),
      ],
      [
        createUnit({ id: 'pirate', name: 'Pirate', attack: 16, defense: 5, hp: 70, maxHp: 70, morale: 50 }),
        createUnit({ id: 'brute', name: 'Brute', attack: 20, defense: 8, hp: 90, maxHp: 90, morale: 40 }),
      ],
    );
    if (!combat.ok) return this.fail('party-duel', combat.error.message);
    this.combat = combat.value;
    const resolved = runCombat(this.combat, this.rng);
    if (!resolved.ok) return this.fail('party-duel', resolved.error.message);
    if (this.combat.casualties.some((entry) => entry.startsWith('party:'))) {
      this.events.push('combat.crew_died');
      this.party.morale = Math.max(0, this.party.morale - 10);
      this.events.push('party.morale_changed');
    }

    this.duel = createDuel(
      createDuelist({ id: 'voss', name: 'Elena Voss', doctrine: 'aggressive', poise: 30, boardingTool: 4 }),
      createDuelist({ id: 'bosun', name: 'Bosun', doctrine: 'defensive', poise: 26 }),
    );
    const duelResult = runDuel(this.duel, this.rng);
    if (!duelResult.ok) return this.fail('party-duel', duelResult.error.message);
    return ok(undefined);
  }

  private stepCataclysm(): Result<void, SliceError> {
    this.cataclysm = createCataclysm('slice-storm', 'storm', 'aurum');
    const pressure = addPressure(this.cataclysm, 100);
    if (!pressure.ok) return this.fail('cataclysm', pressure.error.message);
    this.events.push('cataclysm.started');
    for (let i = 0; i < 3; i++) {
      const tick = tickCataclysm(this.cataclysm);
      if (!tick.ok) return this.fail('cataclysm', tick.error.message);
      if (tick.value.escalated) this.events.push('cataclysm.escalated');
    }
    const node = { nodeId: 'aurum', population: 10000, wealth: 1000, defense: 60, tags: ['port'] };
    const effect: CataclysmEffect = {
      id: 'slice-impact', type: 'storm', stage: 'impact', nodeId: 'aurum',
      populationLoss: 0.08, wealthLoss: 0.15, defenseLoss: 20, severity: 8,
    };
    const applied = applyCataclysmEffect({ aurum: node }, this.scars, effect);
    if (!applied.ok) return this.fail('cataclysm', applied.error.message);
    return ok(undefined);
  }

  private stepTransformation(): Result<void, SliceError> {
    this.hidden = createHiddenBranch('slice-tide', 10);
    const nodes: HiddenNode[] = [
      { id: 'omen', requires: [], cost: 1, insight: 'read the storm' },
      { id: 'bargain', requires: ['omen'], cost: 2, insight: 'bargain with the deep' },
      { id: 'becoming', requires: ['bargain'], cost: 3, insight: 'become the tide' },
    ];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const triggered = triggerBranch(this.hidden, { minReputation: 50, cataclysmsSurvived: 1, minLoreFragments: 2 }, { reputation: 60, cataclysmsSurvived: 1, companionDeaths: 1, loreFragments: 3 });
    if (!triggered.ok) return this.fail('transformation', triggered.error.message);
    this.events.push('hidden_branch.triggered');
    for (const node of nodes) {
      const unlocked = unlockHiddenNode(this.hidden, node, byId);
      if (!unlocked.ok) return this.fail('transformation', unlocked.error.message);
    }
    const transformed = transform(this.hidden, byId, 'tidebound', ['meta:second-run']);
    if (!transformed.ok) return this.fail('transformation', transformed.error.message);
    return ok(undefined);
  }

  private stepNarrative(): Result<void, SliceError> {
    const beacon: StoryBeacon = { id: 'slice-beacon', locationId: 'aurum', arcId: 'slice-arc', requiresFlags: ['science'] };
    const arc: StoryArc = {
      id: 'slice-arc',
      title: 'The Tide Remembers',
      beats: [
        { id: 'beat-1', flag: 'heard-rumor' },
        { id: 'beat-2', flag: 'saw-tide', requiresFlags: ['heard-rumor'] },
      ],
      finalFlag: 'slice-arc-done',
    };
    const activated = activateBeacon(this.narrative, beacon, arc, 'aurum');
    if (!activated.ok) return this.fail('narrative', activated.error.message);
    this.events.push('narrative.beacon_activated');
    advanceArc(this.narrative, arc, 'beat-1');
    dialogue(this.narrative, [{ id: 'listen', text: 'Listen to the sailor', flag: 'sailor-trusted', reputation: 5 }], 'listen');
    this.events.push('narrative.dialogue_completed');
    const finished = advanceArc(this.narrative, arc, 'beat-2');
    if (!finished.ok) return this.fail('narrative', finished.error.message);
    this.events.push('narrative.player_action_recorded');
    return ok(undefined);
  }

  private stepCaptain(): Result<void, SliceError> {
    swearVow(this.captain, { id: 'crew', description: 'Protect the crew', reputationReward: 10, condition: 'protect_crew', fulfilled: false, broken: false });
    resolveVow(this.captain, 'crew', true);
    for (let i = 0; i < 10; i++) {
      const aged = ageCaptain(this.captain, 10);
      if (!aged.ok) return this.fail('captain', aged.error.message);
    }
    this.events.push('captain.skill_improved');
    return ok(undefined);
  }

  private stepEpilogue(): Result<void, SliceError> {
    const facts: EpilogueFact[] = [
      { id: 'econ-1', domain: 'economy', text: 'The harbor markets stayed open through the storm.', weight: 7, tags: ['trade'] },
      { id: 'sea-1', domain: 'combat', text: `At sea the corsairs were beaten: ${this.naval?.outcome ?? 'unresolved'}.`, weight: 8, tags: ['naval'] },
      { id: 'party-1', domain: 'party', text: 'The crew buried its losses and kept the watch.', weight: 6, tags: ['loss'] },
      { id: 'cata-1', domain: 'cataclysm', text: 'The storm scarred Aurum but did not break it.', weight: 9, tags: ['storm'] },
      { id: 'trans-1', domain: 'transformation', text: `The captain became ${this.hidden.transformation ?? 'unchanged'}.`, weight: 8, tags: ['tide'] },
      { id: 'narr-1', domain: 'narrative', text: 'Mara read the drowned calendar aloud.', weight: 7, tags: ['lore'] },
      { id: 'cap-1', domain: 'captain', text: `Voss retired with a pension of ${computePension(this.captain, 50).amount}.`, weight: 5, tags: ['legacy'] },
    ];
    const ending: EndingChoice = { id: 'truth', tag: 'truth', threatBias: 2 };
    const generated = generateEpilogue(createFactPort(facts), ['economy', 'combat', 'party', 'cataclysm', 'transformation', 'narrative', 'captain'], pickChoice([
      { id: 'truth', text: 'The truth is written into the new charts.', tag: 'truth' },
    ], ending.id).ok ? { id: 'truth', text: 'The truth is written into the new charts.', tag: 'truth' } : undefined);
    if (!generated.ok) return this.fail('epilogue', generated.error.message);
    if (generated.value.missingDomains.length > 0) return this.fail('epilogue', `missing: ${generated.value.missingDomains.join(',')}`);
    this.epilogue = generated.value;
    this.events.push('epilogue.fact_collected');
    return ok(undefined);
  }

  private stepMeta(): Result<void, SliceError> {
    const ending: EndingChoice = { id: 'truth', tag: 'truth', threatBias: 2 };
    const stats: RunStats = {
      cataclysmsSurvived: 1,
      companionDeaths: 1,
      reputation: this.captain.reputation,
      loreFragments: 3,
    };
    const generated = generateMetaThreat(ending, stats, this.rng);
    if (!generated.ok) return this.fail('meta', generated.error.message);
    this.threat = generated.value;
    this.carryover = buildCarryover(ending, generated.value, this.hidden.metaUnlocks);
    this.events.push('meta_threat.generated');
    return ok(undefined);
  }

  private serialize(): SerializedSliceState {
    return {
      narrative: this.narrative,
      market: this.market,
      inventory: this.inventory,
      naval: this.naval,
      party: this.party,
      combat: this.combat,
      duel: this.duel,
      cataclysm: this.cataclysm,
      scars: [...this.scars.entries()],
      hidden: this.hidden,
      captain: this.captain,
      epilogue: this.epilogue,
      threat: this.threat,
      carryover: this.carryover,
      events: this.events,
    } as SerializedSliceState;
  }

  private deserialize(raw: unknown): void {
    const state = raw as SerializedSliceState;
    this.narrative = state.narrative;
    this.market = state.market;
    this.inventory = state.inventory;
    this.naval = state.naval;
    this.party = state.party;
    this.combat = state.combat;
    this.duel = state.duel;
    this.cataclysm = state.cataclysm;
    this.scars = new Map(state.scars);
    this.hidden = state.hidden;
    this.captain = state.captain;
    this.epilogue = state.epilogue;
    this.threat = state.threat;
    this.carryover = state.carryover;
    this.events = state.events;
  }
}

/** TKT-M34-002: проверка порядка шагов. */
export function validateStepOrder(ids: readonly string[]): Result<void, SliceError> {
  const order = SLICE_STEPS.map((step) => step.id as string);
  let last = -1;
  for (const id of ids) {
    const index = order.indexOf(id);
    if (index < 0 || index <= last) return err({ code: 'SLICE_ORDER_VIOLATION', message: `Invalid step order at ${id}` });
    last = index;
  }
  return ok(undefined);
}

export function runSlice(config: SliceConfig): Result<RunReport, SliceError> {
  return new SliceRunner(config).runAll();
}

export function hashValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => key !== SCARS_KEY).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}
