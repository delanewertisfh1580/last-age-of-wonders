import { err, ok, type Result } from '../result/Result.js';

/** TKT-M28: триггер → древо ветки → трансформация → мета-слой. */
export interface HiddenTrigger {
  readonly minReputation?: number;
  readonly cataclysmsSurvived?: number;
  readonly companionDeaths?: number;
  readonly minLoreFragments?: number;
}

export interface HiddenContext {
  readonly reputation: number;
  readonly cataclysmsSurvived: number;
  readonly companionDeaths: number;
  readonly loreFragments: number;
}

export interface HiddenNode {
  readonly id: string;
  readonly requires: readonly string[];
  readonly cost: number;
  readonly insight: string;
}

export interface HiddenBranchState {
  readonly id: string;
  triggered: boolean;
  insight: number;
  readonly unlocked: string[];
  readonly insights: string[];
  transformed: boolean;
  transformation?: string;
  readonly metaUnlocks: string[];
}

export interface HiddenError {
  readonly code: 'HIDDEN_NOT_TRIGGERED' | 'HIDDEN_NODE_UNKNOWN' | 'HIDDEN_PREREQ' | 'HIDDEN_INSIGHT' | 'HIDDEN_FINAL_MISSING';
  readonly message: string;
}
function fail(code: HiddenError['code'], message: string): Result<never, HiddenError> {
  return err({ code, message });
}

export function createHiddenBranch(id: string, insight = 0): HiddenBranchState {
  return { id, triggered: false, insight, unlocked: [], insights: [], transformed: false, metaUnlocks: [] };
}

/** TKT-M28: проверка условий скрытого триггера. */
export function checkTrigger(trigger: HiddenTrigger, context: HiddenContext): boolean {
  return (
    (trigger.minReputation ?? 0) <= context.reputation &&
    (trigger.cataclysmsSurvived ?? 0) <= context.cataclysmsSurvived &&
    (trigger.companionDeaths ?? 0) <= context.companionDeaths &&
    (trigger.minLoreFragments ?? 0) <= context.loreFragments
  );
}

export function triggerBranch(state: HiddenBranchState, trigger: HiddenTrigger, context: HiddenContext): Result<HiddenBranchState, HiddenError> {
  if (!checkTrigger(trigger, context)) return fail('HIDDEN_NOT_TRIGGERED', 'Trigger conditions not met');
  state.triggered = true;
  return ok(state);
}

export function unlockHiddenNode(
  state: HiddenBranchState,
  node: HiddenNode,
  nodes: ReadonlyMap<string, HiddenNode>,
): Result<HiddenBranchState, HiddenError> {
  if (!state.triggered) return fail('HIDDEN_NOT_TRIGGERED', 'Branch is not triggered');
  if (!nodes.has(node.id)) return fail('HIDDEN_NODE_UNKNOWN', `Unknown node: ${node.id}`);
  if (state.unlocked.includes(node.id)) return ok(state);
  if (!node.requires.every((requirement) => state.unlocked.includes(requirement))) {
    return fail('HIDDEN_PREREQ', `Missing prerequisites for ${node.id}`);
  }
  if (state.insight < node.cost) return fail('HIDDEN_INSIGHT', `Need ${node.cost} insight, have ${state.insight}`);
  state.insight -= node.cost;
  state.unlocked.push(node.id);
  state.insights.push(node.insight);
  return ok(state);
}

/** TKT-M28: финальная трансформация требует все узлы ветки. */
export function transform(
  state: HiddenBranchState,
  nodes: ReadonlyMap<string, HiddenNode>,
  transformation: string,
  metaUnlocks: readonly string[] = [],
): Result<HiddenBranchState, HiddenError> {
  const missing = [...nodes.keys()].filter((id) => !state.unlocked.includes(id));
  if (missing.length > 0) return fail('HIDDEN_FINAL_MISSING', `Missing nodes: ${missing.join(',')}`);
  state.transformed = true;
  state.transformation = transformation;
  state.metaUnlocks.push(...metaUnlocks);
  return ok(state);
}

export function branchProgress(state: HiddenBranchState, totalNodes: number): number {
  return totalNodes === 0 ? 0 : Math.round((state.unlocked.length / totalNodes) * 100);
}
