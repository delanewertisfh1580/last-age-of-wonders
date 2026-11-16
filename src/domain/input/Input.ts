import { err, ok, type Result } from '../result/Result.js';

/** TKT-M11-002/003/004: команды ввода, очередь, режимы и адаптеры. */
export type InputPhase = 'pressed' | 'held' | 'released';
export type InputMode = 'world' | 'battle' | 'dialogue' | 'menu';

export interface InputCommand {
  readonly action: string;
  readonly phase: InputPhase;
  readonly value?: number;
}

export type InputErrorCode = 'INPUT_UNKNOWN_ACTION' | 'INPUT_MODE_REJECTED' | 'INPUT_STACK_EMPTY';

export interface InputError {
  readonly code: InputErrorCode;
  readonly message: string;
}

function fail(code: InputErrorCode, message: string): Result<never, InputError> {
  return err({ code, message });
}

const KEY_MAP: Readonly<Record<string, string>> = {
  KeyW: 'move.forward',
  KeyA: 'move.left',
  KeyS: 'move.back',
  KeyD: 'move.right',
  Space: 'action.confirm',
  Escape: 'action.back',
};

export function mapKeyboard(code: string, phase: InputPhase): InputCommand | null {
  const action = KEY_MAP[code];
  return action ? { action, phase } : null;
}

export function mapTouch(zone: 'left' | 'right' | 'confirm', phase: InputPhase): InputCommand {
  if (zone === 'left') return { action: 'move.left', phase };
  if (zone === 'right') return { action: 'move.right', phase };
  return { action: 'action.confirm', phase };
}

export function mapGamepad(button: number, phase: InputPhase): InputCommand | null {
  const actions = ['action.confirm', 'action.back', 'move.left', 'move.right'];
  const action = actions[button];
  return action ? { action, phase } : null;
}

/** TKT-M11-004: стек режимов, разрешающий только свои действия. */
export class InputModeController {
  private readonly stack: InputMode[] = ['world'];
  private readonly allowed = new Map<InputMode, ReadonlySet<string>>([
    ['world', new Set(['move.forward', 'move.left', 'move.back', 'move.right', 'action.confirm'])],
    ['battle', new Set(['action.confirm', 'action.back', 'move.left', 'move.right'])],
    ['dialogue', new Set(['action.confirm'])],
    ['menu', new Set(['action.confirm', 'action.back'])],
  ]);

  current(): InputMode {
    return this.stack[this.stack.length - 1];
  }

  push(mode: InputMode): void {
    this.stack.push(mode);
  }

  pop(): Result<InputMode, InputError> {
    if (this.stack.length <= 1) return fail('INPUT_STACK_EMPTY', 'Cannot pop root input mode');
    return ok(this.stack.pop() as InputMode);
  }

  allows(action: string): boolean {
    return this.allowed.get(this.current())?.has(action) ?? false;
  }
}

export interface InputCommandBusDeps {
  readonly modes: InputModeController;
  readonly onRejected?: (command: InputCommand, reason: InputErrorCode) => void;
}

/** TKT-M11-002/003: маршрутизация команд и буфер на следующий тик. */
export class InputCommandBus {
  private readonly handlers = new Map<string, ((command: InputCommand) => void)[]>();
  private readonly queue: InputCommand[] = [];
  private readonly rejected: InputCommand[] = [];

  constructor(private readonly deps: InputCommandBusDeps) {}

  on(action: string, handler: (command: InputCommand) => void): () => void {
    const list = this.handlers.get(action) ?? [];
    list.push(handler);
    this.handlers.set(action, list);
    return () => {
      const index = list.indexOf(handler);
      if (index >= 0) list.splice(index, 1);
    };
  }

  dispatch(command: InputCommand): Result<void, InputError> {
    if (!this.handlers.has(command.action)) {
      this.reject(command, 'INPUT_UNKNOWN_ACTION');
      return fail('INPUT_UNKNOWN_ACTION', `Unknown action: ${command.action}`);
    }
    if (!this.deps.modes.allows(command.action)) {
      this.reject(command, 'INPUT_MODE_REJECTED');
      return fail('INPUT_MODE_REJECTED', `Action ${command.action} not allowed in ${this.deps.modes.current()}`);
    }
    this.queue.push(command);
    return ok(undefined);
  }

  private reject(command: InputCommand, reason: InputErrorCode): void {
    this.rejected.push(command);
    this.deps.onRejected?.(command, reason);
  }

  drain(): readonly InputCommand[] {
    const drained = this.queue.splice(0, this.queue.length);
    for (const command of drained) {
      for (const handler of this.handlers.get(command.action) ?? []) handler(command);
    }
    return drained;
  }

  rejectedCommands(): readonly InputCommand[] {
    return [...this.rejected];
  }
}
