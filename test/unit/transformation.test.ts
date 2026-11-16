import { describe, expect, it } from 'vitest';
import {
  branchProgress,
  checkTrigger,
  createHiddenBranch,
  transform,
  triggerBranch,
  unlockHiddenNode,
  type HiddenNode,
} from '../../src/domain/transformation/HiddenBranch.js';

const nodes: readonly HiddenNode[] = [
  { id: 'a', requires: [], cost: 1, insight: 'i1' },
  { id: 'b', requires: ['a'], cost: 2, insight: 'i2' },
];
const byId = new Map(nodes.map((node) => [node.id, node]));

const context = { reputation: 80, cataclysmsSurvived: 1, companionDeaths: 1, loreFragments: 2 };

describe('TKT-M28: триггер и древо', () => {
  it('триггер учитывает все условия', () => {
    expect(checkTrigger({ minReputation: 50, cataclysmsSurvived: 1 }, context)).toBe(true);
    expect(checkTrigger({ minReputation: 90 }, context)).toBe(false);
    const state = createHiddenBranch('h', 3);
    expect(triggerBranch(state, { minReputation: 90 }, context).ok).toBe(false);
    expect(triggerBranch(state, { minReputation: 50 }, context).ok).toBe(true);
  });

  it('unlock проверяет запуск, prereq и инсайт', () => {
    const state = createHiddenBranch('h', 3);
    expect(unlockHiddenNode(state, nodes[0], byId).ok).toBe(false);
    triggerBranch(state, {}, context);
    expect(unlockHiddenNode(state, nodes[1], byId).ok).toBe(false);
    expect(unlockHiddenNode(state, nodes[0], byId).ok).toBe(true);
    expect(unlockHiddenNode(state, nodes[1], byId).ok).toBe(true);
    expect(state.insight).toBe(0);
    expect(branchProgress(state, 2)).toBe(100);
  });
});

describe('TKT-M28: трансформация', () => {
  it('требует все узлы и сохраняет мета-разблокировки', () => {
    const state = createHiddenBranch('h', 3);
    triggerBranch(state, {}, context);
    unlockHiddenNode(state, nodes[0], byId);
    expect(transform(state, byId, 'x').ok).toBe(false);
    unlockHiddenNode(state, nodes[1], byId);
    expect(transform(state, byId, 'x', ['meta']).ok).toBe(true);
    expect(state.transformed).toBe(true);
    expect(state.metaUnlocks).toEqual(['meta']);
  });
});
