import {
  ok,
  err,
  mapResult,
  flattenResult,
} from '../../src/domain/result/Result.js';

describe('Result', () => {
  it('ok возвращает ожидаемое значение', () => {
    const r = ok(7);
    expect(r).toEqual({ ok: true, value: 7 });
  });

  it('err возвращает ошибку', () => {
    const r = err<string, number>(42);
    expect(r).toEqual({ ok: false, error: 42 });
  });

  it('mapResult применяет функцию к ok-результату', () => {
    const r = mapResult(ok(3), (n: number) => n * 10);
    expect(r).toEqual({ ok: true, value: 30 });
  });

  it('mapResult не применяет функцию к err-результату', () => {
    const originalError = new Error('boom');
    const r = mapResult(err<string, Error>(originalError), () => {
      throw new Error('should not be called');
    });
    expect(r).toEqual({ ok: false, error: originalError });
  });

  it('flattenResult возвращает значение или ошибку', () => {
    const okVal = flattenResult(ok('yes'));
    expect(okVal).toBe('yes');

    const errVal = flattenResult(err<number, unknown>(99));
    expect(errVal).toBe(99);
  });
});
