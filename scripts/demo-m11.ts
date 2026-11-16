/**
 * TKT-M11-007: демо M11 — ввод → моды → буфер команд → отказ.
 * Запуск: bun scripts/demo-m11.ts
 */
import { InputCommandBus, InputModeController, mapGamepad, mapKeyboard, mapTouch } from '../src/domain/input/Input.js';

const modes = new InputModeController();
const rejected: string[] = [];
const bus = new InputCommandBus({ modes, onRejected: (command, reason) => rejected.push(`${command.action}:${reason}`) });
const seen: string[] = [];
for (const action of ['move.forward', 'action.confirm', 'action.back']) {
  bus.on(action, (command) => seen.push(`${command.action}:${command.phase}`));
}

bus.dispatch(mapKeyboard('KeyW', 'held') ?? { action: 'noop', phase: 'pressed' });
bus.dispatch(mapTouch('confirm', 'pressed'));
bus.dispatch(mapKeyboard('Escape', 'pressed') ?? { action: 'noop', phase: 'pressed' });
bus.drain();

modes.push('dialogue');
bus.dispatch(mapKeyboard('KeyW', 'pressed') ?? { action: 'noop', phase: 'pressed' });
bus.dispatch(mapGamepad(0, 'pressed') ?? { action: 'noop', phase: 'pressed' });
bus.drain();
modes.pop();

process.stdout.write(`→ seen: ${seen.join(', ')}\n`);
process.stdout.write(`→ rejected: ${rejected.join(', ')}\n`);
process.stdout.write(`→ mode back: ${modes.current()}\n`);

if (seen.length !== 3 || rejected.length !== 2 || modes.current() !== 'world') {
  process.stderr.write('DEMO M11 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M11 OK — keyboard/touch/gamepad → моды → буфер → отказ\n');
