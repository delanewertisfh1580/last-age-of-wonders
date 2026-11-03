import { Ajv, type ValidateFunction, type ErrorObject } from 'ajv';
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { SaveSnapshot } from '../../domain/save/SaveSnapshot.js';

/**
 * TKT-M3-016: валидатор SaveSnapshot.
 * Схема сохраняется в content/schemas/save-snapshot.json (TKT-M2-004).
 */
export class SaveSnapshotValidator {
  private readonly compiled: ValidateFunction;

  constructor(schema: object) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    this.compiled = ajv.compile(schema);
  }

  validate(snapshot: unknown): Result<SaveSnapshot, AppError> {
    if (!this.compiled(snapshot)) {
      const issues = (this.compiled.errors ?? []).map(
        (e: ErrorObject) => `${e.instancePath || '/'}: ${e.message ?? 'invalid'}`,
      );
      return err(
        makeAppError('SAVE_INVALID_SNAPSHOT', 'Invalid SaveSnapshot', { issues }),
      );
    }
    const snap = snapshot as Record<string, unknown>;
    if (snap.formatVersion !== 1) {
      return err(
        makeAppError('SAVE_INVALID_SNAPSHOT', 'formatVersion must be 1', {
          actual: snap.formatVersion,
        }),
      );
    }
    return ok(snapshot as SaveSnapshot);
  }
}
