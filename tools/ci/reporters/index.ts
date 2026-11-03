import { reportConsole } from './ConsoleReporter.js';
import { reportJson } from './JsonReporter.js';
import type { StageResult, ValidationStage } from '../types.js';

export interface Reporter {
  format(results: readonly StageResult[]): string;
}

export const REPORTERS: Record<string, Reporter> = {
  console: { format: (r) => reportConsole(r) },
  json: { format: (r) => reportJson(r as readonly StageResult[]) },
};

export const ALL_STAGE_FILTERS: readonly ValidationStage[] = [];

export function makeReporter(name: string): Reporter {
  const reporter = REPORTERS[name];
  if (!reporter) {
    throw new Error(`Unknown reporter: ${name}`);
  }
  return reporter;
}
