import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type {
  GoodDefinition,
  GoodId,
  GoodOrigin,
  GoodTag,
  GoodTier,
} from '../../domain/economy/GoodDefinition.js';
import type {
  RecipeDefinition,
  RecipeInputOutput,
  RecipeKind,
} from '../../domain/economy/RecipeDefinition.js';
import type { ProductionChainDefinition } from '../../domain/economy/ProductionChainDefinition.js';
import type {
  TradeNodeDefinition,
  TradeRouteDefinition,
} from '../../domain/economy/TradeNodeDefinition.js';
import type { InventoryEntry, MarketDefinition, MarketState } from '../../domain/economy/MarketState.js';

/**
 * TKT-M5-002/003/004/005/006: мапперы snake_case-контента → camelCase-типы домена.
 * Шейп-проверка минимальна: контент уже прошёл ajv-валидацию по схемам §6.2.
 */

function requireRecord(raw: unknown, what: string): Result<Record<string, unknown>, AppError> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', `${what} must be an object`));
  }
  return ok(raw as Record<string, unknown>);
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? (value.filter((v) => typeof v === 'string') as string[]) : [];
}

export function parseGoodDefinition(raw: unknown): Result<GoodDefinition, AppError> {
  const rec = requireRecord(raw, 'GoodDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.display_name_key !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'GoodDefinition requires id and display_name_key'));
  }
  return ok({
    id: r.id as GoodId,
    displayNameKey: r.display_name_key,
    tier: r.tier as GoodTier,
    origin: r.origin as GoodOrigin,
    tags: (Array.isArray(r.tags) ? r.tags : []) as GoodTag[],
    basePricePolicyId: r.base_price_policy_id as string,
    contrabandIn: strArray(r.contraband_in),
    unitMassPolicyId: r.unit_mass_policy_id as string,
  });
}

function parseIo(value: unknown): RecipeInputOutput[] {
  if (!Array.isArray(value)) return [];
  const out: RecipeInputOutput[] = [];
  for (const item of value) {
    const io = item as Record<string, unknown> | null;
    if (!io || typeof io.good_id !== 'string' || typeof io.quantity_policy_id !== 'string') continue;
    out.push({ goodId: io.good_id as GoodId, quantityPolicyId: io.quantity_policy_id });
  }
  return out;
}

export function parseRecipeDefinition(raw: unknown): Result<RecipeDefinition, AppError> {
  const rec = requireRecord(raw, 'RecipeDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.display_name_key !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'RecipeDefinition requires id and display_name_key'));
  }
  const loss = r.loss_fraction_policy_id;
  const risk = r.risk_policy_id;
  return ok({
    id: r.id,
    displayNameKey: r.display_name_key,
    inputs: parseIo(r.inputs),
    outputs: parseIo(r.outputs),
    kind: r.kind as RecipeKind,
    originTags: strArray(r.origin_tags) as GoodOrigin[],
    durationPolicyId: r.duration_policy_id as string,
    ...(typeof loss === 'string' ? { lossFractionPolicyId: loss } : {}),
    ...(typeof risk === 'string' ? { riskPolicyId: risk } : {}),
  });
}

export function parseProductionChainDefinition(raw: unknown): Result<ProductionChainDefinition, AppError> {
  const rec = requireRecord(raw, 'ProductionChainDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.display_name_key !== 'string') {
    return err(
      makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'ProductionChainDefinition requires id and display_name_key'),
    );
  }
  // Схема §6.2 фиксирует validation_rules.acyclic/connected через `const: true`.
  return ok({
    id: r.id,
    displayNameKey: r.display_name_key,
    recipeIds: strArray(r.recipe_ids),
    entryGoodIds: strArray(r.entry_good_ids) as GoodId[],
    exitGoodIds: strArray(r.exit_good_ids) as GoodId[],
    factionTags: strArray(r.faction_tags),
    originTags: strArray(r.origin_tags) as GoodOrigin[],
    validationRules: { acyclic: true, connected: true },
  });
}

export function parseTradeNodeDefinition(raw: unknown): Result<TradeNodeDefinition, AppError> {
  const rec = requireRecord(raw, 'TradeNodeDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.display_name_key !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'TradeNodeDefinition requires id and display_name_key'));
  }
  const pos = (r.position as Record<string, unknown> | undefined) ?? {};
  return ok({
    id: r.id,
    displayNameKey: r.display_name_key,
    factionId: r.faction_id as string,
    economyDoctrineId: r.economy_doctrine_id as string,
    portTier: r.port_tier as number,
    marketId: r.market_id as string,
    enterpriseIds: strArray(r.enterprise_ids),
    guildChapterIds: strArray(r.guild_chapter_ids),
    scarIds: strArray(r.scar_ids),
    legalityPolicyId: r.legality_policy_id as string,
    position: { x: pos.x as number, y: pos.y as number },
  });
}

export function parseTradeRouteDefinition(raw: unknown): Result<TradeRouteDefinition, AppError> {
  const rec = requireRecord(raw, 'TradeRouteDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.display_name_key !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'TradeRouteDefinition requires id and display_name_key'));
  }
  return ok({
    id: r.id,
    displayNameKey: r.display_name_key,
    fromNodeId: r.from_node_id as string,
    toNodeId: r.to_node_id as string,
    distancePolicyId: r.distance_policy_id as string,
    riskPolicyId: r.risk_policy_id as string,
    blockedByTags: strArray(r.blocked_by_tags),
    legalityPolicyId: r.legality_policy_id as string,
  });
}

export function parseMarketDefinition(raw: unknown): Result<MarketDefinition, AppError> {
  const rec = requireRecord(raw, 'MarketDefinition');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.id !== 'string' || typeof r.node_id !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'MarketDefinition requires id and node_id'));
  }
  return ok({
    id: r.id,
    nodeId: r.node_id,
    regionalIndexId: r.regional_index_id as string,
    priceClampsPolicyId: r.price_clamps_policy_id as string,
    transactionCostPolicyId: r.transaction_cost_policy_id as string,
    consumptionPolicyId: r.consumption_policy_id as string,
    saturationPolicyId: r.saturation_policy_id as string,
    reversionPolicyId: r.reversion_policy_id as string,
  });
}

type NumEntry = { current: number; trend: number; lastTick: number } | null;

function mapInventory(value: unknown): InventoryEntry | null {
  const e = value as Record<string, unknown> | null;
  if (!e || typeof e.quantity !== 'number' || typeof e.reserved !== 'number') return null;
  return { quantity: e.quantity, reserved: e.reserved };
}

function mapPrice(value: unknown): NumEntry {
  const e = value as Record<string, unknown> | null;
  if (!e) return null;
  return { current: e.current as number, trend: e.trend as number, lastTick: e.last_tick as number };
}

function mapImpact(value: unknown): { soldTotal: number; boughtTotal: number } | null {
  const e = value as Record<string, unknown> | null;
  if (!e || typeof e.sold_total !== 'number' || typeof e.bought_total !== 'number') return null;
  return { soldTotal: e.sold_total, boughtTotal: e.bought_total };
}

function mapRecord<T>(value: unknown, fn: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const mapped = fn(v);
    if (mapped !== null && mapped !== undefined) out[k] = mapped;
  }
  return out;
}

export function parseMarketState(raw: unknown): Result<MarketState, AppError> {
  const rec = requireRecord(raw, 'MarketState');
  if (!rec.ok) return rec;
  const r = rec.value;
  if (typeof r.market_id !== 'string') {
    return err(makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', 'MarketState requires market_id'));
  }
  const knowledge = (r.knowledge as Record<string, unknown> | undefined) ?? {};
  return ok({
    marketId: r.market_id,
    inventories: mapRecord(r.inventories, mapInventory),
    prices: mapRecord(r.prices, mapPrice),
    playerImpact: mapRecord(r.player_impact, mapImpact),
    knowledge: {
      visited: mapRecord((knowledge.visited as Record<string, unknown>) ?? {}, (v) => {
        const e = v as Record<string, unknown> | null;
        if (!e || typeof e.last_seen_price !== 'number' || typeof e.last_seen_tick !== 'number') return null;
        return { lastSeenPrice: e.last_seen_price, lastSeenTick: e.last_seen_tick };
      }),
      hearsay: mapRecord((knowledge.hearsay as Record<string, unknown>) ?? {}, (v) => {
        const e = v as Record<string, unknown> | null;
        if (!e || typeof e.rough_price !== 'number' || typeof e.confidence !== 'number') return null;
        return { roughPrice: e.rough_price, confidence: e.confidence };
      }),
    },
  });
}
