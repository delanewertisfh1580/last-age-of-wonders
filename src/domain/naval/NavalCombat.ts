import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M16-002/003/004/005: FSM боя, урон и исходы. */
export type EncounterPhase = 'approach' | 'broadside' | 'boarding' | 'resolved';
export type EncounterOutcome = 'victory' | 'defeat' | 'draw';

export interface Combatant {
  readonly id: string;
  hp: number;
  readonly armor: number;
  readonly power: number;
  readonly morale: number;
  boarding: number;
}

export interface EncounterState {
  readonly id: string;
  phase: EncounterPhase;
  round: number;
  readonly attacker: Combatant;
  readonly defender: Combatant;
  readonly log: string[];
  outcome?: EncounterOutcome;
}

export interface NavalError {
  readonly code: 'NAVAL_INVALID_PHASE' | 'NAVAL_INVALID_DAMAGE';
  readonly message: string;
}
function fail(code: NavalError['code'], message: string): Result<never, NavalError> {
  return err({ code, message });
}

export function createCombatant(input: Omit<Combatant, 'boarding'> & { boarding?: number }): Combatant {
  return { ...input, boarding: input.boarding ?? 1 };
}

export function createEncounter(id: string, attacker: Combatant, defender: Combatant): EncounterState {
  return { id, phase: 'approach', round: 0, attacker, defender, log: [] };
}

const ORDER: readonly EncounterPhase[] = ['approach', 'broadside', 'boarding', 'resolved'];

export function advancePhase(encounter: EncounterState): Result<EncounterPhase, NavalError> {
  const index = ORDER.indexOf(encounter.phase);
  if (index < 0 || encounter.phase === 'resolved') return fail('NAVAL_INVALID_PHASE', `Cannot advance from ${encounter.phase}`);
  encounter.phase = ORDER[index + 1];
  encounter.log.push(`phase:${encounter.phase}`);
  return ok(encounter.phase);
}

export interface DamageBreakdown {
  readonly base: number;
  readonly doctrineBonus: number;
  readonly critical: number;
  readonly absorbed: number;
  readonly total: number;
}

/** TKT-M16-003: слои урона — база, доктрина, крит, броня. */
export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  rng: IRngService,
  doctrineBonus = 0,
): Result<DamageBreakdown, NavalError> {
  if (attacker.power <= 0) return fail('NAVAL_INVALID_DAMAGE', 'Attacker has no power');
  const stream = makeStreamName('rng.combat.damage');
  const roll = rng.nextFloat(stream);
  const critRoll = rng.nextFloat(stream);
  if (!roll.ok || !critRoll.ok) return fail('NAVAL_INVALID_DAMAGE', 'RNG failed');
  const base = Math.round(attacker.power * (0.8 + roll.value * 0.4));
  const doctrine = Math.round(base * doctrineBonus);
  const critical = critRoll.value > 0.85 ? Math.round(base * 0.5) : 0;
  const absorbed = Math.min(defender.armor, base + doctrine + critical);
  return ok({ base, doctrineBonus: doctrine, critical, absorbed, total: Math.max(1, base + doctrine + critical - absorbed) });
}

/** TKT-M16-004/005: раунды до исхода, журнал и мораль. */
export function resolveRound(encounter: EncounterState, rng: IRngService, doctrineBonus = 0): Result<DamageBreakdown, NavalError> {
  if (encounter.phase === 'resolved') return fail('NAVAL_INVALID_PHASE', 'Encounter already resolved');
  encounter.round += 1;
  if (encounter.phase === 'approach') advancePhase(encounter);

  const strike = calculateDamage(encounter.attacker, encounter.defender, rng, doctrineBonus);
  if (!strike.ok) return strike;
  encounter.defender.hp = Math.max(0, encounter.defender.hp - strike.value.total);
  encounter.log.push(`round:${encounter.round}:damage:${strike.value.total}`);

  const counter = calculateDamage(encounter.defender, encounter.attacker, rng);
  if (counter.ok) {
    encounter.attacker.hp = Math.max(0, encounter.attacker.hp - counter.value.total);
    encounter.log.push(`round:${encounter.round}:counter:${counter.value.total}`);
  }
  if (encounter.defender.hp === 0 || encounter.attacker.hp === 0) {
    encounter.phase = 'resolved';
    encounter.outcome =
      encounter.defender.hp === 0 && encounter.attacker.hp === 0 ? 'draw' : encounter.defender.hp === 0 ? 'victory' : 'defeat';
    encounter.log.push(`resolved:${encounter.outcome}`);
  }
  return strike;
}

export interface NavalEngineResult {
  readonly encounter: EncounterState;
  readonly rounds: number;
}

export function runNavalEncounter(encounter: EncounterState, rng: IRngService, maxRounds = 10): Result<NavalEngineResult, NavalError> {
  let guard = 0;
  while (encounter.phase !== 'resolved' && guard < maxRounds) {
    const round = resolveRound(encounter, rng, 0.1);
    if (!round.ok) return round as Result<NavalEngineResult, NavalError>;
    guard += 1;
    if (encounter.phase === 'broadside') advancePhase(encounter);
  }
  if (encounter.phase !== 'resolved') {
    encounter.phase = 'resolved';
    encounter.outcome = encounter.attacker.hp === encounter.defender.hp ? 'draw' : encounter.attacker.hp > encounter.defender.hp ? 'victory' : 'defeat';
    encounter.log.push(`resolved:${encounter.outcome}:timeout`);
  }
  return ok({ encounter, rounds: guard });
}
