import { err, ok, type Result } from '../result/Result.js';

/** TKT-M10-002/003/004/005: биндинги, панели, режимы HUD, memento. */
export type BindingPolicy = 'value' | 'formatted' | 'visibility';
export type HudMode = 'exploration' | 'combat' | 'dialogue' | 'minimal';

export interface UiBinding<T = unknown> {
  readonly key: string;
  readonly policy: BindingPolicy;
  readonly read: () => T;
}
export interface UiError {
  readonly code: 'UI_DUPLICATE_BINDING' | 'UI_INVALID_PANEL' | 'UI_MODE_STACK_EMPTY';
  readonly message: string;
}
function fail(code: UiError['code'], message: string): Result<never, UiError> {
  return err({ code, message });
}

export class UiBindingEngine {
  private readonly bindings = new Map<string, UiBinding>();
  private readonly listeners: ((key: string, value: unknown) => void)[] = [];

  bind(binding: UiBinding): Result<void, UiError> {
    if (this.bindings.has(binding.key)) return fail('UI_DUPLICATE_BINDING', `Duplicate binding: ${binding.key}`);
    this.bindings.set(binding.key, binding);
    return ok(undefined);
  }

  onChange(listener: (key: string, value: unknown) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  evaluate(): Readonly<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    for (const [key, binding] of this.bindings) {
      const value = binding.read();
      out[key] = binding.policy === 'visibility' ? Boolean(value) : value;
      for (const listener of this.listeners) listener(key, out[key]);
    }
    return out;
  }
}

export interface UiPanel {
  readonly id: string;
  readonly zone: 'top' | 'bottom' | 'left' | 'right' | 'center';
  readonly priority: number;
}

/** TKT-M10-003: монтирование панелей по зонам с уникальными id. */
export class UiRoot {
  private readonly panels = new Map<string, UiPanel>();

  mount(panel: UiPanel): Result<void, UiError> {
    if (!panel.id.trim()) return fail('UI_INVALID_PANEL', 'Panel id is empty');
    if (this.panels.has(panel.id)) return fail('UI_INVALID_PANEL', `Duplicate panel: ${panel.id}`);
    this.panels.set(panel.id, panel);
    return ok(undefined);
  }

  unmount(id: string): boolean {
    return this.panels.delete(id);
  }

  layout(): Readonly<Record<UiPanel['zone'], readonly UiPanel[]>> {
    const zones = { top: [], bottom: [], left: [], right: [], center: [] } as Record<UiPanel['zone'], UiPanel[]>;
    for (const panel of this.panels.values()) zones[panel.zone].push(panel);
    for (const zone of Object.keys(zones) as UiPanel['zone'][]) {
      zones[zone].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    }
    return zones;
  }
}

export interface HudState {
  mode: HudMode;
  readonly stack: HudMode[];
}

/** TKT-M10-004: стек режимов HUD с восстановлением предыдущего. */
export class HudModeController {
  private readonly state: HudState = { mode: 'exploration', stack: [] };
  private readonly listeners: ((mode: HudMode) => void)[] = [];

  current(): HudMode {
    return this.state.mode;
  }

  push(mode: HudMode): HudMode {
    this.state.stack.push(this.state.mode);
    this.state.mode = mode;
    for (const listener of this.listeners) listener(mode);
    return mode;
  }

  pop(): Result<HudMode, UiError> {
    const previous = this.state.stack.pop();
    if (!previous) return fail('UI_MODE_STACK_EMPTY', 'HUD mode stack is empty');
    this.state.mode = previous;
    for (const listener of this.listeners) listener(previous);
    return ok(previous);
  }

  onChange(listener: (mode: HudMode) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }

  capture(): HudState {
    return { mode: this.state.mode, stack: [...this.state.stack] };
  }

  restore(state: HudState): void {
    this.state.mode = state.mode;
    this.state.stack.splice(0, this.state.stack.length, ...state.stack);
  }
}

export interface UiSnapshot {
  readonly panels: readonly UiPanel[];
  readonly hud: HudState;
}

/** TKT-M10-005: снимок UI для memento. */
export function captureUi(root: UiRoot, hud: HudModeController): UiSnapshot {
  return { panels: Object.values(root.layout()).flat().map((panel) => ({ ...panel })), hud: hud.capture() };
}

export function restoreUi(root: UiRoot, hud: HudModeController, snapshot: UiSnapshot): void {
  for (const panel of Object.values(root.layout()).flat()) root.unmount(panel.id);
  for (const panel of snapshot.panels) root.mount(panel);
  hud.restore(snapshot.hud);
}
