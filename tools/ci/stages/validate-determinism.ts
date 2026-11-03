import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { StageResult, ValidationIssue } from '../types.js';
import { bootstrap, type GameApp } from '../../../src/bootstrap/GameBootstrap.js';
import { makeEventType } from '../../../src/shared/events/EventType.js';
import { makeStreamName } from '../../../src/domain/rng/RngStreamName.js';

interface DeterminismScenario {
  readonly seed: string;
  readonly ticks: number;
  readonly rngCallsPerTick: number;
  readonly combatEventsPerTick: number;
}

const DEFAULT_SCENARIO: DeterminismScenario = {
  seed: 'ci-test',
  ticks: 100,
  rngCallsPerTick: 1,
  combatEventsPerTick: 1,
};

const SNAPSHOT_PATH = join('tools', 'ci', 'fixtures', 'determinism', 'expected.snapshot.json');
const SCENARIO_PATH = join('tools', 'ci', 'fixtures', 'determinism', 'scenario.json');

/** Прогон детерминированного сценария: N тиков + RNG-вызовы + события. */
export async function runDeterminismScenario(scenario: DeterminismScenario): Promise<string> {
  const bootResult = await bootstrap({ env: 'test', contentMode: 'in-memory', config: { masterSeed: scenario.seed } });
  if (!bootResult.ok) return `bootstrap-error:${bootResult.error.message}`;
  const app: GameApp = bootResult.value;
  app.runtime.activate('stub-counter-tracker');

  for (let i = 0; i < scenario.ticks; i++) {
    for (let r = 0; r < scenario.rngCallsPerTick; r++) {
      app.rng.nextFloat(makeStreamName('rng.combat.damage'));
    }
    if (scenario.combatEventsPerTick > 0) {
      app.eventBus.publish({ type: makeEventType('combat.started'), payload: { tick: i } });
    }
    await app.scheduler.runOneTick();
  }

  return JSON.stringify({
    rngState: app.rng.serializeAll(),
    mechanicRuntimeState: app.runtime.captureRuntimeState(),
  });
}

/** TKT-M4-010: стадия determinism — сравнение со снапшотом. */
export async function validateDeterminism(options?: { update?: boolean }): Promise<StageResult> {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  let scenario = DEFAULT_SCENARIO;
  try {
    scenario = { ...DEFAULT_SCENARIO, ...(JSON.parse(readFileSync(SCENARIO_PATH, 'utf8')) as DeterminismScenario) };
  } catch {
    // нет сценария — дефолт
  }

  const actual = await runDeterminismScenario(scenario);

  if (options?.update || !existsSync(SNAPSHOT_PATH)) {
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, actual, 'utf8');
    issues.push({
      ruleId: 'determinism/snapshot-created',
      severity: 'warning',
      message: 'Expected snapshot created/updated (run with --update to enforce)',
    });
    return { stage: 'determinism', passed: true, issues, durationMs: Date.now() - start };
  }

  const expected = readFileSync(SNAPSHOT_PATH, 'utf8');
  if (expected !== actual) {
    issues.push({
      ruleId: 'determinism/snapshot-mismatch',
      severity: 'error',
      message: 'Determinism snapshot mismatch: run with --update after intentional changes',
      meta: { expectedLength: expected.length, actualLength: actual.length },
    });
  }

  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'determinism', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
