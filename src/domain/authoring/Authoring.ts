import { err, ok, type Result } from '../result/Result.js';

/** TKT-M33: скаффолд, lint, граф и предпросмотр контента. */
export type AuthoringKind = 'good' | 'recipe' | 'quest' | 'mechanic' | 'event' | 'npc' | 'locale';

export interface AuthoringIssue {
  readonly code: 'AUTHORING_MISSING_KEY' | 'AUTHORING_DUPLICATE_ID' | 'AUTHORING_UNKNOWN_REF' | 'AUTHORING_CYCLE';
  readonly message: string;
  readonly path: string;
}

export interface AuthoringEntry {
  readonly id: string;
  readonly kind: AuthoringKind;
  readonly requires?: readonly string[];
  readonly display_name_key?: string;
  readonly description_key?: string;
  readonly [key: string]: unknown;
}

const REQUIRED_FIELDS: Readonly<Record<AuthoringKind, readonly string[]>> = {
  good: ['id', 'basePrice'],
  recipe: ['id', 'inputs', 'outputs'],
  quest: ['id', 'guildId', 'reward'],
  mechanic: ['id', 'kind', 'consumes'],
  event: ['type'],
  npc: ['id', 'name', 'locationId'],
  locale: ['key', 'value'],
};

export function scaffoldContent(kind: AuthoringKind, id: string): Record<string, unknown> {
  const base: Record<string, unknown> = { id, kind, display_name_key: `${kind}.${id}.name`, description_key: `${kind}.${id}.desc` };
  if (kind === 'good') return { ...base, basePrice: 10, tier: 1, tags: [] };
  if (kind === 'recipe') return { ...base, inputs: {}, outputs: {}, ticks: 1 };
  if (kind === 'quest') return { ...base, guildId: 'merchants', reward: 10, risk: 0.1, durationTicks: 3 };
  if (kind === 'mechanic') return { ...base, consumes: [], emits: [], priority: 0, lifecycle: { scope: 'world', persisted: false } };
  if (kind === 'event') return { ...base, type: `custom.${id}` };
  if (kind === 'npc') return { ...base, name: id, locationId: 'aurum' };
  return { ...base, key: `${kind}.${id}`, value: '' };
}

export function lintContent(entries: readonly AuthoringEntry[]): readonly AuthoringIssue[] {
  const issues: AuthoringIssue[] = [];
  const ids = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.kind}:${entry.id}`;
    if (ids.has(key)) issues.push({ code: 'AUTHORING_DUPLICATE_ID', message: `Duplicate ${key}`, path: key });
    ids.add(key);
    for (const field of REQUIRED_FIELDS[entry.kind] ?? []) {
      if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
        issues.push({ code: 'AUTHORING_MISSING_KEY', message: `Missing ${field}`, path: `${key}:${field}` });
      }
    }
    if (entry.kind !== 'event' && (!entry.display_name_key || !entry.description_key)) {
      issues.push({ code: 'AUTHORING_MISSING_KEY', message: 'Missing localization keys', path: key });
    }
  }
  const known = new Set(entries.map((entry) => entry.id));
  for (const entry of entries) {
    for (const requirement of entry.requires ?? []) {
      if (!known.has(requirement)) issues.push({ code: 'AUTHORING_UNKNOWN_REF', message: `Unknown ${requirement}`, path: entry.id });
    }
  }
  return issues;
}

export interface ContentGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly { from: string; to: string }[];
}

export function buildContentGraph(entries: readonly AuthoringEntry[]): Result<ContentGraph, readonly AuthoringIssue[]> {
  const nodes = entries.map((entry) => entry.id);
  const edges = entries.flatMap((entry) => (entry.requires ?? []).map((to) => ({ from: entry.id, to })));
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const visiting = new Set<string>();
  const done = new Set<string>();
  const issues: AuthoringIssue[] = [];

  const visit = (id: string): void => {
    if (done.has(id)) return;
    if (visiting.has(id)) {
      issues.push({ code: 'AUTHORING_CYCLE', message: `Cycle at ${id}`, path: id });
      return;
    }
    visiting.add(id);
    for (const next of byId.get(id)?.requires ?? []) visit(next);
    visiting.delete(id);
    done.add(id);
  };
  for (const node of nodes) visit(node);
  if (issues.length > 0) return err(issues);
  return ok({ nodes, edges });
}

export function previewContent(entry: AuthoringEntry, locale: string): string {
  const title = entry.title ?? entry.name ?? entry.id;
  const key = entry.display_name_key ?? '';
  return `[${locale}] ${String(title)}${key ? ` (${key})` : ''}`;
}

export function sortScaffolds(kind: AuthoringKind, ids: readonly string[]): readonly Record<string, unknown>[] {
  return ids.map((id) => scaffoldContent(kind, id));
}
