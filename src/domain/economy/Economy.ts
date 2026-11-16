import { err, ok, type Result } from '../result/Result.js';
import type { IRngService } from '../rng/IRngService.js';
import { makeStreamName } from '../rng/RngStreamName.js';

/** TKT-M5-002/006: товар, рецепт, рынок и инвентарь. */
export type GoodId = string;

export interface GoodDefinition {
  readonly id: GoodId;
  readonly basePrice: number;
  readonly tier: number;
  readonly tags: readonly string[];
}

export interface RecipeDefinition {
  readonly id: string;
  readonly inputs: Readonly<Record<GoodId, number>>;
  readonly outputs: Readonly<Record<GoodId, number>>;
  readonly ticks: number;
}

export interface MarketState {
  readonly nodeId: string;
  readonly basePrice: Readonly<Record<GoodId, number>>;
  readonly stock: Record<GoodId, number>;
  readonly demand: Readonly<Record<GoodId, number>>;
  readonly tariff: number;
}

export interface CargoStack {
  qty: number;
  reserved: number;
}

export interface InventoryState {
  money: number;
  readonly items: Record<GoodId, CargoStack>;
}

export type EconomyErrorCode =
  | 'ECON_UNKNOWN_GOOD'
  | 'ECON_INSUFFICIENT_FUNDS'
  | 'ECON_INSUFFICIENT_STOCK'
  | 'ECON_INSUFFICIENT_CARGO'
  | 'ECON_CARGO_OVERFLOW'
  | 'ECON_INVALID_QUANTITY'
  | 'ECON_INVARIANT_VIOLATION'
  | 'ECON_RECIPE_CYCLE';

export interface EconomyError {
  readonly code: EconomyErrorCode;
  readonly message: string;
}

function fail(code: EconomyErrorCode, message: string): Result<never, EconomyError> {
  return err({ code, message });
}

export function createMarket(
  nodeId: string,
  prices: Readonly<Record<GoodId, number>>,
  stock: Readonly<Record<GoodId, number>>,
  demand: Readonly<Record<GoodId, number>> = {},
  tariff = 0,
): MarketState {
  return {
    nodeId,
    basePrice: { ...prices },
    stock: { ...stock },
    demand: { ...demand },
    tariff,
  };
}

export function createInventory(money: number): InventoryState {
  return { money, items: {} };
}

/** TKT-M5-009: цена зависит от запаса и спроса, спред 6% + тариф. */
export function quotePrice(market: MarketState, goodId: GoodId): Result<{ buy: number; sell: number }, EconomyError> {
  const base = market.basePrice[goodId];
  const stock = market.stock[goodId];
  if (base === undefined || stock === undefined) {
    return fail('ECON_UNKNOWN_GOOD', `Unknown good: ${goodId}`);
  }
  const demand = market.demand[goodId] ?? 1;
  const scarcity = clamp(1.6 - stock / 100, 0.55, 1.6);
  const mid = round2(base * scarcity * demand);
  const spread = 0.06;
  return ok({ buy: round2(mid * (1 + spread + market.tariff)), sell: round2(mid * (1 - spread)) });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function stackOf(inventory: InventoryState, goodId: GoodId): CargoStack | undefined {
  return inventory.items[goodId];
}

function ensureStack(inventory: InventoryState, goodId: GoodId): CargoStack {
  const existing = inventory.items[goodId] ?? { qty: 0, reserved: 0 };
  inventory.items[goodId] = existing;
  return existing;
}

/** TKT-M5-010: резерв не может превышать остаток (INV-09/10). */
export function reserve(inventory: InventoryState, goodId: GoodId, qty: number): Result<void, EconomyError> {
  if (!Number.isInteger(qty) || qty <= 0) return fail('ECON_INVALID_QUANTITY', `Invalid reserve qty: ${qty}`);
  const stack = stackOf(inventory, goodId);
  if (!stack || stack.qty - stack.reserved < qty) {
    return fail('ECON_INVARIANT_VIOLATION', `Not enough free stock for ${goodId}`);
  }
  stack.reserved += qty;
  return ok(undefined);
}

export function release(inventory: InventoryState, goodId: GoodId, qty: number): Result<void, EconomyError> {
  if (!Number.isInteger(qty) || qty <= 0) return fail('ECON_INVALID_QUANTITY', `Invalid release qty: ${qty}`);
  const stack = stackOf(inventory, goodId);
  if (!stack || stack.reserved < qty) {
    return fail('ECON_INVARIANT_VIOLATION', `Reserved stock below release for ${goodId}`);
  }
  stack.reserved -= qty;
  return ok(undefined);
}

export function cargoUsed(inventory: InventoryState): number {
  return Object.values(inventory.items).reduce((sum, stack) => sum + stack.qty, 0);
}

export type TradeSide = 'buy' | 'sell';

export interface SpotTradeInput {
  readonly market: MarketState;
  readonly inventory: InventoryState;
  readonly goodId: GoodId;
  readonly qty: number;
  readonly side: TradeSide;
  readonly cargoCapacity?: number;
}

export interface SpotTradeResult {
  readonly unitPrice: number;
  readonly total: number;
  readonly money: number;
}

/** TKT-M5-016: атомарная сделка с проверкой денег, склада и трюма. */
export function executeSpotTrade(input: SpotTradeInput): Result<SpotTradeResult, EconomyError> {
  const { market, inventory, goodId, qty, side } = input;
  if (!Number.isInteger(qty) || qty <= 0) return fail('ECON_INVALID_QUANTITY', `Invalid trade qty: ${qty}`);
  const priceResult = quotePrice(market, goodId);
  if (!priceResult.ok) return priceResult as Result<SpotTradeResult, EconomyError>;
  const price = side === 'buy' ? priceResult.value.buy : priceResult.value.sell;
  const total = round2(price * qty);

  if (side === 'buy') {
    if ((market.stock[goodId] ?? 0) < qty) return fail('ECON_INSUFFICIENT_STOCK', `Market stock low: ${goodId}`);
    if (inventory.money < total) return fail('ECON_INSUFFICIENT_FUNDS', `Need ${total}, have ${inventory.money}`);
    const capacity = input.cargoCapacity ?? Number.POSITIVE_INFINITY;
    if (cargoUsed(inventory) + qty > capacity) return fail('ECON_INSUFFICIENT_CARGO', `Cargo full: ${goodId}`);
    inventory.money = round2(inventory.money - total);
    ensureStack(inventory, goodId).qty += qty;
    market.stock[goodId] = (market.stock[goodId] ?? 0) - qty;
  } else {
    const stack = stackOf(inventory, goodId);
    if (!stack || stack.qty - stack.reserved < qty) return fail('ECON_INSUFFICIENT_STOCK', `No free goods: ${goodId}`);
    stack.qty -= qty;
    inventory.money = round2(inventory.money + total);
    market.stock[goodId] = (market.stock[goodId] ?? 0) + qty;
  }
  return ok({ unitPrice: price, total, money: inventory.money });
}

/** TKT-M5-012: запуск производственной цепочки с топологической проверкой. */
export function runProductionChain(
  recipes: readonly RecipeDefinition[],
  inventory: InventoryState,
  runs: number,
): Result<Readonly<Record<GoodId, number>>, EconomyError> {
  const orderResult = topoSort(recipes);
  if (!orderResult.ok) return orderResult as Result<Readonly<Record<GoodId, number>>, EconomyError>;
  if (!Number.isInteger(runs) || runs <= 0) return fail('ECON_INVALID_QUANTITY', `Invalid runs: ${runs}`);

  const produced: Record<GoodId, number> = {};
  for (const recipe of orderResult.value) {
    for (let run = 0; run < runs; run++) {
      for (const [goodId, qty] of Object.entries(recipe.inputs)) {
        const stack = stackOf(inventory, goodId);
        if (!stack || stack.qty - stack.reserved < qty) {
          return fail('ECON_INSUFFICIENT_STOCK', `Recipe ${recipe.id} lacks ${goodId}`);
        }
      }
      for (const [goodId, qty] of Object.entries(recipe.inputs)) {
        const stack = inventory.items[goodId];
        stack.qty -= qty;
      }
      for (const [goodId, qty] of Object.entries(recipe.outputs)) {
        ensureStack(inventory, goodId).qty += qty;
        produced[goodId] = (produced[goodId] ?? 0) + qty;
      }
    }
  }
  return ok(produced);
}

function topoSort(recipes: readonly RecipeDefinition[]): Result<readonly RecipeDefinition[], EconomyError> {
  const byOutput = new Map<GoodId, string>();
  for (const recipe of recipes) {
    for (const goodId of Object.keys(recipe.outputs)) {
      if (byOutput.has(goodId)) return fail('ECON_INVARIANT_VIOLATION', `Duplicate producer for ${goodId}`);
      byOutput.set(goodId, recipe.id);
    }
  }
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const ordered: RecipeDefinition[] = [];

  const visit = (recipe: RecipeDefinition): EconomyError | null => {
    if (done.has(recipe.id)) return null;
    if (visiting.has(recipe.id)) return { code: 'ECON_RECIPE_CYCLE', message: `Cycle at ${recipe.id}` };
    visiting.add(recipe.id);
    for (const goodId of Object.keys(recipe.inputs)) {
      const producer = byOutput.get(goodId);
      if (producer) {
        const dependency = byId.get(producer);
        if (dependency) {
          const cycle = visit(dependency);
          if (cycle) return cycle;
        }
      }
    }
    visiting.delete(recipe.id);
    done.add(recipe.id);
    ordered.push(recipe);
    return null;
  };

  for (const recipe of recipes) {
    const cycle = visit(recipe);
    if (cycle) return err(cycle);
  }
  return ok(ordered);
}

export interface TradeAgent {
  readonly id: string;
  readonly goodId: GoodId;
  readonly budget: number;
  readonly risk: number;
}

export interface AgentTickResult {
  readonly trades: readonly { agentId: string; qty: number; total: number }[];
  readonly prices: Readonly<Record<GoodId, number>>;
}

/** TKT-M5-013: детерминированная симуляция торговых агентов. */
export function runTradeAgents(
  agents: readonly TradeAgent[],
  market: MarketState,
  inventory: InventoryState,
  rng: IRngService,
  stream = 'rng.economy.trade_agents',
): Result<AgentTickResult, EconomyError> {
  const trades: { agentId: string; qty: number; total: number }[] = [];
  for (const agent of agents) {
    const priceResult = quotePrice(market, agent.goodId);
    if (!priceResult.ok) return priceResult as Result<AgentTickResult, EconomyError>;
    const roll = rng.nextFloat(makeStreamName(stream));
    if (!roll.ok) return fail('ECON_INVARIANT_VIOLATION', roll.error.message);
    if (roll.value > agent.risk) continue;
    const affordable = Math.floor(agent.budget / priceResult.value.buy);
    const qty = Math.min(affordable, market.stock[agent.goodId] ?? 0);
    if (qty <= 0) continue;
    const trade = executeSpotTrade({ market, inventory, goodId: agent.goodId, qty, side: 'buy' });
    if (trade.ok) trades.push({ agentId: agent.id, qty, total: trade.value.total });
  }
  const prices: Record<GoodId, number> = {};
  for (const goodId of Object.keys(market.basePrice)) {
    const quote = quotePrice(market, goodId);
    if (quote.ok) prices[goodId] = quote.value.buy;
  }
  return ok({ trades, prices });
}
