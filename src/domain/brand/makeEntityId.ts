import type { EntityId } from './Brand.js';

const ENTITY_ID_RE = /^[a-z][a-z0-9_]{0,127}$/;

export function makeEntityId<const T extends string>(
  value: string
): EntityId<T> {
  if (!ENTITY_ID_RE.test(value)) {
    throw new Error(
      `Invalid entity id '${value}'. Must match pattern: ${ENTITY_ID_RE}.`
    );
  }
  return value as EntityId<T>;
}

export function isEntityId(value: unknown): value is EntityId<string> {
  if (typeof value !== 'string') return false;
  if (!ENTITY_ID_RE.test(value)) return false;
  return true;
}
