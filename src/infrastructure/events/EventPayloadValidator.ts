import { Ajv, type Schema, type ValidateFunction, type ErrorObject } from 'ajv';
import * as formatsModule from 'ajv-formats';

/** ajv-formats: CJS-модуль с default-функцией. */
const addFormats = (formatsModule as unknown as { default: (ajv: Ajv) => unknown }).default;
import { err, ok, type Result } from '../../domain/result/Result.js';
import { makeAppError, type AppError } from '../../domain/app-error/AppError.js';
import type { EventDefinition } from '../../domain/events/EventDefinition.js';

/** TKT-M1-011: валидатор payload на основе JSON Schema из определения события. */
export class EventPayloadValidator {
  private readonly ajv: Ajv;
  private readonly cache = new Map<string, ValidateFunction>();

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  validate(eventType: string, payload: unknown, definition: EventDefinition): Result<void, AppError> {
    const schema = definition.payloadSchema;
    if (!schema) return ok(undefined);

    let validate = this.cache.get(eventType);
    if (!validate) {
      validate = this.ajv.compile(schema as Schema);
      this.cache.set(eventType, validate);
    }
    const check = validate;
    if (check(payload)) return ok(undefined);

    const issues = (check.errors ?? []).map((e: ErrorObject) => `${e.instancePath || '/'}: ${e.message ?? 'invalid'}`);
    return err(
      makeAppError('DOMAIN_INVALID_EVENT_PAYLOAD', `Invalid payload for event ${eventType}`, {
        issues,
      }),
    );
  }
}
