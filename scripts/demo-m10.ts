/**
 * TKT-M10-007: демо M10 — биндинги → панели → режимы HUD → restore.
 * Запуск: bun scripts/demo-m10.ts
 */
import { HudModeController, UiBindingEngine, UiRoot, captureUi, restoreUi } from '../src/domain/ui/Ui.js';

const bindings = new UiBindingEngine();
let gold = 120;
bindings.bind({ key: 'hud.gold', policy: 'value', read: () => gold });
bindings.bind({ key: 'hud.warning', policy: 'visibility', read: () => gold < 50 });
const changes: string[] = [];
bindings.onChange((key) => changes.push(key));

const root = new UiRoot();
root.mount({ id: 'resources', zone: 'top', priority: 10 });
root.mount({ id: 'minimap', zone: 'right', priority: 5 });
root.mount({ id: 'log', zone: 'bottom', priority: 1 });

const hud = new HudModeController();
hud.push('combat');
const modes = [hud.current()];
hud.pop();
modes.push(hud.current());

const values = bindings.evaluate();
const snapshot = captureUi(root, hud);
root.unmount('minimap');
hud.push('dialogue');
restoreUi(root, hud, snapshot);
const restored = captureUi(root, hud);

process.stdout.write(`→ bindings: ${Object.keys(values).join(', ')}\n`);
process.stdout.write(`→ modes: ${modes.join(' → ')}\n`);
process.stdout.write(`→ layout top: ${root.layout().top.map((p) => p.id).join(',')}\n`);
process.stdout.write(`→ restore: ${JSON.stringify(snapshot) === JSON.stringify(restored)}\n`);

if (values['hud.warning'] !== false || modes.join(',') !== 'combat,exploration' || JSON.stringify(snapshot) !== JSON.stringify(restored)) {
  process.stderr.write('DEMO M10 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M10 OK — биндинги → панели → HUD-режимы → memento\n');
