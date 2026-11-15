import { err, ok, type Result } from '../../domain/result/Result.js';
import { economyError, type EconomyError } from '../../domain/economy/EconomyErrors.js';
import type { IContentRegistry } from '../../domain/content/IContentRegistry.js';
import type { ProductionChainDefinition } from '../../domain/economy/ProductionChainDefinition.js';

/**
 * TKT-M5-004: граф-проверки производственной цепочки.
 * topo-sort детект цикла + связность подграфа рецептов + существование referenced id (ECON-CHAIN-INVALID).
 */

interface RecipeFlow {
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
}

function goodIdsIo(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const io = item as Record<string, unknown> | null;
    if (io && typeof io.good_id === 'string') out.push(io.good_id);
  }
  return out;
}

function recipeFlow(raw: Record<string, unknown>): RecipeFlow {
  return { inputs: goodIdsIo(raw.inputs), outputs: goodIdsIo(raw.outputs) };
}

/** Kahn topo-sort: возвращает true, если в графе producer→consumer есть цикл. */
function hasCycle(recipeIds: readonly string[], flows: ReadonlyMap<string, RecipeFlow>): boolean {
  const idx = new Map<string, number>();
  recipeIds.forEach((id, i) => idx.set(id, i));
  const size = recipeIds.length;
  const adj: number[][] = Array.from({ length: size }, () => []);
  const indegree = new Array<number>(size).fill(0);

  for (const producer of recipeIds) {
    const flow = flows.get(producer);
    if (!flow) continue;
    const produced = new Set(flow.outputs);
    for (const consumer of recipeIds) {
      const cFlow = flows.get(consumer);
      if (!cFlow) continue;
      if (cFlow.inputs.some((g) => produced.has(g))) {
        const from = idx.get(producer)!;
        const to = idx.get(consumer)!;
        adj[from].push(to);
        indegree[to] += 1;
      }
    }
  }

  const queue: number[] = [];
  for (let i = 0; i < size; i++) if (indegree[i] === 0) queue.push(i);
  let seen = 0;
  while (queue.length > 0) {
    const node = queue.shift()!;
    seen += 1;
    for (const next of adj[node]) {
      indegree[next] -= 1;
      if (indegree[next] === 0) queue.push(next);
    }
  }
  return seen < size;
}

/** Связность: рецепты соединены (ненаправленно), если выход одного совпадает с входом другого. */
function isConnected(recipeIds: readonly string[], flows: ReadonlyMap<string, RecipeFlow>): boolean {
  if (recipeIds.length === 0) return true;
  const adj = new Map<string, string[]>();
  for (const a of recipeIds) adj.set(a, []);

  for (let i = 0; i < recipeIds.length; i++) {
    const a = recipeIds[i];
    const aFlow = flows.get(a);
    const aOut = new Set(aFlow?.outputs ?? []);
    const aIn = new Set(aFlow?.inputs ?? []);
    for (let j = i + 1; j < recipeIds.length; j++) {
      const b = recipeIds[j];
      const bFlow = flows.get(b);
      if (!bFlow) continue;
      const connected =
        bFlow.inputs.some((g) => aOut.has(g)) || bFlow.outputs.some((g) => aIn.has(g));
      if (connected) {
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
      }
    }
  }

  const visited = new Set<string>([recipeIds[0]]);
  const stack = [recipeIds[0]];
  while (stack.length > 0) {
    const node = stack.pop()!;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return visited.size === recipeIds.length;
}

export function validateChainGraph(
  chain: ProductionChainDefinition,
  registry: IContentRegistry,
): Result<void, EconomyError> {
  for (const recipeId of chain.recipeIds) {
    if (!registry.has('recipe', recipeId)) {
      return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: recipe ${recipeId} not found`));
    }
  }
  for (const goodId of [...chain.entryGoodIds, ...chain.exitGoodIds]) {
    if (!registry.has('good', goodId)) {
      return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: good ${goodId} not found`));
    }
  }

  const flows = new Map<string, RecipeFlow>();
  for (const recipeId of chain.recipeIds) {
    const got = registry.get<Record<string, unknown>>('recipe', recipeId);
    if (!got.ok) {
      return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: cannot read recipe ${recipeId}`));
    }
    const flow = recipeFlow(got.value);
    for (const goodId of [...flow.inputs, ...flow.outputs]) {
      if (!registry.has('good', goodId)) {
        return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: good ${goodId} not found`));
      }
    }
    flows.set(recipeId, flow);
  }

  if (hasCycle(chain.recipeIds, flows)) {
    return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: cycle detected`));
  }
  if (!isConnected(chain.recipeIds, flows)) {
    return err(economyError('ECON_CHAIN_INVALID', `Chain ${chain.id}: recipe subgraph is disconnected`));
  }
  return ok(undefined);
}

/** ECON-INV-06: каждый рецепт принадлежит ровно одной цепочке. */
export function validateRecipeOwnership(
  chains: readonly ProductionChainDefinition[],
  registry: IContentRegistry,
): Result<void, EconomyError> {
  const owner = new Map<string, string>();
  for (const chain of chains) {
    for (const recipeId of chain.recipeIds) {
      if (owner.has(recipeId)) {
        return err(
          economyError('ECON_CHAIN_INVALID', `Recipe ${recipeId} belongs to multiple chains`),
        );
      }
      owner.set(recipeId, chain.id);
    }
  }
  for (const entry of registry.list('recipe')) {
    if (!owner.has(entry.id)) {
      return err(economyError('ECON_CHAIN_INVALID', `Recipe ${entry.id} not in any chain`));
    }
  }
  return ok(undefined);
}
