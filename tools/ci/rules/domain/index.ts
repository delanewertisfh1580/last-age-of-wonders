import type { ValidationIssue } from '../../types.js';
import type { IContentRegistry } from '../../../../src/domain/content/IContentRegistry.js';
import type { ILocalizationService } from '../../../../src/domain/localization/ILocalizationService.js';

export interface GameplayRuleContext {
  readonly contentRoot: string;
  readonly registry: IContentRegistry;
  readonly localization: ILocalizationService;
}

export interface GameplayRule {
  readonly id: string;
  run(ctx: GameplayRuleContext): ValidationIssue[];
}

export function issue(ruleId: string, message: string, severity: 'error' | 'warning' = 'error', path?: string): ValidationIssue {
  return { ruleId, severity, message, path };
}
