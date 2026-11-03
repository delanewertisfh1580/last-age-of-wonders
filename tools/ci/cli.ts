#!/usr/bin/env bun
/**
 * TKT-M4-001: CLI ci:validate.
 * Запуск: bun tools/ci/cli.ts [--stage=name] [--reporter=console|json] [--continue-on-error] [--update]
 */
import { join } from 'node:path';
import { ALL_STAGES, passed, type StageResult, type ValidationStage } from './types.js';
import { makeReporter } from './reporters/index.js';
import { validateSchemas } from './stages/validate-schemas.js';
import { validateGraph } from './stages/validate-graph.js';
import { validateGameplay } from './stages/validate-gameplay.js';
import { validateEvents } from './stages/validate-events.js';
import { validateMechanics } from './stages/validate-mechanics.js';
import { validateRngStreams } from './stages/validate-rng-streams.js';
import { validateDeterminism } from './stages/validate-determinism.js';
import { validateContracts } from './stages/validate-contracts.js';
import { bootstrap } from '../../src/bootstrap/GameBootstrap.js';
import { AjvSchemaValidator } from '../../src/infrastructure/content/AjvSchemaValidator.js';
import { InMemoryLocalizationService } from '../../src/infrastructure/localization/InMemoryLocalizationService.js';
import { loadSchemasFromContentRoot } from '../../src/bootstrap/LoadSchemas.js';

interface CliArgs {
  stage?: ValidationStage;
  reporter: string;
  continueOnError: boolean;
  update: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: Record<string, string | boolean> = { reporter: 'console', continueOnError: false, update: false };
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, rawValue] = arg.replace(/^--/, '').split('=');
    const key = rawKey === 'reporter' ? 'reporter' : rawKey === 'stage' ? 'stage' : rawKey.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    if (rawValue !== undefined) {
      args[key] = rawValue;
    } else {
      args[key] = true;
    }
  }
  return {
    stage: args.stage as ValidationStage | undefined,
    reporter: (args.reporter as string) ?? 'console',
    continueOnError: args.continueOnError === true,
    update: args.update === true,
  };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const contentRoot = join(process.cwd(), 'content');
  const results: StageResult[] = [];

  // Общий валидатор схем и контекст для стадий
  const validator = new AjvSchemaValidator();
  const schemas = loadSchemasFromContentRoot(contentRoot);
  if (schemas.ok) {
    for (const [name, schema] of Object.entries(schemas.value)) validator.registerSchema(name, schema);
  }

  const bootResult = await bootstrap({ env: 'test', contentMode: 'json', contentRoot: 'content' });

  const include = (stage: ValidationStage): boolean => !args.stage || args.stage === stage;

  if (include('schemas')) {
    results.push(validateSchemas(contentRoot, validator));
  }
  if (include('graph') && bootResult.ok) {
    results.push(validateGraph(contentRoot, bootResult.value.content));
  }
  if (include('gameplay') && bootResult.ok) {
    results.push(
      validateGameplay({
        contentRoot,
        registry: bootResult.value.content,
        localization: bootResult.value.localization,
      }),
    );
  }
  if (include('events') && bootResult.ok) {
    results.push(validateEvents(contentRoot, bootResult.value.content));
  }
  if (include('mechanics')) {
    results.push(validateMechanics(contentRoot));
  }
  if (include('rng-streams')) {
    results.push(validateRngStreams());
  }
  if (include('determinism')) {
    results.push(await validateDeterminism({ update: args.update }));
  }
  if (include('contracts')) {
    results.push(await validateContracts(contentRoot));
  }

  // Встроенный контекст локализации для проверки stage-фильтра
  void InMemoryLocalizationService;

  if (results.length === 0) {
    console.error(`No stages matched: --stage=${String(args.stage)}`);
    return 2;
  }

  const overall = passed(results);
  try {
    const reporter = makeReporter(args.reporter);
    process.stdout.write(`${reporter.format(results)}\n`);
  } catch (e) {
    console.error(`Reporter error: ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  }

  // AC13: отчёт пишется в ci-report.json (артефакт, не коммитится)
  try {
    const json = makeReporter('json').format(results);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(join(process.cwd(), 'ci-report.json'), json, 'utf8');
  } catch {
    // Не критично
  }

  return overall ? 0 : 1;
}

/** Точка входа. */
async function entry(): Promise<void> {
  process.exitCode = await main();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await entry();
}
