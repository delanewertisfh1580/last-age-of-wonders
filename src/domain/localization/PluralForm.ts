/** TKT-M4-013/015: формы множественного числа. */
export type PluralForm = 'one' | 'few' | 'many' | 'other';

/** Правило плюрализации для русского языка. */
export function ruPluralForm(count: number): PluralForm {
  const abs = Math.abs(count);
  if (!Number.isInteger(abs)) return 'other';
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

/** Правило плюрализации для английского языка. */
export function enPluralForm(count: number): PluralForm {
  return count === 1 ? 'one' : 'other';
}

export function isFractional(count: number): boolean {
  return !Number.isInteger(count);
}
