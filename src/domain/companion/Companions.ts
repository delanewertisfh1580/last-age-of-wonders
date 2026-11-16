import { err, ok, type Result } from '../result/Result.js';

/** TKT-M23: отношения, синергия, предательство и наследие. */
export type CompanionEvent = 'gift' | 'shared_meal' | 'bravery' | 'betrayal' | 'crew_death' | 'neglect';

export interface Companion {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
  loyalty: number;
  trust: number;
  alive: boolean;
  legacy?: string;
}

export interface CompanionError {
  readonly code: 'COMPANION_UNKNOWN' | 'COMPANION_DEAD' | 'COMPANION_DUPLICATE';
  readonly message: string;
}
function fail(code: CompanionError['code'], message: string): Result<never, CompanionError> {
  return err({ code, message });
}

const REACTIONS: Readonly<Record<CompanionEvent, { loyalty: number; trust: number }>> = {
  gift: { loyalty: 12, trust: 6 },
  shared_meal: { loyalty: 5, trust: 4 },
  bravery: { loyalty: 10, trust: 8 },
  betrayal: { loyalty: -40, trust: -35 },
  crew_death: { loyalty: -8, trust: -5 },
  neglect: { loyalty: -12, trust: -10 },
};

export function createCompanion(id: string, name: string, tags: readonly string[], loyalty = 50, trust = 50): Companion {
  return { id, name, tags: [...tags], loyalty, trust, alive: true };
}

export function recruitCompanion(roster: Companion[], companion: Companion): Result<Companion, CompanionError> {
  if (roster.some((entry) => entry.id === companion.id)) return fail('COMPANION_DUPLICATE', `Duplicate ${companion.id}`);
  roster.push(companion);
  return ok(companion);
}

export function react(companion: Companion, event: CompanionEvent): Result<Companion, CompanionError> {
  if (!companion.alive) return fail('COMPANION_DEAD', `Companion ${companion.id} is dead`);
  const delta = REACTIONS[event];
  companion.loyalty = clamp(companion.loyalty + delta.loyalty);
  companion.trust = clamp(companion.trust + delta.trust);
  return ok(companion);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** TKT-M23: синергия по общим тегам, до 4 тегов. */
export function synergy(a: Companion, b: Companion): number {
  const shared = a.tags.filter((tag) => b.tags.includes(tag)).length;
  return Math.min(4, shared) * 3;
}

/** TKT-M23: предательство при низкой лояльности и доверии. */
export function checkBetrayal(companion: Companion): boolean {
  return companion.alive && companion.loyalty < 20 && companion.trust < 25;
}

/** TKT-M23: смерть оставляет наследие и передаёт предмет. */
export function dieWithLegacy(companion: Companion, legacy: string): Result<Companion, CompanionError> {
  if (!companion.alive) return fail('COMPANION_DEAD', `Companion ${companion.id} already dead`);
  companion.alive = false;
  companion.legacy = legacy;
  companion.loyalty = 0;
  return ok(companion);
}

export function findCompanion(roster: readonly Companion[], id: string): Result<Companion, CompanionError> {
  const found = roster.find((companion) => companion.id === id);
  if (!found) return fail('COMPANION_UNKNOWN', `Unknown companion: ${id}`);
  return ok(found);
}

export interface CompanionSnapshot {
  readonly roster: readonly Companion[];
}

export function captureCompanions(roster: readonly Companion[]): CompanionSnapshot {
  return JSON.parse(JSON.stringify({ roster })) as CompanionSnapshot;
}

export function restoreCompanions(target: Companion[], snapshot: CompanionSnapshot): void {
  target.splice(0, target.length, ...snapshot.roster.map((companion) => ({ ...companion, tags: [...companion.tags] })));
}
