import { Ajv, type Schema, type ValidateFunction, type ErrorObject } from 'ajv';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';

/** TKT-M2-014: валидатор state механики по её stateSchema (кэш по mechanicId). */
export class StateSchemaValidator {
  private readonly ajv: Ajv = new Ajv({ allErrors: true, strict: false });
  private readonly cache = new Map<string, ValidateFunction>();

  register(mechanicId: string, schema: object): void {
    this.cache.set(mechanicId, this.ajv.compile(schema as Schema));
  }

  unregister(mechanicId: string): void {
    this.cache.delete(mechanicId);
  }

  validate(mechanicId: string, state: unknown): Result<void, AppError> {
    const validate = this.cache.get(mechanicId);
    if (!validate) {
      return err(
        makeAppError('INFRA_SCHEMA_INVALID', `No state schema registered for mechanic: ${mechanicId}`),
      );
    }
    if (validate(state)) return ok(undefined);
    const issues = (validate.errors ?? []).map(
      (e: ErrorObject) => `${e.instancePath || '/'}: ${e.message ?? 'invalid'}`,
    );
    return err(
      makeAppError('INFRA_SCHEMA_INVALID', `Invalid state for mechanic ${mechanicId}`, {
        issues,
      }),
    );
  }
}
