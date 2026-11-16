import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M26: поле боя, элита, влияние дуэли и развязка. */
export type BattleSide = 'party' | 'enemy';
export type BattleFieldZone = 'left' | 'center' | 'right';

export interface BattleSquad {
  readonly id: string;
  readonly side: BattleSide;
  readonly zone: BattleFieldZone;
  strength: number;
  morale: number;
  readonly elite: boolean;
}

export interface DuelInfluence {
  readonly winner: BattleSide | 'draw';
  readonly bonus: number;
}

export interface BattlefieldState {
  round: number;
  readonly squads: BattleSquad[];
  readonly duel: DuelInfluence;
  readonly log: string[];
  winner?: BattleSide | 'draw';
}

export interface BattlefieldError {
  readonly code: 'BATTLE_EMPTY' | 'BATTLE_FINISHED' | 'BATTLE_RNG';
  readonly message: string;
}
function fail(code: BattlefieldError['code'], message: string): Result<never, BattlefieldError> {
  return err({ code, message });
}

export function createBattlefield(squads: readonly BattleSquad[], duel: DuelInfluence): Result<BattlefieldState, BattlefieldError> {
  if (!squads.some((squad) => squad.side === 'party') || !squads.some((squad) => squad.side === 'enemy')) {
    return fail('BATTLE_EMPTY', 'Both sides need squads');
  }
  return ok({ round: 0, squads: squads.map((squad) => ({ ...squad })), duel, log: [] });
}

function strengthOf(state: BattlefieldState, side: BattleSide): number {
  return state.squads.filter((squad) => squad.side === side).reduce((sum, squad) => sum + squad.strength, 0);
}

/** TKT-M26: элита повышает мораль стороны, дуэль добавляет бонус. */
export function sidePower(state: BattlefieldState, side: BattleSide): number {
  const base = strengthOf(state, side);
  const elite = state.squads.filter((squad) => squad.side === side && squad.elite).length;
  const morale = state.squads.filter((squad) => squad.side === side).reduce((sum, squad) => sum + squad.morale, 0) / Math.max(1, state.squads.filter((squad) => squad.side === side).length);
  const duelBonus = state.duel.winner === side ? state.duel.bonus : 0;
  return Math.round((base + elite * 8) * (0.7 + morale / 200) + duelBonus);
}

/** TKT-M26: раунд распределяет урон по зонам. */
export function battleRound(state: BattlefieldState, rng: IRngService): Result<BattlefieldState, BattlefieldError> {
  if (state.winner) return fail('BATTLE_FINISHED', 'Battle already resolved');
  state.round += 1;
  const stream = makeStreamName('rng.combat.battlefield');
  const roll = rng.nextFloat(stream);
  if (!roll.ok) return fail('BATTLE_RNG', roll.error.message);

  const partyPower = sidePower(state, 'party');
  const enemyPower = sidePower(state, 'enemy');
  const partyStrike = Math.round(partyPower * (0.8 + roll.value * 0.4));
  const enemyStrike = Math.round(enemyPower * (1.2 - roll.value * 0.4));

  for (const squad of state.squads) {
    const incoming = squad.side === 'party' ? enemyStrike : partyStrike;
    const share = Math.ceil(incoming / Math.max(1, state.squads.filter((entry) => entry.side === squad.side).length));
    squad.strength = Math.max(0, squad.strength - share);
    squad.morale = Math.max(0, squad.morale - (share > squad.strength ? 10 : 4));
  }
  state.log.push(`r${state.round}:party=${strengthOf(state, 'party')}:enemy=${strengthOf(state, 'enemy')}`);

  if (strengthOf(state, 'party') === 0 || strengthOf(state, 'enemy') === 0) {
    state.winner = strengthOf(state, 'enemy') === 0 && strengthOf(state, 'party') === 0 ? 'draw' : strengthOf(state, 'enemy') === 0 ? 'party' : 'enemy';
    state.log.push(`winner:${state.winner}`);
  } else if (state.round >= 10) {
    state.winner = strengthOf(state, 'party') === strengthOf(state, 'enemy') ? 'draw' : strengthOf(state, 'party') > strengthOf(state, 'enemy') ? 'party' : 'enemy';
    state.log.push(`winner:${state.winner}:timeout`);
  }
  return ok(state);
}

export function runBattlefield(state: BattlefieldState, rng: IRngService): Result<BattlefieldState, BattlefieldError> {
  let guard = 0;
  while (!state.winner && guard < 20) {
    const round = battleRound(state, rng);
    if (!round.ok) return round;
    guard += 1;
  }
  return ok(state);
}

export function applyDuelResult(state: BattlefieldState, winner: BattleSide | 'draw', bonus: number): BattlefieldState {
  return { ...state, duel: { winner, bonus } };
}
