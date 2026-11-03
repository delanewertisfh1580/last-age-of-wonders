import { describe, it, expect } from 'vitest';
import { ALL_CONTENT_KINDS, isContentKind } from '../../src/domain/content/ContentKind.js';
import { loadPacks } from '../../src/domain/content/ContentPack.js';
import { InMemoryContentRegistry } from '../../src/infrastructure/content/InMemoryContentRegistry.js';
import { CrossReferenceValidator } from '../../src/infrastructure/content/CrossReferenceValidator.js';
import { hashEntries, canonicalJson, sha256Hex } from '../../src/domain/content/ContentHasher.js';
import { AjvSchemaValidator } from '../../src/infrastructure/content/AjvSchemaValidator.js';

describe('TKT-M2-001: ContentKind', () => {
  it('полный список из спеки без дублей и уникален', () => {
    expect(new Set(ALL_CONTENT_KINDS).size).toBe(ALL_CONTENT_KINDS.length);
    expect(ALL_CONTENT_KINDS.length).toBe(66);
    expect(ALL_CONTENT_KINDS).toContain('event');
    expect(ALL_CONTENT_KINDS).toContain('vfxSystem');
  });

  it('isContentKind распознаёт значения', () => {
    expect(isContentKind('event')).toBe(true);
    expect(isContentKind('nope')).toBe(false);
  });
});

describe('TKT-M2-002: loadPacks (topo sort)', () => {
  const pack = (id: string, deps: string[]) => ({
    id,
    version: '1.0.0',
    kinds: ['event'],
    files: [`${id}.json`],
    dependencies: deps,
  });

  it('линейная цепочка сортируется по зависимостям', () => {
    const r = loadPacks({ packs: [pack('c', ['b']), pack('b', ['a']), pack('a', [])] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('diamond-зависимости тоже сортируются', () => {
    const r = loadPacks({ packs: [pack('d', ['b', 'c']), pack('b', ['a']), pack('c', ['a']), pack('a', [])] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('цикл → Err', () => {
    const r = loadPacks({ packs: [pack('a', ['b']), pack('b', ['a'])] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INFRA_SCHEMA_INVALID');
  });

  it('отсутствующая зависимость → Err', () => {
    const r = loadPacks({ packs: [pack('a', ['ghost'])] });
    expect(r.ok).toBe(false);
  });
});

describe('TKT-M2-009: InMemoryContentRegistry', () => {
  it('get/list/has работают; contentHash — stub; reload — Ok', () => {
    const validator = new AjvSchemaValidator();
    validator.registerSchema('event-definition', {
      type: 'object',
      required: ['type'],
      properties: { type: { type: 'string' } },
      additionalProperties: true,
    });
    const reg = new InMemoryContentRegistry(
      {
        event: { 'world.tick_advanced': { type: 'world.tick_advanced' } },
      },
      validator,
    );
    expect(reg.has('event', 'world.tick_advanced')).toBe(true);
    expect(reg.get('event', 'missing').ok).toBe(false);
    expect(reg.list('event')).toHaveLength(1);
    expect(reg.contentHash()).toBe('in-memory-stub');
    expect(reg.reload().ok).toBe(true);
    expect(reg.validateAll().ok).toBe(true);
  });
});

describe('TKT-M2-006: CrossReferenceValidator', () => {
  it('битые и валидные ссылки проходят корректно', () => {
    const validator = () => undefined;
    void validator;
    const broken = new InMemoryContentRegistry({
      faction: { 'steam-empire': { id: 'steam-empire', shader_graph_id: 'no-such-graph' } },
    });
    const crossBroken = new CrossReferenceValidator();
    const brokenResult = crossBroken.validate(broken);
    expect(brokenResult.ok).toBe(false);
    if (!brokenResult.ok) {
      const custom = brokenResult.error.cause as { issues?: string[] };
      expect(custom.issues?.length).toBeGreaterThan(0);
    }

    const good = new InMemoryContentRegistry({
      faction: { 'steam-empire': { id: 'steam-empire', shader_graph_id: 'steam-graph' } },
      shaderGraph: { 'steam-graph': { id: 'steam-graph' } },
    });
    expect(new CrossReferenceValidator().validate(good).ok).toBe(true);
  });

  it('предупреждение не возникает при отсутствии конфига (fallback default)', () => {
    const validator = new CrossReferenceValidator();
    expect(validator.loadConfig('/definitely-not-exists').ok).toBe(true);
  });
});

describe('TKT-M2-007: ContentHasher', () => {
  const entry = (id: string, content: unknown) => ({ kind: 'event' as const, id, content, packId: 'p' });

  it('детерминирован и чувствителен к изменениям', () => {
    const a = hashEntries([entry('a', { x: 1 }), entry('b', { x: 2 })]);
    const b = hashEntries([entry('b', { x: 2 }), entry('a', { x: 1 })]);
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);

    const changed = hashEntries([entry('a', { x: 2 }), entry('b', { x: 2 })]);
    expect(changed).not.toBe(a);
  });

  it('canonicalJson сортирует ключи рекурсивно', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(sha256Hex('abc')).toHaveLength(64);
  });
});
