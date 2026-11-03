import type { Logger } from '../../shared/logging/Logger.js';

/** TKT-M1-004: no-op logger для production/test, где логирование не нужно. */
export class NoopLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
