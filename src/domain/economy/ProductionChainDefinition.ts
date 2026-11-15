import type { GoodId, GoodOrigin } from './GoodDefinition.js';

/** TKT-M5-004: ProductionChainDefinition из §5.3 DEV-SPEC-020. */
export interface ProductionChainDefinition {
  readonly id: string;
  readonly displayNameKey: string;
  readonly recipeIds: readonly string[];
  readonly entryGoodIds: readonly GoodId[]; // входные (обычно raw)
  readonly exitGoodIds: readonly GoodId[]; // выходные (final/strategic)
  readonly factionTags: readonly string[];
  readonly originTags: readonly GoodOrigin[];
  readonly validationRules: { readonly acyclic: true; readonly connected: true };
}
