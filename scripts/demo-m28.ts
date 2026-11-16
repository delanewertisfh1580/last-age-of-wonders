/**
 * TKT-M28: демо M28 — триггер → древо → инсайты → трансформация → мета.
 * Запуск: bun scripts/demo-m28.ts
 */
import {
  branchProgress,
  checkTrigger,
  createHiddenBranch,
  transform,
  triggerBranch,
  unlockHiddenNode,
  type HiddenNode,
} from '../src/domain/transformation/HiddenBranch.js';

const nodes: readonly HiddenNode[] = [
  { id: 'omen', requires: [], cost: 1, insight: 'read the storm' },
  { id: 'bargain', requires: ['omen'], cost: 2, insight: 'bargain with the deep' },
  { id: 'becoming', requires: ['bargain'], cost: 3, insight: 'become the tide' },
];
const byId = new Map(nodes.map((node) => [node.id, node]));

function run() {
  const state = createHiddenBranch('tide', 6);
  const context = { reputation: 70, cataclysmsSurvived: 2, companionDeaths: 1, loreFragments: 4 };
  const trigger = { minReputation: 60, cataclysmsSurvived: 2, companionDeaths: 1, minLoreFragments: 3 };
  triggerBranch(state, trigger, context);
  for (const node of nodes) unlockHiddenNode(state, node, byId);
  transform(state, byId, 'tidebound', ['meta:second-run']);
  return { state, context, trigger };
}

const a = run();
process.stdout.write(`→ триггер: ${checkTrigger(a.trigger, a.context)}\n`);
process.stdout.write(`→ узлы: ${a.state.unlocked.join(' → ')}, progress=${branchProgress(a.state, nodes.length)}%\n`);
process.stdout.write(`→ трансформация: ${a.state.transformation}, meta=${a.state.metaUnlocks.join(',')}\n`);

if (!a.state.triggered || a.state.unlocked.length !== 3 || !a.state.transformed || a.state.transformation !== 'tidebound') {
  process.stderr.write('DEMO M28 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M28 OK — триггер → древо → инсайты → трансформация → мета\n');
