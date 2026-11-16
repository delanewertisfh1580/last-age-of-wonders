import { describe, expect, it } from 'vitest';
import {
  activateBeacon,
  advanceArc,
  createNarrative,
  dialogue,
  makeFinaleReady,
  startPrologue,
  type StoryArc,
} from '../../src/domain/narrative/Narrative.js';

const arc: StoryArc = {
  id: 'arc',
  title: 'Arc',
  beats: [{ id: 'b1', flag: 'f1' }, { id: 'b2', flag: 'f2', requiresFlags: ['f1'] }],
  finalFlag: 'arc-done',
};

function ready() {
  const state = createNarrative();
  startPrologue(state, { id: 'bg', title: 'BG', flags: ['bg'], bonusSkill: 'x' });
  makeFinaleReady(state);
  return state;
}

describe('TKT-M29: пролог и маяк', () => {
  it('без пролога маяк недоступен, с флагами активирует арку', () => {
    const fresh = createNarrative();
    expect(activateBeacon(fresh, { id: 'b', locationId: 'l', arcId: 'arc' }, arc, 'l').ok).toBe(false);
    const state = ready();
    expect(activateBeacon(state, { id: 'b', locationId: 'l', arcId: 'arc', requiresFlags: ['bg'] }, arc, 'l').ok).toBe(true);
    expect(state.activeArcs).toContain('arc');
  });
});

describe('TKT-M29: арка, диалог, финал', () => {
  it('биты последовательны, финал достигается, диалог меняет репутацию', () => {
    const state = ready();
    activateBeacon(state, { id: 'b', locationId: 'l', arcId: 'arc' }, arc, 'l');
    expect(advanceArc(state, arc, 'b2').ok).toBe(false);
    advanceArc(state, arc, 'b1');
    advanceArc(state, arc, 'b2');
    expect(state.completedArcs).toContain('arc');
    expect(state.finaleReached).toBe(true);
    const before = state.reputation;
    const result = dialogue(state, [{ id: 'x', text: 'x', flag: 'chosen', reputation: 10 }], 'x');
    expect(result.ok).toBe(true);
    expect(state.reputation).toBe(before + 10);
    expect(dialogue(state, [], 'missing').ok).toBe(false);
  });
});
