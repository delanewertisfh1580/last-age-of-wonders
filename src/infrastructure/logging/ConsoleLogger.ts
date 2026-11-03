import type { Logger } from '../../shared/logging/Logger.js';

/**
 * TKT-M1-004: консольный logger.
 * Будет заменен pino-адаптером; контракт интерфейса не меняется.
 */
export class ConsoleLogger implements Logger {
  private readonly level: number;

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.level = ['debug', 'info', 'warn', 'error'].indexOf(level);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= 0) console.debug(message, meta ?? {});
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= 1) console.info(message, meta ?? {});
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= 2) console.warn(message, meta ?? {});
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.level <= 3) console.error(message, meta ?? {});
  }
}
