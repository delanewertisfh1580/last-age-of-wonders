import { err, ok, type Result } from '../result/Result.js';

/** TKT-M17-002/003/004: DAG веток, разблокировка и пути получения. */
export interface BranchNode {
  readonly id: string;
  readonly requires: readonly string[];
  readonly cost: number;
  readonly signatureMechanic?: string;
  readonly emits?: readonly string[];
}

export interface BranchState {
  readonly faction: string;
  points: number;
  readonly unlocked: string[];
  readonly signatures: string[];
  readonly events: string[];
}

export interface BranchError {
  readonly code: 'BRANCH_UNKNOWN' | 'BRANCH_PREREQ' | 'BRANCH_POINTS' | 'BRANCH_CYCLE' | 'BRANCH_ACQUISITION';
  readonly message: string;
}
function fail(code: BranchError['code'], message: string): Result<never, BranchError> {
  return err({ code, message });
}

export function createBranchState(faction: string, points: number): BranchState {
  return { faction, points, unlocked: [], signatures: [], events: [] };
}

/** ТКT-M17-002: проверка DAG (циклы и неизвестные зависимости). */
export function validateBranchTree(nodes: readonly BranchNode[]): Result<void, BranchError> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    for (const requirement of node.requires) {
      if (!byId.has(requirement)) return fail('BRANCH_UNKNOWN', `Unknown prerequisite: ${requirement}`);
    }
  }
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (id: string): BranchError | null => {
    if (done.has(id)) return null;
    if (visiting.has(id)) return { code: 'BRANCH_CYCLE', message: `Cycle at ${id}` };
    visiting.add(id);
    for (const requirement of byId.get(id)?.requires ?? []) {
      const issue = visit(requirement);
      if (issue) return issue;
    }
    visiting.delete(id);
    done.add(id);
    return null;
  };
  for (const node of nodes) {
    const issue = visit(node.id);
    if (issue) return err(issue);
  }
  return ok(undefined);
}

export function canUnlock(state: BranchState, node: BranchNode): boolean {
  return node.requires.every((requirement) => state.unlocked.includes(requirement)) && state.points >= node.cost;
}

/** TKT-M17-002/004: разблокировка узла и signature-механики. */
export function unlockNode(state: BranchState, node: BranchNode): Result<BranchState, BranchError> {
  if (state.unlocked.includes(node.id)) return ok(state);
  if (!node.requires.every((requirement) => state.unlocked.includes(requirement))) {
    return fail('BRANCH_PREREQ', `Missing prerequisites for ${node.id}`);
  }
  if (state.points < node.cost) return fail('BRANCH_POINTS', `Need ${node.cost}, have ${state.points}`);
  state.points -= node.cost;
  state.unlocked.push(node.id);
  if (node.signatureMechanic) state.signatures.push(node.signatureMechanic);
  for (const event of node.emits ?? [`branch.unlocked.${node.id}`]) state.events.push(event);
  return ok(state);
}

export type AcquisitionKind = 'quest' | 'battle' | 'purchase' | 'exploration';

export interface AcquisitionPath {
  readonly id: string;
  readonly kind: AcquisitionKind;
  readonly nodeId: string;
  readonly minReputation?: number;
  readonly cost?: number;
}

export interface AcquisitionContext {
  readonly reputation: number;
  readonly gold: number;
  readonly completedQuests: readonly string[];
}

/** TKT-M17-003: выбор доступного пути получения ветки. */
export function resolveAcquisition(
  paths: readonly AcquisitionPath[],
  context: AcquisitionContext,
): Result<AcquisitionPath, BranchError> {
  const available = paths.filter((path) => {
    if ((path.minReputation ?? 0) > context.reputation) return false;
    if ((path.cost ?? 0) > context.gold) return false;
    if (path.kind === 'quest' && !context.completedQuests.includes(path.id)) return false;
    return true;
  });
  const chosen = available[0];
  if (!chosen) return fail('BRANCH_ACQUISITION', 'No acquisition path available');
  return ok(chosen);
}
