import { err, ok, type Result } from '../result/Result.js';

/** TKT-M20: давление → катастрофа → эскалация → разрешение. */
export type CataclysmStage = 'dormant' | 'warning' | 'impact' | 'aftermath' | 'resolved';
export type CataclysmType = 'storm' | 'plague' | 'earthquake' | 'arcane_rift' | 'famine';

export interface CataclysmState {
  readonly id: string;
  readonly type: CataclysmType;
  readonly nodeId: string;
  pressure: number;
  stage: CataclysmStage;
  escalation: number;
  severity: number;
  ticksInStage: number;
  readonly events: string[];
}

export interface CataclysmError {
  readonly code: 'CATA_INVALID_STAGE' | 'CATA_INVALID_PRESSURE';
  readonly message: string;
}
function fail(code: CataclysmError['code'], message: string): Result<never, CataclysmError> {
  return err({ code, message });
}

export function createCataclysm(id: string, type: CataclysmType, nodeId: string): CataclysmState {
  return { id, type, nodeId, pressure: 0, stage: 'dormant', escalation: 0, severity: 1, ticksInStage: 0, events: [] };
}

export function addPressure(cataclysm: CataclysmState, delta: number): Result<number, CataclysmError> {
  if (!Number.isFinite(delta)) return fail('CATA_INVALID_PRESSURE', `Invalid pressure delta: ${delta}`);
  if (cataclysm.stage === 'resolved') return ok(cataclysm.pressure);
  cataclysm.pressure = Math.max(0, Math.min(120, cataclysm.pressure + delta));
  if (cataclysm.stage === 'dormant' && cataclysm.pressure >= 40) {
    cataclysm.stage = 'warning';
    cataclysm.ticksInStage = 0;
    cataclysm.events.push(`${cataclysm.id}:warning`);
  }
  if ((cataclysm.stage === 'warning' || cataclysm.stage === 'dormant') && cataclysm.pressure >= 100) {
    cataclysm.stage = 'impact';
    cataclysm.ticksInStage = 0;
    cataclysm.events.push(`${cataclysm.id}:impact`);
  }
  return ok(cataclysm.pressure);
}

export interface CataclysmTickResult {
  readonly stage: CataclysmStage;
  readonly escalated: boolean;
  readonly resolved: boolean;
}

/** TKT-M20: эскалация в impact и переход в aftermath. */
export function tickCataclysm(cataclysm: CataclysmState, stabilizers = 0): Result<CataclysmTickResult, CataclysmError> {
  cataclysm.ticksInStage += 1;
  let escalated = false;
  if (cataclysm.stage === 'impact') {
    if (cataclysm.ticksInStage % 2 === 0) {
      cataclysm.escalation += 1;
      cataclysm.severity += 1;
      escalated = true;
      cataclysm.events.push(`${cataclysm.id}:escalated:${cataclysm.escalation}`);
    }
    if (cataclysm.ticksInStage >= 3) {
      cataclysm.stage = 'aftermath';
      cataclysm.ticksInStage = 0;
      cataclysm.events.push(`${cataclysm.id}:aftermath`);
    }
  } else if (cataclysm.stage === 'aftermath') {
    cataclysm.pressure = Math.max(0, cataclysm.pressure - 20 - stabilizers);
    if (cataclysm.pressure <= 10) {
      cataclysm.stage = 'resolved';
      cataclysm.ticksInStage = 0;
      cataclysm.events.push(`${cataclysm.id}:resolved`);
    }
  }
  return ok({ stage: cataclysm.stage, escalated, resolved: cataclysm.stage === 'resolved' });
}

/** TKT-M20: последствия по стадиям, без дублей. */
export function recordConsequence(cataclysm: CataclysmState, consequence: string): boolean {
  const key = `${cataclysm.stage}:${consequence}`;
  if (cataclysm.events.includes(key)) return false;
  cataclysm.events.push(key);
  return true;
}

export function advanceTo(cataclysm: CataclysmState, stage: CataclysmStage): Result<void, CataclysmError> {
  const order: readonly CataclysmStage[] = ['dormant', 'warning', 'impact', 'aftermath', 'resolved'];
  if (!order.includes(stage)) return fail('CATA_INVALID_STAGE', `Unknown stage: ${stage}`);
  if (order.indexOf(stage) < order.indexOf(cataclysm.stage)) return fail('CATA_INVALID_STAGE', `Cannot go back to ${stage}`);
  cataclysm.stage = stage;
  cataclysm.ticksInStage = 0;
  cataclysm.events.push(`${cataclysm.id}:${stage}`);
  return ok(undefined);
}
