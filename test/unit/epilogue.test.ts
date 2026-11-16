import { describe, expect, it } from 'vitest';
import {
  createFactPort,
  generateEpilogue,
  missingDomains,
  pickChoice,
  weaveThreads,
  type EpilogueFact,
} from '../../src/domain/epilogue/Epilogue.js';

const facts: readonly EpilogueFact[] = [
  { id: 'a', domain: 'x', text: 'X happened.', weight: 3, tags: [] },
  { id: 'b', domain: 'x', text: 'X again.', weight: 1, tags: [] },
  { id: 'c', domain: 'y', text: 'Y happened.', weight: 5, tags: [] },
];

describe('TKT-M31: нити и сцены', () => {
  it('группирует по домену и сортирует по весу', () => {
    const threads = weaveThreads(facts);
    expect(threads.map((thread) => thread.domain)).toEqual(['y', 'x']);
    expect(threads[1].facts[0].id).toBe('a');
  });

  it('полнота фактов и пустой порт', () => {
    expect(missingDomains(facts, ['x', 'z'])).toEqual(['z']);
    const empty = generateEpilogue(createFactPort([]));
    expect(empty.ok).toBe(false);
  });
});

describe('TKT-M31: текст и выбор', () => {
  it('добавляет выбор и проверяет неизвестный id', () => {
    const result = generateEpilogue(createFactPort(facts), ['x', 'y'], { id: 'c', text: 'Finale.', tag: 't' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.missingDomains).toEqual([]);
    expect(result.value.text).toContain('Finale.');
    expect(pickChoice([{ id: 'c', text: 'Finale.', tag: 't' }], 'missing').ok).toBe(false);
  });
});
