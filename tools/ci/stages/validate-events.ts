import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StageResult, ValidationIssue } from '../types.js';
import { readContentFiles } from './common.js';
import type { IContentRegistry } from '../../../src/domain/content/IContentRegistry.js';

interface DesignEvent {
  readonly type: string;
}

/** TKT-M4-007: стадия events. */
export function validateEvents(contentRoot: string, registry: IContentRegistry): StageResult {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  const bundles = readContentFiles(contentRoot);
  const eventTypes: string[] = Object.values(bundles.event ?? {})
    .flat()
    .map((e) => (e as { type?: string }).type ?? '')
    .filter((t) => t !== '');

  // 1. mechanic consumes/emits зарегистрированы (событие из core.json)
  for (const entry of Object.values(bundles.mechanic ?? {}).flat()) {
    const def = entry as { id?: string; consumes?: string[]; emits?: string[] };
    for (const t of [...(def.consumes ?? []), ...(def.emits ?? [])]) {
      if (!eventTypes.includes(t)) {
        issues.push({
          ruleId: 'events/registered',
          severity: 'error',
          message: `Mechanic ${def.id}: event '${t}' not registered in core events`,
        });
      }
    }
  }

  // 2. faction_extension не вне namespace
  for (const entry of Object.values(bundles.event ?? {}).flat()) {
    const def = entry as { type?: string; source?: string };
    if (def.source === 'faction_extension' && !def.type?.startsWith('faction.')) {
      issues.push({
        ruleId: 'events/faction-namespace',
        severity: 'error',
        message: `faction_extension event '${def.type}' outside faction.* namespace`,
      });
    }
  }

  // 3. fixture design-events.json — все события присутствуют
  const fixturePath = join('tools', 'ci', 'fixtures', 'design-events.json');
  try {
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { events: DesignEvent[] };
    for (const item of fixture.events) {
      if (!eventTypes.includes(item.type)) {
        issues.push({
          ruleId: 'events/design-fixture',
          severity: 'error',
          message: `Design event '${item.type}' missing in content/events`,
        });
      }
    }
  } catch {
    issues.push({ ruleId: 'events/design-fixture', severity: 'error', message: `Fixture ${fixturePath} not found/invalid` });
  }

  // 4. все события из реестра загружаются без ошибок
  for (const entry of registry.list('event')) {
    if (!registry.has(entry.kind, entry.id)) {
      issues.push({ ruleId: 'events/registry', severity: 'error', message: `Event not accessible: ${entry.id}` });
    }
  }

  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'events', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
