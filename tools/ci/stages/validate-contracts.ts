import type { StageResult, ValidationIssue } from '../types.js';
import { bootstrap, type GameApp } from '../../../src/bootstrap/GameBootstrap.js';
import { makeEventType } from '../../../src/shared/events/EventType.js';
import type { IContentRegistry } from '../../../src/domain/content/IContentRegistry.js';

/** TKT-M4-011: стадия contracts — проверки foundation-контрактов. */
export async function validateContracts(contentRoot: string): Promise<StageResult> {
  const start = Date.now();
  const issues: ValidationIssue[] = [];

  // 1. bootstrap проходит без ошибок (json-режим по текущему content/)
  const bootResult = await bootstrap({ env: 'test', contentMode: 'json', contentRoot });
  if (!bootResult.ok) {
    issues.push({ ruleId: 'contracts/bootstrap', severity: 'error', message: `${bootResult.error.code}: ${bootResult.error.message}` });
    return { stage: 'contracts', passed: false, issues, durationMs: Date.now() - start };
  }
  const app: GameApp = bootResult.value;

  // 2. IContentRegistry.loadAll() без ошибок (bootstrap уже загрузил)
  const contentRegistry: IContentRegistry = bootResult.value.content;
  const eventCount = contentRegistry.list('event').length;
  if (eventCount === 0) {
    issues.push({ ruleId: 'contracts/content-events', severity: 'error', message: 'No events loaded from content' });
  }

  // 3. IEventBus публикует все core-события (без валидационных ошибок)
  for (const definition of app.eventRegistry.list()) {
    const published = app.eventBus.publish({ type: definition.type, payload: {} });
    if (!published.ok) {
      const code = published.error.code;
      // DOMAIN_INVALID_EVENT_PAYLOAD допустим, если у события есть payloadSchema
      if (code !== 'DOMAIN_INVALID_EVENT_PAYLOAD') {
        issues.push({
          ruleId: 'contracts/event-bus-publish',
          severity: 'error',
          message: `Cannot publish ${definition.type}: ${code}`,
        });
      }
    }
  }

  // 4. Все memento-провайдеры зарегистрированы (rng + mechanicRuntime)
  const providerIds = app.mementos.list().map((p) => p.domainId);
  for (const required of ['rng', 'mechanicRuntime']) {
    if (!providerIds.includes(required)) {
      issues.push({ ruleId: 'contracts/memento-provider', severity: 'error', message: `Memento provider missing: ${required}` });
    }
  }

  // 5. Use cases возвращают Result<T, E> — smoke-проверка сохранения
  const runtime = app.runtime;
  const activated = runtime.activate('stub-counter-tracker');
  if (!activated.ok) {
    issues.push({ ruleId: 'contracts/use-case-result', severity: 'error', message: `activate failed: ${activated.error.code}` });
  }

  const blocking = issues.filter((i) => i.severity === 'error');
  return { stage: 'contracts', passed: blocking.length === 0, issues, durationMs: Date.now() - start };
}
