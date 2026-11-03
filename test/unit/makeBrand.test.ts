import { makeBrand, asBrand } from '../../src/shared/brand/makeBrand.js';

describe('makeBrand', () => {
  it('создаёт branded-значение', () => {
    const magic = makeBrand('magic');
    expect(magic).toBe('magic');
  });

  it('ошибка при пустом ключе', () => {
    expect(() => makeBrand('')).toThrow('Brand key must not be empty.');
  });

  it('asBrand проходит, если значение совпадает', () => {
    const result = asBrand('magic', 'magic');
    expect(result).toBe('magic');
  });

  it('asBrand падает, если значение не совпадает', () => {
    expect(() => asBrand('wrong', 'magic')).toThrow(
      'Value does not match brand key.'
    );
  });
});
