import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import type { StageResult, ValidationIssue } from '../types.js';
import { ALL_STREAM_NAMES } from '../../../src/shared/rng/stream-names.js';

/** TKT-M4-009: стадия rng-streams. */
export function validateRngStreams(): StageResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  // 1. Fixture: все дизайнерские потоки присутствуют в каталоге
  const fixturePath = join('tools', 'ci', 'fixtures', 'design-rng-streams.json');
  try {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { streams: string[] };
    const catalog = new Set<string>(ALL_STREAM_NAMES);
    const fixtureSet = new Set<string>();
    for (const stream of fixture.streams) {
      if (fixtureSet.has(stream)) {
        issues.push({ ruleId: 'rng-streams/duplicate', severity: 'error', message: `Duplicate stream in fixture: ${stream}` });
      }
      fixtureSet.add(stream);
      if (!catalog.has(stream)) {
        issues.push({ ruleId: 'rng-streams/missing', severity: 'error', message: `Stream '${stream}' missing in stream-names.ts` });
      }
    }
  } catch {
    issues.push({ ruleId: 'rng-streams/fixture', severity: 'error', message: `Fixture ${fixturePath} not found/invalid` });
  }

  // 2. Дубли в каталоге
  if (new Set(ALL_STREAM_NAMES).size !== ALL_STREAM_NAMES.length) {
    issues.push({ ruleId: 'rng-streams/duplicate', severity: 'error', message: 'Duplicate streams in stream-names.ts' });
  }

  // 3. Grep: нет Math.random() в src/domain и src/application
  for (const dir of ['src/domain', 'src/application']) {
    for (const file of listTsFiles(dir)) {
      const content = readFileSync(file, 'utf8');
      if (content.includes('Math.random(')) {
        issues.push({
          ruleId: 'rng-streams/no-math-random',
          severity: 'error',
          message: `Math.random() found in ${file}`,
          path: file,
        });
      }
    }
  }

  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'rng-streams', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (path: string): void => {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      let stat;
      try {
        stat = lstatSync(full);
      } catch {
        continue;
      }
      if (stat.isFile() && full.endsWith('.ts')) {
        out.push(full);
      } else if (stat.isDirectory()) {
        walk(full);
      }
    }
  };
  walk(dir);
  return out;
}
