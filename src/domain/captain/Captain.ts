import { err, ok, type Result } from '../result/Result.js';

/** TKT-M27: капитан — возраст, репутация, клятвы, пенсия. */
export interface CaptainState {
  readonly id: string;
  name: string;
  age: number;
  reputation: number;
  readonly skills: Record<string, number>;
  readonly vows: Vow[];
  retired: boolean;
  ticksAlive: number;
}

export interface Vow {
  readonly id: string;
  readonly description: string;
  readonly reputationReward: number;
  readonly condition: 'protect_crew' | 'no_retreat' | 'pay_debts';
  fulfilled: boolean;
  broken: boolean;
}

export interface CaptainError {
  readonly code: 'CAPTAIN_RETIRED' | 'CAPTAIN_VOW_UNKNOWN' | 'CAPTAIN_INVALID';
  readonly message: string;
}
function fail(code: CaptainError['code'], message: string): Result<never, CaptainError> {
  return err({ code, message });
}

export function createCaptain(id: string, name: string, age = 32, reputation = 30): CaptainState {
  return { id, name, age, reputation, skills: { seamanship: 3, combat: 3, leadership: 3 }, vows: [], retired: false, ticksAlive: 0 };
}

/** TKT-M27: старение и деградация навыков после 50 лет. */
export function ageCaptain(captain: CaptainState, ticksPerYear = 10): Result<{ age: number; skillLoss: number }, CaptainError> {
  if (captain.retired) return fail('CAPTAIN_RETIRED', 'Captain retired');
  captain.ticksAlive += 1;
  if (captain.ticksAlive % ticksPerYear !== 0) return ok({ age: captain.age, skillLoss: 0 });
  captain.age += 1;
  let skillLoss = 0;
  if (captain.age > 50 && captain.age % 2 === 0) {
    for (const key of Object.keys(captain.skills)) {
      if (captain.skills[key] > 1) {
        captain.skills[key] -= 1;
        skillLoss += 1;
      }
    }
  }
  if (captain.age >= 70) captain.retired = true;
  return ok({ age: captain.age, skillLoss });
}

export function changeReputation(captain: CaptainState, delta: number): number {
  captain.reputation = Math.max(0, Math.min(100, captain.reputation + delta));
  return captain.reputation;
}

export function swearVow(captain: CaptainState, vow: Vow): Result<Vow, CaptainError> {
  if (captain.retired) return fail('CAPTAIN_RETIRED', 'Captain retired');
  if (captain.vows.some((existing) => existing.id === vow.id)) return fail('CAPTAIN_INVALID', `Duplicate vow: ${vow.id}`);
  captain.vows.push({ ...vow });
  return ok(vow);
}

/** TKT-M27: клятва либо исполняется, либо ломается и бьёт по репутации. */
export function resolveVow(captain: CaptainState, vowId: string, fulfilled: boolean): Result<Vow, CaptainError> {
  const vow = captain.vows.find((entry) => entry.id === vowId);
  if (!vow) return fail('CAPTAIN_VOW_UNKNOWN', `Unknown vow: ${vowId}`);
  if (vow.fulfilled || vow.broken) return ok(vow);
  if (fulfilled) {
    vow.fulfilled = true;
    changeReputation(captain, vow.reputationReward);
  } else {
    vow.broken = true;
    changeReputation(captain, -Math.round(vow.reputationReward / 2));
  }
  return ok(vow);
}

export interface Pension {
  readonly years: number;
  readonly amount: number;
  readonly legacy: readonly string[];
}

/** TKT-M27: пенсия зависит от стажа и репутации; клятвы дают наследие. */
export function computePension(captain: CaptainState, baseSalary: number): Pension {
  const years = Math.max(0, captain.age - 20);
  const amount = Math.round(baseSalary * years * 0.1 * (1 + captain.reputation / 100));
  const legacy = captain.vows.filter((vow) => vow.fulfilled).map((vow) => `legacy:${vow.id}`);
  return { years, amount, legacy };
}

export function retire(captain: CaptainState): Pension {
  captain.retired = true;
  return computePension(captain, 50);
}
