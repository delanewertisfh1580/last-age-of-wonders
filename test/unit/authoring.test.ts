import { describe, expect, it } from 'vitest';
import {
  buildContentGraph,
  lintContent,
  previewContent,
  scaffoldContent,
  type AuthoringEntry,
} from '../../src/domain/authoring/Authoring.js';

describe('TKT-M33: скаффолд и lint', () => {
  it('скаффолд заполняет обязательные поля', () => {
    const good = scaffoldContent('good', 'amber') as AuthoringEntry;
    expect(lintContent([good])).toEqual([]);
    expect(good.display_name_key).toBe('good.amber.name');
  });

  it('находит пропуски, дубли и неизвестные ссылки', () => {
    const issues = lintContent([
      { id: 'a', kind: 'good' },
      { id: 'a', kind: 'good', basePrice: 1, display_name_key: 'k', description_key: 'd' },
      { id: 'b', kind: 'quest', guildId: 'g', reward: 1, display_name_key: 'k', description_key: 'd', requires: ['missing'] },
    ]);
    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain('AUTHORING_DUPLICATE_ID');
    expect(codes).toContain('AUTHORING_MISSING_KEY');
    expect(codes).toContain('AUTHORING_UNKNOWN_REF');
  });
});

describe('TKT-M33: граф и preview', () => {
  it('строит связи и находит циклы', () => {
    const graph = buildContentGraph([
      { id: 'a', kind: 'quest', requires: ['b'] },
      { id: 'b', kind: 'quest' },
    ]);
    expect(graph.ok && graph.value.edges).toEqual([{ from: 'a', to: 'b' }]);
    const cycle = buildContentGraph([
      { id: 'a', kind: 'quest', requires: ['b'] },
      { id: 'b', kind: 'quest', requires: ['a'] },
    ]);
    expect(cycle.ok).toBe(false);
  });

  it('preview содержит локаль и ключ', () => {
    const entry = scaffoldContent('npc', 'mara') as AuthoringEntry;
    expect(previewContent(entry, 'en-US')).toContain('[en-US]');
  });
});
