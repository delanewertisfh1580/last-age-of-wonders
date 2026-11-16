import { describe, expect, it } from 'vitest';
import { InputCommandBus, InputModeController, mapGamepad, mapKeyboard, mapTouch } from '../../src/domain/input/Input.js';

describe('TKT-M11-001/005/006: адаптеры', () => {
  it('клавиатура, тач и геймпад дают команды', () => {
    expect(mapKeyboard('KeyW', 'pressed')).toEqual({ action: 'move.forward', phase: 'pressed' });
    expect(mapKeyboard('Unknown', 'pressed')).toBeNull();
    expect(mapTouch('confirm', 'released').action).toBe('action.confirm');
    expect(mapGamepad(0, 'held')?.action).toBe('action.confirm');
  });
});

describe('TKT-M11-002/003/004: шина и режимы', () => {
  it('команда буферизуется и доставляется при drain', () => {
    const modes = new InputModeController();
    const bus = new InputCommandBus({ modes });
    const seen: string[] = [];
    bus.on('move.forward', (command) => seen.push(command.phase));
    expect(bus.dispatch({ action: 'move.forward', phase: 'pressed' }).ok).toBe(true);
    expect(seen).toHaveLength(0);
    expect(bus.drain()).toHaveLength(1);
    expect(seen).toEqual(['pressed']);
  });

  it('режим и неизвестное действие отклоняются', () => {
    const modes = new InputModeController();
    const rejected: string[] = [];
    const bus = new InputCommandBus({ modes, onRejected: (_, reason) => rejected.push(reason) });
    bus.on('action.back', () => undefined);
    const denied = bus.dispatch({ action: 'action.back', phase: 'pressed' });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe('INPUT_MODE_REJECTED');
    const unknown = bus.dispatch({ action: 'jump', phase: 'pressed' });
    expect(unknown.ok).toBe(false);
    expect(rejected).toEqual(['INPUT_MODE_REJECTED', 'INPUT_UNKNOWN_ACTION']);
    expect(modes.pop().ok).toBe(false);
  });
});
