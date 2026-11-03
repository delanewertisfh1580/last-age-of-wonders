import { describe, it, expect } from 'vitest';
import { validateSchemas } from '../../tools/ci/stages/validate-schemas.js';
import { validateGraph } from '../../tools/ci/stages/validate-graph.js';
import { validateGameplay } from '../../tools/ci/stages/validate-gameplay.js';
import { validateMechanics } from '../../tools/ci/stages/validate-mechanics.js';
import { validateRngStreams } from '../../tools/ci/stages/validate-rng-streams.js';
import { validateDeterminism } from '../../tools/ci/stages/validate-determinism.js';
import { validateEvents } from '../../tools/ci/stages/validate-events.js';
import { runDeterminismScenario } from '../../tools/ci/stages/validate-determinism.js';
import { reportConsole } from '../../tools/ci/reporters/ConsoleReporter.js';
import { reportJson } from '../../tools/ci/reporters/JsonReporter.js';
import { makeReporter } from '../../tools/ci/reporters/index.js';
import { bootstrap } from '../../src/bootstrap/GameBootstrap.js';
import { AjvSchemaValidator } from '../../src/infrastructure/content/AjvSchemaValidator.js';
import { loadSchemasFromContentRoot } from '../../src/bootstrap/LoadSchemas.js';
import { InMemoryLocalizationService } from '../../src/infrastructure/localization/InMemoryLocalizationService.js';

describe('TKT-M4-003: репортеры', () => {
  it('ConsoleReporter печатает статус; JsonReporter даёт валидный JSON; фабрика по имени', () => {
    const sample = {
      stage: 'schemas' as const,
      passed: true,
      issues: [],
      durationMs: 1,
    };
    const failing = {
      stage: 'graph' as const,
      passed: false,
      issues: [{ ruleId: 'graph/x', severity: 'error' as const, message: 'broken ref' }],
    };
    const consoleOut = reportConsole([sample, failing]);
    expect(consoleOut).toContain('✅ schemas');
    expect(consoleOut).toContain('❌ graph');
    expect(consoleOut).toContain('broken ref');

    const jsonOut = reportJson([sample]);
    expect(() => JSON.parse(jsonOut)).not.toThrow();
    expect(JSON.parse(jsonOut).passed).toBe(true);

    // Сравниваем без generatedAtMs (время генерации отчёта всегда разное)
    const stripTime = (s: string): Record<string, unknown> => {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      const { generatedAtMs, ...withoutTime } = parsed;
      void generatedAtMs;
      return withoutTime;
    };
    expect(stripTime(makeReporter('json').format([sample]))).toEqual(stripTime(jsonOut));
    expect(() => makeReporter('nope')).toThrow();
  });
});

describe('TKT-M4-004: стадия schemas', () => {
  it('на текущем контенте проходит; битый контент даёт issue', () => {
    const validator = new AjvSchemaValidator();
    const schemas = loadSchemasFromContentRoot('content');
    if (schemas.ok) for (const [n, s] of Object.entries(schemas.value)) validator.registerSchema(n, s);

    const result = validateSchemas('content', validator);
    expect(result.passed).toBe(true);

    // Прямая валидация битой записи через раннесозданный validator должен дать Err.
    const direct = validator.validate('event-definition', { type: 'нет-корректного-имени' });
    expect(direct.ok).toBe(false);

    // Отсутствие корня — issue.
    const missing = validateSchemas('/definitely-not-exists', new AjvSchemaValidator());
    expect(missing.passed).toBe(false);
  });
});

describe('TKT-M4-005: стадия graph', () => {
  it('все ссылки валидны → Ok (контент не содержит ссылок на другое)', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'json', contentRoot: 'content' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const result = validateGraph('content', boot.value.content);
    expect(result.stage).toBe('graph');
    expect(result.passed).toBe(true);
  });
});

describe('TKT-M4-006/018: стадия gameplay', () => {
  it('все 12 правил работают на текущем контенте без ошибок', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'json', contentRoot: 'content' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const result = validateGameplay({
      contentRoot: 'content',
      registry: boot.value.content,
      localization: boot.value.localization,
    });
    expect(result.stage).toBe('gameplay');
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});

describe('TKT-M4-008: стадия mechanics', () => {
  it('текущий контент (3 stub механики) проходит', () => {
    const result = validateMechanics('content');
    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe('TKT-M4-009: стадия rng-streams', () => {
  it('fixture покрывает каталог; Math.random отсутствует в src/domain, src/application', () => {
    const result = validateRngStreams();
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});

describe('TKT-M4-007: стадия events', () => {
  it('AC08: fixture события присутствуют; AC09: faction_extension только в faction.*', async () => {
    const boot = await bootstrap({ env: 'test', contentMode: 'json', contentRoot: 'content' });
    if (!boot.ok) throw new Error('bootstrap failed');
    const result = validateEvents('content', boot.value.content);
    expect(result.passed).toBe(true);
  });
});

describe('TKT-M4-010: стадия determinism', () => {
  it('сценарий детерминирован (дважды одинаковый JSON)', async () => {
    const a = await runDeterminismScenario({ seed: 'ci-test', ticks: 10, rngCallsPerTick: 1, combatEventsPerTick: 1 });
    const b = await runDeterminismScenario({ seed: 'ci-test', ticks: 10, rngCallsPerTick: 1, combatEventsPerTick: 1 });
    expect(a).toBe(b);
  });

  it('validateDeterminism с update — создаёт/обновляет снапшот и проходит', async () => {
    const result = await validateDeterminism({ update: true });
    expect(result.stage).toBe('determinism');
    expect(result.passed).toBe(true);
  }, 60000);

  it('после создания снапшота проверка без update тоже проходит', async () => {
    await validateDeterminism({ update: true });
    const result = await validateDeterminism();
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  }, 60000);
});

describe('contract: игровая локализация из in-memory', () => {
  it('InMemoryLocalizationService отображает ключ stub-механик', () => {
    const loc = new InMemoryLocalizationService(
      {
        'ru-RU': { 'mechanic.stub-counter-tracker.name': 'Счётчик тиков' },
        'en-US': { 'mechanic.stub-counter-tracker.name': 'Tick Counter' },
      },
      'ru-RU',
    );
    expect(loc.t('mechanic.stub-counter-tracker.name')).toBe('Счётчик тиков');
  });
});
