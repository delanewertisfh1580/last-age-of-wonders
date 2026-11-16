/**
 * TKT-M17-005: демо M17 — DAG → unlock → signature → путь получения.
 * Запуск: bun scripts/demo-m17.ts
 */
import {
  createBranchState,
  resolveAcquisition,
  unlockNode,
  validateBranchTree,
  type BranchNode,
} from '../src/domain/branch/BranchTree.js';

const nodes: readonly BranchNode[] = [
  { id: 'seamanship', requires: [], cost: 1, emits: ['branch.unlocked.seamanship'] },
  { id: 'broadside', requires: ['seamanship'], cost: 2, signatureMechanic: 'double-broadside' },
  { id: 'boarding', requires: ['seamanship'], cost: 2, signatureMechanic: 'grapple-hooks' },
  { id: 'ram', requires: ['broadside', 'boarding'], cost: 3, signatureMechanic: 'iron-ram' },
];

const validation = validateBranchTree(nodes);
const state = createBranchState('navigators', 8);
const results = nodes.map((node) => unlockNode(state, node));
const blocked = unlockNode(createBranchState('navigators', 1), nodes[3]);
const path = resolveAcquisition(
  [
    { id: 'naval-quest', kind: 'quest', nodeId: 'ram', minReputation: 60 },
    { id: 'buy-ram', kind: 'purchase', nodeId: 'ram', cost: 400 },
  ],
  { reputation: 70, gold: 100, completedQuests: ['naval-quest'] },
);

process.stdout.write(`→ DAG валиден: ${String(validation.ok)}\n`);
process.stdout.write(`→ unlocked: ${state.unlocked.join(' → ')}\n`);
process.stdout.write(`→ signatures: ${state.signatures.join(', ')}, points=${state.points}\n`);
process.stdout.write(`→ блокировка: ${blocked.ok ? 'нет' : blocked.error.code}\n`);
process.stdout.write(`→ путь: ${path.ok ? `${path.value.id}/${path.value.kind}` : 'none'}\n`);

if (!validation.ok || state.unlocked.length !== 4 || state.points !== 0 || blocked.ok || !path.ok || path.value.id !== 'naval-quest') {
  process.stderr.write('DEMO M17 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M17 OK — DAG → prerequisites → signature-механики → acquisition\n');
