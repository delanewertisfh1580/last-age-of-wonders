import { describe, it, expect } from 'vitest';
import { makeAppError, isAppError, AppErrorCodes } from '../../src/domain/app-error/AppError.js';
import { makeBrand, asBrand } from '../../src/shared/brand/makeBrand.js';
import { makeEntityId, isEntityId } from '../../src/domain/brand/makeEntityId.js';

describe('TKT-M1-003: AppError', () => {
  it('создаёт ошибку с кодом и сообщением', () => {
    const e = makeAppError('INFRA_UNEXPECTED', 'something broke', { context: 'test' });
    expect(e.code).toBe('INFRA_UNEXPECTED');
    expect(e.message).toBe('something broke');
    expect(e.cause).toEqual({ context: 'test' });
  });

  it('isAppError распознаёт AppError и чужие объекты', () => {
    const valid = makeAppError('INFRA_UNEXPECTED', 'oops');
    expect(isAppError(valid)).toBe(true);
    expect(isAppError({ code: 'NOPE', message: 'x' })).toBe(false);
    expect(isAppError(null)).toBe(false);
    expect(isAppError('string')).toBe(false);
  });

  it('каталог кодов не пуст и без дублей', () => {
    expect(AppErrorCodes.length).toBeGreaterThanOrEqual(20);
    expect(new Set(AppErrorCodes).size).toBe(AppErrorCodes.length);
  });
});

describe('TKT-M1-001: Brand / EntityId', () => {
  it('makeBrand проходит, пустая строка — нет', () => {
    expect(makeBrand('magic')).toBe('magic');
    expect(() => makeBrand('')).toThrow();
  });

  it('asBrand валидирует значение', () => {
    expect(asBrand('magic', 'magic')).toBe('magic');
    expect(() => asBrand('wrong', 'magic')).toThrow();
  });

  it('makeEntityId принимает snake_case id', () => {
    expect(makeEntityId('player_one')).toBe('player_one');
    expect(() => makeEntityId('PlayerOne')).toThrow();
    expect(() => makeEntityId('1st')).toThrow();
  });

  it('isEntityId различает строки', () => {
    expect(isEntityId('player_one')).toBe(true);
    expect(isEntityId(null)).toBe(false);
    expect(isEntityId(123)).toBe(false);
    expect(isEntityId('')).toBe(false);
  });
});
