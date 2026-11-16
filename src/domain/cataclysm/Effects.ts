import { err, ok, type Result } from '../result/Result.js';
import type { CataclysmStage, CataclysmType } from './Lifecycle.js';

/** TKT-M21: эффекты стадий, шрамы узлов и мосты. */
export interface CataclysmEffect {
  readonly id: string;
  readonly type: CataclysmType;
  readonly stage: Exclude<CataclysmStage, 'resolved'>;
  readonly nodeId: string;
  readonly populationLoss: number;
  readonly wealthLoss: number;
  readonly defenseLoss: number;
  readonly severity: number;
}

export interface ScarredNode {
  readonly nodeId: string;
  population: number;
  wealth: number;
  defense: number;
  readonly tags: string[];
}

export interface NodeScar {
  readonly nodeId: string;
  readonly cause: CataclysmType;
  severity: number;
  shock: number;
  bridges: number;
  resolved: boolean;
}

export interface CataclysmEffectError {
  readonly code: 'EFFECT_UNKNOWN_NODE' | 'EFFECT_INVALID';
  readonly message: string;
}
function fail(code: CataclysmEffectError['code'], message: string): Result<never, CataclysmEffectError> {
  return err({ code, message });
}

export interface EffectApplication {
  readonly node: ScarredNode;
  readonly scar: NodeScar;
  readonly changes: { population: number; wealth: number; defense: number };
}

/** TKT-M21: эффект стадии наносит урон узлу и оставляет шрам. */
export function applyCataclysmEffect(
  nodes: Record<string, ScarredNode>,
  scars: Map<string, NodeScar>,
  effect: CataclysmEffect,
): Result<EffectApplication, CataclysmEffectError> {
  const node = nodes[effect.nodeId];
  if (!node) return fail('EFFECT_UNKNOWN_NODE', `Unknown node: ${effect.nodeId}`);
  if (effect.populationLoss < 0 || effect.wealthLoss < 0 || effect.severity <= 0) {
    return fail('EFFECT_INVALID', 'Losses cannot be negative and severity must be positive');
  }
  const population = Math.max(0, Math.round(node.population * (1 - effect.populationLoss) - effect.severity * 10));
  const wealth = Math.max(0, Math.round(node.wealth * (1 - effect.wealthLoss) - effect.severity * 5));
  const defense = Math.max(0, node.defense - effect.defenseLoss);
  const changes = { population: population - node.population, wealth: wealth - node.wealth, defense: defense - node.defense };
  node.population = population;
  node.wealth = wealth;
  node.defense = defense;
  const existing = scars.get(effect.nodeId);
  const scar: NodeScar = existing
    ? { ...existing, severity: existing.severity + effect.severity, shock: Math.min(100, existing.shock + effect.severity * 5), resolved: false }
    : { nodeId: effect.nodeId, cause: effect.type, severity: effect.severity, shock: effect.severity * 5, bridges: 0, resolved: false };
  scars.set(effect.nodeId, scar);
  if (effect.severity >= 3 && !node.tags.includes('scarred')) node.tags.push('scarred');
  return ok({ node, scar, changes });
}

/** TKT-M21: мост восстанавливает узел частями и снижает шок. */
export function buildBridge(scar: NodeScar, node: ScarredNode, investment: number): Result<NodeScar, CataclysmEffectError> {
  if (!Number.isInteger(investment) || investment <= 0) return fail('EFFECT_INVALID', `Invalid investment: ${investment}`);
  scar.bridges += 1;
  scar.shock = Math.max(0, scar.shock - Math.ceil(investment / 10));
  scar.severity = Math.max(0, scar.severity - Math.ceil(investment / 50));
  node.wealth += Math.round(investment * 0.2);
  node.defense += Math.round(investment * 0.05);
  if (scar.severity === 0 && scar.shock === 0) {
    scar.resolved = true;
    const index = node.tags.indexOf('scarred');
    if (index >= 0) node.tags.splice(index, 1);
  }
  return ok(scar);
}

/** TKT-M21: проходимость маршрута зависит от шрама. */
export function routePassable(scar: NodeScar | undefined): boolean {
  return !scar || scar.resolved || scar.shock < 60;
}

export function scarTravelCost(scar: NodeScar | undefined): number {
  if (!scar || scar.resolved) return 0;
  return Math.round(scar.shock / 2 + scar.severity * 3);
}
