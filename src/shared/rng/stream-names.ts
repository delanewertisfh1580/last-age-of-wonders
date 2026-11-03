/**
 * TKT-M3-001: каталог имён RNG-потоков из §5.4 DEV-SPEC-005 (49 потоков).
 * Новый поток добавляется только здесь (+ проверка CI, что нет дубликатов).
 */
import { makeStreamName, type RngStreamName } from '../../domain/rng/RngStreamName.js';

const NAMES = [
  // Fleet / Ship
  'rng.fleet.maneuver',
  'rng.fleet.damage',
  'rng.fleet.resource',
  'rng.fleet.acquisition',
  // Combat
  'rng.combat.duel',
  'rng.combat.party',
  'rng.combat.damage',
  'rng.combat.resolution',
  // Economy
  'rng.economy.market',
  'rng.economy.quests',
  'rng.economy.risk',
  'rng.economy.agents',
  'rng.economy.investments',
  'rng.economy.shocks',
  // Cataclysm
  'rng.cataclysm.spawn',
  'rng.cataclysm.escalation',
  'rng.cataclysm.effects',
  'rng.cataclysm.resolution',
  'rng.cataclysm.hidden_branch',
  // Party
  'rng.party.morale',
  'rng.party.progression',
  'rng.party.reactions',
  'rng.party.recruitment',
  // Companion
  'rng.companion.acquisition_hook',
  'rng.companion.relationship',
  'rng.companion.daily_reaction',
  'rng.companion.synergy_activation',
  'rng.companion.legacy_outcome',
  // Hidden branches
  'rng.hidden_branch.trigger',
  'rng.hidden_branch.progression',
  'rng.hidden_branch.combination',
  'rng.hidden_branch.outcome',
  'rng.hidden_branch.symptom',
  // Narrative
  'rng.narrative.beacon_activation',
  'rng.narrative.arc_activation',
  'rng.narrative.dialogue_outcome',
  'rng.narrative.npc_state',
  'rng.narrative.lore_revelation',
  // Epilogue
  'rng.epilogue.fact_collection',
  'rng.epilogue.fact_filtering',
  'rng.epilogue.thread_weaving',
  'rng.epilogue.style_selection',
  'rng.epilogue.scene_selection',
  'rng.epilogue.fact_interpretation',
  'rng.epilogue.meta_threat_generation',
  // Visual
  'rng.visual.vfx_variation',
  'rng.visual.transition_jitter',
  'rng.visual.material_wear',
  'rng.visual.faction_visual_mix',
] as const;

export const STREAM_NAMES: Readonly<Record<(typeof NAMES)[number] & string, RngStreamName>> = Object.fromEntries(
  NAMES.map((n) => [n, makeStreamName(n)]),
) as Readonly<Record<(typeof NAMES)[number] & string, RngStreamName>>;

export const ALL_STREAM_NAMES: readonly RngStreamName[] = NAMES.map((n) =>
  makeStreamName(n),
);
