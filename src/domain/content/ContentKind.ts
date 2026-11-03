/**
 * TKT-M2-001: ContentKind — все значения из §5.1 DEV-SPEC-003 (66 значений в списке спеки;
 * тикет AC называет 64, но полный перечень §5.1 содержит 66 элементов — берём перечень спеки).
 */
export type ContentKind =
  | 'event'
  | 'mechanic'
  | 'faction'
  | 'doctrine'
  | 'shipBranch'
  | 'ship'
  | 'good'
  | 'recipe'
  | 'productionChain'
  | 'tradeNode'
  | 'tradeRoute'
  | 'market'
  | 'guild'
  | 'guildChapter'
  | 'guildQuestTemplate'
  | 'investmentProject'
  | 'enterprise'
  | 'nodeScar'
  | 'economyDoctrine'
  | 'tradeAgent'
  | 'legality'
  | 'contract'
  | 'priceModifier'
  | 'cataclysm'
  | 'cataclysmDoctrine'
  | 'cataclysmQuestTemplate'
  | 'companion'
  | 'equipment'
  | 'relationshipThresholds'
  | 'companionSynergy'
  | 'permadeathLegacy'
  | 'acquisitionHook'
  | 'reactionGranularity'
  | 'combat'
  | 'duelDoctrine'
  | 'crewMember'
  | 'captain'
  | 'transformationBranch'
  | 'transformationNode'
  | 'transformationTree'
  | 'transformationTrigger'
  | 'background'
  | 'storyBeacon'
  | 'narrativeArc'
  | 'factionNarrativeArc'
  | 'loreLayer'
  | 'keyNpc'
  | 'dialogue'
  | 'prologue'
  | 'ending'
  | 'loreRevelationLayer'
  | 'epilogueFact'
  | 'epilogueTemplate'
  | 'narrativeStyle'
  | 'epilogueScene'
  | 'finalChoice'
  | 'metaThreat'
  | 'stylizationProfile'
  | 'shaderQualityTier'
  | 'factionVisualDoctrine'
  | 'material'
  | 'shaderGraph'
  | 'globalPostProcessProfile'
  | 'localShaderOverride'
  | 'shaderTransitionPolicy'
  | 'vfxSystem';

export const ALL_CONTENT_KINDS: readonly ContentKind[] = [
  'event', 'mechanic', 'faction', 'doctrine', 'shipBranch', 'ship', 'good', 'recipe',
  'productionChain', 'tradeNode', 'tradeRoute', 'market', 'guild', 'guildChapter',
  'guildQuestTemplate', 'investmentProject', 'enterprise', 'nodeScar', 'economyDoctrine',
  'tradeAgent', 'legality', 'contract', 'priceModifier', 'cataclysm', 'cataclysmDoctrine',
  'cataclysmQuestTemplate', 'companion', 'equipment', 'relationshipThresholds',
  'companionSynergy', 'permadeathLegacy', 'acquisitionHook', 'reactionGranularity', 'combat',
  'duelDoctrine', 'crewMember', 'captain', 'transformationBranch', 'transformationNode',
  'transformationTree', 'transformationTrigger', 'background', 'storyBeacon', 'narrativeArc',
  'factionNarrativeArc', 'loreLayer', 'keyNpc', 'dialogue', 'prologue', 'ending',
  'loreRevelationLayer', 'epilogueFact', 'epilogueTemplate', 'narrativeStyle', 'epilogueScene',
  'finalChoice', 'metaThreat', 'stylizationProfile', 'shaderQualityTier', 'factionVisualDoctrine',
  'material', 'shaderGraph', 'globalPostProcessProfile', 'localShaderOverride',
  'shaderTransitionPolicy', 'vfxSystem',
];

export function isContentKind(v: unknown): v is ContentKind {
  return typeof v === 'string' && (ALL_CONTENT_KINDS as readonly string[]).includes(v);
}
