import { describe, it, expect } from 'vitest';
import { economyError, isEconomyError, ECON_E_CODES } from '../../src/domain/economy/EconomyErrors.js';

describe('TKT-M5-007: EconomyErrors', () => {
  it('ровно 8 кодов union', () => {
    expect(ECON_E_CODES).toHaveLength(8);
    for (const code of [
      'ECON_INVARIANT',
      'ECON_NODE_UNKNOWN',
      'ECON_GOOD_UNKNOWN',
      'ECON_RESERVE_CONFLICT',
      'ECON_PRICE_CLAMP_VIOLATION',
      'ECON_CHAIN_INVALID',
      'ECON_CAPACITY_EXCEEDED',
      'ECON_CONTRACT_EXPIRED',
    ]) {
      expect(ECON_E_CODES).toContain(code);
    }
  });

  it('фабрика возвращает frozen-объект в стиле AppError', () => {
    const e = economyError('ECON_INVARIANT', 'boom');
    expect(Object.isFrozen(e)).toBe(true);
    expect(e.code).toBe('ECON_INVARIANT');
    expect(e.message).toBe('boom');
  });

  it('message по умолчанию равен коду; meta передаётся опционально', () => {
    const plain = economyError('ECON_GOOD_UNKNOWN');
    expect(plain.message).toBe('ECON_GOOD_UNKNOWN');
    expect(plain.meta).toBeUndefined();
    const withMeta = economyError('ECON_RESERVE_CONFLICT', 'conflict', { qty: 1 });
    expect(withMeta.meta).toEqual({ qty: 1 });
  });

  it('isEconomyError различает объекты', () => {
    expect(isEconomyError(economyError('ECON_CONTRACT_EXPIRED'))).toBe(true);
    expect(isEconomyError({ code: 'NOPE', message: 'x' })).toBe(false);
    expect(isEconomyError(null)).toBe(false);
    expect(isEconomyError('ECON_INVARIANT')).toBe(false);
  });
});
