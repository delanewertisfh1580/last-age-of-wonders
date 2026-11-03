import { Ajv, type Schema, type ValidateFunction, type ErrorObject } from 'ajv';
import * as formatsModule from 'ajv-formats';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';

/** ajv-formats: CJS-модуль с default-функцией. */
const addFormats = (formatsModule as unknown as { default: (ajv: Ajv) => unknown }).default;

/**
 * TKT-M2-003: обёртка над ajv.
 * Схемы регистрируются по логическому имени (kind / имя схемы).
 * Кэш скомпилированных валидаторов по имени — компиляция один раз.
 */
export class AjvSchemaValidator {
  private readonly ajv: Ajv;
  private readonly compiled = new Map<string, ValidateFunction>();
  private readonly schemas = new Map<string, Schema>();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  registerSchema(name: string, schema: object): void {
    this.schemas.set(name, schema as Schema);
    this.compiled.delete(name);
  }

  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }

  validate(name: string, value: unknown): Result<void, AppError> {
    let compile: ValidateFunction | undefined = this.compiled.get(name);
    if (!compile) {
      const schema = this.schemas.get(name);
      if (!schema) {
        return err(
          makeAppError('INFRA_SCHEMA_INVALID', `Schema not registered: ${name}`, { name }),
        );
      }
      compile = this.ajv.compile(schema);
      this.compiled.set(name, compile);
    }
    const check = compile;
    if (check(value)) return ok(undefined);
    const issues = (check.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath || '/'}: ${e.message ?? 'invalid'}`,
    );
    return err(
      makeAppError('CONTENT_SCHEMA_VALIDATION_FAILED', `Validation failed for ${name}`, {
        issues,
      }),
    );
  }
}
