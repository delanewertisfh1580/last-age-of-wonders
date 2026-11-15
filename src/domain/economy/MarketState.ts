import type { GoodId } from './GoodDefinition.js';

/**
 * TKT-M5-006: MarketDefinition (§5.5) и MarketState (§5.6) из DEV-SPEC-020.
 * Инварианты ECON-INV-09/10 отражены в типах (readonly + integer-комментарии);
 * runtime-проверки — в TKT-M5-010.
 */

export interface MarketDefinition {
  readonly id: string;
  readonly nodeId: string;
  readonly regionalIndexId: string;
  readonly priceClampsPolicyId: string; // min/max коридора цены
  readonly transactionCostPolicyId: string; // комиссия/наценка
  readonly consumptionPolicyId: string; // data-driven потребление
  readonly saturationPolicyId: string; // влияние сделок на цену
  readonly reversionPolicyId: string; // откат к равновесию
}

export interface InventoryEntry {
  readonly quantity: number; // integer >= 0
  readonly reserved: number; // integer 0..quantity (ECON-INV-09)
}

export interface PriceEntry {
  readonly current: number; // текущая цена
  readonly trend: number; // направление изменения
  readonly lastTick: number; // integer >= 0
}

export interface PlayerImpactEntry {
  readonly soldTotal: number;
  readonly boughtTotal: number;
}

export type CurrencyKind = 'gold' | 'barter' | 'guild-credit';

export interface MarketState {
  readonly marketId: string;
  readonly inventories: Record<GoodId, InventoryEntry>;
  readonly prices: Record<GoodId, PriceEntry>;
  readonly playerImpact: Record<GoodId, PlayerImpactEntry>;
  /** Знание игрока: visited — lastSeenPrice/lastSeenTick, hearsay — roughPrice/confidence. */
  readonly knowledge: {
    readonly visited: Record<string, { readonly lastSeenPrice: number; readonly lastSeenTick: number }>;
    readonly hearsay: Record<string, { readonly roughPrice: number; readonly confidence: number }>;
  };
}
