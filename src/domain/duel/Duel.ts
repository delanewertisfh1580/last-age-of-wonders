import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M25: фехтование, доктрины и абордажные средства. */
export type FencingMove = 'thrust' | 'parry' | 'feint' | 'riposte';
export type DuelDoctrine = 'aggressive' | 'defensive' | 'balanced';

export interface Duelist {
  readonly id: string;
  readonly name: string;
  stamina: number;
  poise: number;
  readonly maxPoise: number;
  readonly doctrine: DuelDoctrine;
  boardingTool: number;
}

export interface DuelState {
  round: number;
  readonly left: Duelist;
  readonly right: Duelist;
  readonly log: string[];
  winner?: string;
}

export interface DuelError {
  readonly code: 'DUEL_INVALID_MOVE' | 'DUEL_FINISHED';
  readonly message: string;
}
function fail(code: DuelError['code'], message: string): Result<never, DuelError> {
  return err({ code, message });
}

export function createDuelist(input: Omit<Duelist, 'stamina' | 'poise' | 'maxPoise' | 'boardingTool'> & { poise: number; boardingTool?: number }): Duelist {
  return { ...input, stamina: 100, poise: input.poise, maxPoise: input.poise, boardingTool: input.boardingTool ?? 0 };
}

const COUNTERS: Readonly<Record<FencingMove, readonly FencingMove[]>> = {
  thrust: ['feint'],
  parry: ['thrust'],
  feint: ['riposte'],
  riposte: ['parry'],
};

export function createDuel(left: Duelist, right: Duelist): DuelState {
  return { round: 0, left, right, log: [] };
}

interface MoveOutcome {
  readonly attacker: Duelist;
  readonly defender: Duelist;
  readonly damage: number;
  readonly countered: boolean;
}

function resolveMove(attacker: Duelist, defender: Duelist, move: FencingMove, counter: FencingMove, roll: number): MoveOutcome {
  const doctrineBonus = attacker.doctrine === 'aggressive' ? 1.25 : attacker.doctrine === 'defensive' ? 0.85 : 1;
  const countered = COUNTERS[move].includes(counter);
  const boarding = move === 'thrust' ? attacker.boardingTool : 0;
  const base = countered ? 4 : Math.round((8 + roll * 8 + boarding) * doctrineBonus);
  const staminaCost = move === 'riposte' ? 6 : move === 'parry' ? 3 : 5;
  attacker.stamina = Math.max(0, attacker.stamina - staminaCost);
  defender.poise = Math.max(0, defender.poise - base);
  return { attacker, defender, damage: base, countered };
}

/** TKT-M25: раунд дуэли — контр-приёмы, стойкость и доктрины. */
export function duelRound(state: DuelState, rng: IRngService, leftMove: FencingMove, rightMove: FencingMove): Result<DuelState, DuelError> {
  if (state.winner) return fail('DUEL_FINISHED', 'Duel already finished');
  state.round += 1;
  const stream = makeStreamName('rng.combat.duel');
  const leftRoll = rng.nextFloat(stream);
  const rightRoll = rng.nextFloat(stream);
  if (!leftRoll.ok || !rightRoll.ok) return fail('DUEL_INVALID_MOVE', 'RNG failed');

  const left = resolveMove(state.left, state.right, leftMove, rightMove, leftRoll.value);
  const right = resolveMove(state.right, state.left, rightMove, leftMove, rightRoll.value);
  state.log.push(`r${state.round}:${leftMove}/${rightMove}:${left.damage}/${right.damage}`);

  if (state.left.poise === 0 && state.right.poise === 0) {
    state.winner = state.left.stamina === state.right.stamina ? 'draw' : state.left.stamina > state.right.stamina ? state.left.id : state.right.id;
  } else if (state.right.poise === 0) {
    state.winner = state.left.id;
  } else if (state.left.poise === 0) {
    state.winner = state.right.id;
  }
  if (state.winner) state.log.push(`winner:${state.winner}`);
  return ok(state);
}

/** TKT-M25: абордажные средства усиливают thrust. */
export function equipBoardingTool(duelist: Duelist, power: number): Duelist {
  duelist.boardingTool = Math.max(0, power);
  return duelist;
}

export function runDuel(
  state: DuelState,
  rng: IRngService,
  moves: readonly [FencingMove, FencingMove][] = [['thrust', 'parry'], ['feint', 'thrust'], ['riposte', 'feint']],
): Result<DuelState, DuelError> {
  for (let i = 0; i < moves.length && !state.winner; i++) {
    const move = moves[i];
    const result = duelRound(state, rng, move[0], move[1]);
    if (!result.ok) return result;
  }
  if (!state.winner) {
    state.winner = state.left.poise === state.right.poise ? 'draw' : state.left.poise > state.right.poise ? state.left.id : state.right.id;
  }
  return ok(state);
}
