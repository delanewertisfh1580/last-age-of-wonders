import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M24: фазы боя, слои урона, потери и развязка. */
export type CombatPhase = 'approach' | 'clash' | 'resolution' | 'resolved';
export type CombatOutcome = 'victory' | 'defeat' | 'retreat' | 'draw';

export interface CombatUnit {
  readonly id: string;
  name: string;
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  morale: number;
  alive: boolean;
}

export interface CombatState {
  phase: CombatPhase;
  round: number;
  readonly party: CombatUnit[];
  readonly enemy: CombatUnit[];
  readonly log: string[];
  readonly casualties: string[];
  outcome?: CombatOutcome;
}

export interface CombatError {
  readonly code: 'COMBAT_INVALID_PHASE' | 'COMBAT_EMPTY' | 'COMBAT_RNG';
  readonly message: string;
}
function fail(code: CombatError['code'], message: string): Result<never, CombatError> {
  return err({ code, message });
}

export function createUnit(input: Omit<CombatUnit, 'alive'>): CombatUnit {
  return { ...input, alive: true };
}

export function createCombat(party: CombatUnit[], enemy: CombatUnit[]): Result<CombatState, CombatError> {
  if (party.length === 0 || enemy.length === 0) return fail('COMBAT_EMPTY', 'Both sides need units');
  return ok({ phase: 'approach', round: 0, party, enemy, log: [], casualties: [] });
}

export interface DamageLayers {
  readonly base: number;
  readonly flank: number;
  readonly moraleShock: number;
  readonly absorbed: number;
  readonly total: number;
}

/** TKT-M24: слои урона — база, фланг, моральный шок, защита. */
export function damageLayers(attacker: CombatUnit, defender: CombatUnit, roll: number, flanking: boolean): DamageLayers {
  const base = Math.round(attacker.attack * (0.85 + roll * 0.3));
  const flank = flanking ? Math.round(base * 0.25) : 0;
  const moraleShock = defender.morale < 35 ? Math.round(base * 0.2) : 0;
  const absorbed = Math.min(defender.defense, base + flank + moraleShock);
  return { base, flank, moraleShock, absorbed, total: Math.max(1, base + flank + moraleShock - absorbed) };
}

function alive(units: readonly CombatUnit[]): CombatUnit[] {
  return units.filter((unit) => unit.alive);
}

function strike(defender: CombatUnit, layers: DamageLayers): void {
  defender.hp = Math.max(0, defender.hp - layers.total);
  defender.morale = Math.max(0, defender.morale - Math.round(layers.total / 4));
  if (defender.hp === 0) defender.alive = false;
}

/** TKT-M24: раунд боя с потерями и журналом. */
export function runCombatRound(state: CombatState, rng: IRngService): Result<CombatState, CombatError> {
  if (state.phase === 'resolved') return fail('COMBAT_INVALID_PHASE', 'Combat already resolved');
  if (state.phase === 'approach') state.phase = 'clash';
  state.round += 1;
  const party = alive(state.party);
  const enemy = alive(state.enemy);
  const stream = makeStreamName('rng.combat.damage');

  for (const [index, attacker] of party.entries()) {
    const target = enemy[index % enemy.length];
    if (!target.alive) continue;
    const roll = rng.nextFloat(stream);
    if (!roll.ok) return fail('COMBAT_RNG', roll.error.message);
    const layers = damageLayers(attacker, target, roll.value, index % 2 === 1);
    strike(target, layers);
    if (!target.alive) state.casualties.push(`enemy:${target.id}`);
    else if (target.hp < target.maxHp * 0.25) state.log.push(`wounded:${target.id}`);
  }
  for (const [index, attacker] of alive(state.enemy).entries()) {
    const target = alive(state.party)[index % Math.max(1, alive(state.party).length)];
    if (!target || !target.alive) continue;
    const roll = rng.nextFloat(stream);
    if (!roll.ok) return fail('COMBAT_RNG', roll.error.message);
    const layers = damageLayers(attacker, target, roll.value, index % 3 === 2);
    strike(target, layers);
    if (!target.alive) state.casualties.push(`party:${target.id}`);
  }
  state.log.push(`round:${state.round}:party=${alive(state.party).length}:enemy=${alive(state.enemy).length}`);

  if (alive(state.enemy).length === 0 || alive(state.party).length === 0) {
    state.phase = 'resolution';
    if (alive(state.enemy).length === 0 && alive(state.party).length > 0) state.outcome = 'victory';
    else if (alive(state.party).length === 0 && alive(state.enemy).length > 0) state.outcome = 'defeat';
    else state.outcome = 'draw';
    state.phase = 'resolved';
    state.log.push(`resolved:${state.outcome}`);
  } else if (state.round >= 8) {
    state.phase = 'resolved';
    const partyMorale = alive(state.party).reduce((sum, unit) => sum + unit.morale, 0) / alive(state.party).length;
    state.outcome = partyMorale < 25 ? 'retreat' : 'draw';
    state.log.push(`resolved:${state.outcome}:timeout`);
  }
  return ok(state);
}

export function runCombat(state: CombatState, rng: IRngService): Result<CombatState, CombatError> {
  let guard = 0;
  while (state.phase !== 'resolved' && guard < 20) {
    const round = runCombatRound(state, rng);
    if (!round.ok) return round;
    guard += 1;
  }
  return ok(state);
}
