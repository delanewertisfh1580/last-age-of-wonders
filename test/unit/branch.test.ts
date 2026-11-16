import { describe, expect, it } from 'vitest';
import {
  createBranchState,
  resolveAcquisition,
  unlockNode,
  validateBranchTree,
  type BranchNode,
} from '../../src/domain/branch/BranchTree.js';

const nodes: readonly BranchNode[] = [
  { id: 'a', requires: [], cost: 1 },
  { id: 'b', requires: ['a'], cost: 2, signatureMechanic: 'sig-b' },
];

describe('TKT-M17-002: DAG и unlock', () => {
  it('валидирует циклы и неизвестные зависимости', () => {
    expect(validateBranchTree(nodes).ok).toBe(true);
    const cyclic = validateBranchTree([
      { id: 'x', requires: ['y'], cost: 1 },
      { id: 'y', requires: ['x'], cost: 1 },
    ]);
    expect(cyclic.ok).toBe(false);
    if (!cyclic.ok) expect(cyclic.error.code).toBe('BRANCH_CYCLE');
  });

  it('unlock проверяет зависимости и очки', () => {
    const state = createBranchState('f', 3);
    expect(unlockNode(state, nodes[1]).ok).toBe(false);
    expect(unlockNode(state, nodes[0]).ok).toBe(true);
    expect(unlockNode(state, nodes[1]).ok).toBe(true);
    expect(state.points).toBe(0);
    expect(state.signatures).toEqual(['sig-b']);
  });
});

describe('TKT-M17-003: acquisition', () => {
  it('выбирает доступный путь, иначе ошибка', () => {
    const paths = [
      { id: 'q', kind: 'quest' as const, nodeId: 'a', minReputation: 50 },
      { id: 'p', kind: 'purchase' as const, nodeId: 'a', cost: 10 },
    ];
    const quest = resolveAcquisition(paths, { reputation: 60, gold: 100, completedQuests: ['q'] });
    expect(quest.ok && quest.value.id).toBe('q');
    const none = resolveAcquisition(paths, { reputation: 0, gold: 0, completedQuests: [] });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.error.code).toBe('BRANCH_ACQUISITION');
  });
});
