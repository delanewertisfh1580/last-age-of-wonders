import type { StageResult, ValidationIssue } from '../types.js';
import type { GameplayRule } from '../rules/domain/index.js';
import { factionHasDoctrine } from '../rules/domain/fleet.js';
import { chainAcyclic } from '../rules/domain/economy.js';
import { cataclysmHasMinStages } from '../rules/domain/cataclysm.js';
import { factionHasDuelDoctrine } from '../rules/domain/combat.js';
import { companionHasMinMechanics } from '../rules/domain/party.js';
import { companionHasSynergyOrConflict } from '../rules/domain/companion.js';
import { treeHasFinalState } from '../rules/domain/transformation.js';
import { beaconHasCompletion } from '../rules/domain/narrative.js';
import { templateHasScenes } from '../rules/domain/epilogue.js';
import { factionHasVisualDoctrine } from '../rules/domain/art.js';
import { localizationKeyExists, noUnusedKeys } from '../rules/domain/localization.js';
import type { GameplayRuleContext } from '../rules/domain/index.js';
import type { IContentRegistry } from '../../../src/domain/content/IContentRegistry.js';
import type { ILocalizationService } from '../../../src/domain/localization/ILocalizationService.js';

/** 10 базовых правил Wave 0 + правило локализации (TKT-M4-006/018). */
export const GAMEPLAY_RULES: readonly GameplayRule[] = [
  factionHasDoctrine,
  factionHasDuelDoctrine,
  chainAcyclic,
  cataclysmHasMinStages,
  companionHasMinMechanics,
  companionHasSynergyOrConflict,
  treeHasFinalState,
  beaconHasCompletion,
  templateHasScenes,
  factionHasVisualDoctrine,
  localizationKeyExists,
  noUnusedKeys,
];

export function validateGameplay(
  ctx: GameplayRuleContext,
  rules: readonly GameplayRule[] = GAMEPLAY_RULES,
): StageResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    issues.push(...rule.run(ctx));
  }
  const blocking = issues.filter((i) => i.severity === 'error');
  return {
    stage: 'gameplay',
    passed: blocking.length === 0,
    issues,
    durationMs: Date.now() - start,
  };
}

export type { IContentRegistry, ILocalizationService };
