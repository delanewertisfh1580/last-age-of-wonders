import { describe, expect, it } from 'vitest';
import { HudModeController, UiBindingEngine, UiRoot, captureUi, restoreUi } from '../../src/domain/ui/Ui.js';

describe('TKT-M10-002/003: биндинги и панели', () => {
  it('политики value/visibility и запрет дублей', () => {
    const engine = new UiBindingEngine();
    engine.bind({ key: 'a', policy: 'value', read: () => 1 });
    engine.bind({ key: 'b', policy: 'visibility', read: () => 0 });
    expect(engine.evaluate()).toEqual({ a: 1, b: false });
    expect(engine.bind({ key: 'a', policy: 'value', read: () => 2 }).ok).toBe(false);
  });

  it('панели раскладываются по зонам с приоритетом', () => {
    const root = new UiRoot();
    root.mount({ id: 'low', zone: 'top', priority: 1 });
    root.mount({ id: 'high', zone: 'top', priority: 9 });
    expect(root.layout().top.map((p) => p.id)).toEqual(['high', 'low']);
    expect(root.mount({ id: 'high', zone: 'top', priority: 1 }).ok).toBe(false);
  });
});

describe('TKT-M10-004/005: HUD и memento', () => {
  it('стек режимов и снимок UI', () => {
    const hud = new HudModeController();
    hud.push('combat');
    expect(hud.current()).toBe('combat');
    expect(hud.pop().ok).toBe(true);
    expect(hud.current()).toBe('exploration');
    expect(hud.pop().ok).toBe(false);

    const root = new UiRoot();
    root.mount({ id: 'p', zone: 'left', priority: 1 });
    hud.push('dialogue');
    const snapshot = captureUi(root, hud);
    root.unmount('p');
    hud.restore({ mode: 'minimal', stack: [] });
    restoreUi(root, hud, snapshot);
    expect(captureUi(root, hud)).toEqual(snapshot);
  });
});
