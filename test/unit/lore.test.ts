import { describe, expect, it } from 'vitest';
import {
  createLore,
  inspectLocation,
  killNpc,
  registerNpc,
  revelationLevel,
  revealFragment,
  revealsAt,
  talkToNpc,
  type LoreFragment,
} from '../../src/domain/lore/Lore.js';

const fragments: readonly LoreFragment[] = [
  { id: 'f', locationId: 'l', layer: 1, text: 'a' },
  { id: 'f', locationId: 'l', layer: 2, text: 'b', revealsSecret: 's2' },
  { id: 'hidden', locationId: 'l', layer: 1, text: 'c', requiresFlags: ['flag'] },
];

describe('TKT-M30: слои раскрытия', () => {
  it('фрагменты открываются строго по слоям и флагам', () => {
    const state = createLore();
    const visible = revealsAt(state, fragments, 'l');
    expect(visible.map((fragment) => fragment.layer)).toEqual([1]);
    expect(revealsAt(state, fragments, 'l', ['flag'])).toHaveLength(2);
    expect(revealFragment(state, fragments[1]).ok).toBe(false);
    expect(revealFragment(state, fragments[0]).ok).toBe(true);
    expect(revealFragment(state, fragments[1]).ok).toBe(true);
    expect(state.secrets).toEqual(['s2']);
    expect(revelationLevel(state)).toBe(2);
  });
});

describe('TKT-M30: NPC и подсказки', () => {
  it('разговор и смерть раскрывают секрет, подсказки не дублируются', () => {
    const state = createLore();
    registerNpc(state, { id: 'n', name: 'N', locationId: 'l', secretId: 'secret', alive: true, talked: false });
    expect(talkToNpc(state, 'n').ok).toBe(true);
    expect(killNpc(state, 'n').ok).toBe(true);
    expect(talkToNpc(state, 'n').ok).toBe(false);
    expect(state.secrets).toEqual(['secret']);
    const clues = [{ id: 'c1', locationId: 'l' }, { id: 'c2', locationId: 'x' }];
    expect(inspectLocation(state, 'l', clues)).toEqual(['c1']);
    expect(inspectLocation(state, 'l', clues)).toEqual([]);
  });
});
