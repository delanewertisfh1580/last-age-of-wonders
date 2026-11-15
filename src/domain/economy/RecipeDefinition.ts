import type { GoodId, GoodOrigin } from './GoodDefinition.js';

/** TKT-M5-003: RecipeDefinition из §5.2 DEV-SPEC-020. */
export type RecipeKind = 'production' | 'conversion' | 'refinement';

export interface RecipeInputOutput {
  readonly goodId: GoodId;
  readonly quantityPolicyId: string; // объём входа/выхода — data-driven
}

export interface RecipeDefinition {
  readonly id: string;
  readonly displayNameKey: string;
  readonly inputs: readonly RecipeInputOutput[];
  readonly outputs: readonly RecipeInputOutput[];
  readonly kind: RecipeKind;
  readonly originTags: readonly GoodOrigin[];
  readonly durationPolicyId: string;
  readonly lossFractionPolicyId?: string; // только conversion
  readonly riskPolicyId?: string; // только conversion
}
