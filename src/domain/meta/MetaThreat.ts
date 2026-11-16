import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M32: выбор финала → процедурная угроза → перенос в следующий забег. */
export interface EndingChoice {
  readonly id: string;
  readonly tag: string;
  readonly threatBias: number;
}

export interface RunStats {
  readonly cataclysmsSurvived: number;
  readonly companionDeaths: number;
  readonly reputation: number;
  readonly loreFragments: number;
}

export interface MetaThreat {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly traits: readonly string[];
  readonly modifiers: Readonly<Record<string, number>>;
}

export interface Carryover {
  readonly threatLevel: number;
  readonly endingTag: string;
  readonly metaUnlocks: readonly string[];
  readonly scars: readonly string[];
}

export interface MetaError {
  readonly code: 'META_INVALID_RUN' | 'META_RNG';
  readonly message: string;
}
function fail(code: MetaError['code'], message: string): Result<never, MetaError> {
  return err({ code, message });
}

const NAMES = ['The Drowned Choir', 'The Iron Leviathan', 'The Hollow Crown', 'The Salt Plague', 'The Last Cartographer'];
const TRAITS = ['relentless', 'adaptive', 'patient', 'hungry', 'silent', 'many-eyed'];

/** TKT-M32: угроза детерминированно строится из финала и статистики забега. */
export function generateMetaThreat(
  ending: EndingChoice,
  stats: RunStats,
  rng: IRngService,
): Result<MetaThreat, MetaError> {
  if (stats.reputation < 0 || stats.cataclysmsSurvived < 0) return fail('META_INVALID_RUN', 'Invalid run stats');
  const stream = makeStreamName('rng.meta.threat');
  const name = rng.pickOne(stream, NAMES);
  const traitA = rng.pickOne(stream, TRAITS);
  const traitB = rng.pickOne(stream, TRAITS);
  if (!name.ok || !traitA.ok || !traitB.ok) return fail('META_RNG', 'RNG failed');
  const level = Math.max(1, Math.min(10, 1 + Math.round(stats.cataclysmsSurvived * 0.8 + stats.companionDeaths * 0.5 + ending.threatBias)));
  const traits = [...new Set([traitA.value, traitB.value])];
  return ok({
    id: `threat:${ending.tag}:${level}`,
    name: name.value,
    level,
    traits,
    modifiers: {
      pressure: level * 5,
      reputationPenalty: Math.round(level * 1.5),
      lootBonus: Math.round(stats.loreFragments * 2 + level),
    },
  });
}

export function buildCarryover(ending: EndingChoice, threat: MetaThreat, metaUnlocks: readonly string[] = []): Carryover {
  return {
    threatLevel: threat.level,
    endingTag: ending.tag,
    metaUnlocks: [...metaUnlocks],
    scars: [`threat:${threat.traits[0] ?? 'unknown'}`],
  };
}

export interface NextRunSeed {
  readonly threatLevel: number;
  readonly unlocked: readonly string[];
}

export function applyCarryover(carryover: Carryover): NextRunSeed {
  return { threatLevel: carryover.threatLevel, unlocked: [...carryover.metaUnlocks] };
}

export function threatPressurePerTick(threat: MetaThreat): number {
  return Math.round(threat.level / 2);
}
