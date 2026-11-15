/**
 * TKT-M5-005: TradeNodeDefinition / TradeRouteDefinition из §5.4 DEV-SPEC-020.
 * ECON-INV-07: узел не хранит инвентарь/цены — только ссылки на политики и market.
 */
export interface TradeNodeDefinition {
  readonly id: string;
  readonly displayNameKey: string;
  readonly factionId: string;
  readonly economyDoctrineId: string;
  readonly portTier: number; // 1..5, используется для анлоков
  readonly marketId: string;
  readonly enterpriseIds: readonly string[];
  readonly guildChapterIds: readonly string[];
  readonly scarIds: readonly string[];
  readonly legalityPolicyId: string;
  readonly position: { readonly x: number; readonly y: number };
}

export interface TradeRouteDefinition {
  readonly id: string;
  readonly displayNameKey: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly distancePolicyId: string;
  readonly riskPolicyId: string;
  readonly blockedByTags: readonly string[];
  readonly legalityPolicyId: string;
}
