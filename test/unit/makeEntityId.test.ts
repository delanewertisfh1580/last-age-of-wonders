import {
  makeEntityId,
  isEntityId,
} from '../../src/domain/brand/makeEntityId.js';

describe('makeEntityId', () => {
  it('создаёт валидный EntityId', () => {
    const id = makeEntityId('player_one');
    expect(id).toBe('player_one');
  });

  it('отклоняет id с заглавной буквы', () => {
    expect(() => makeEntityId('PlayerOne')).toThrow(/Invalid entity id/);
  });

  it('отклоняет id, начинающийся с цифры', () => {
    expect(() => makeEntityId('1st')).toThrow(/Invalid entity id/);
  });

  it('отклоняет слишком длинный id', () => {
    const tooLong = 'a'.repeat(200);
    expect(() => makeEntityId(tooLong)).toThrow(/Invalid entity id/);
  });
});

describe('isEntityId', () => {
  it('принимает валидный id', () => {
    expect(isEntityId('player_one')).toBe(true);
  });

  it('отвергает не-string', () => {
    expect(isEntityId(null)).toBe(false);
    expect(isEntityId(123)).toBe(false);
  });

  it('отвергает пустую строку', () => {
    expect(isEntityId('')).toBe(false);
  });
});
