/**
 * TKT-M33: CLI авторинга — `bun tools/authoring/cli.ts`.
 * Проверяет обязательные поля, локализационные ключи и граф зависимостей.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildContentGraph,
  lintContent,
  previewContent,
  type AuthoringEntry,
  type AuthoringKind,
} from '../../src/domain/authoring/Authoring.js';

const KINDS: readonly AuthoringKind[] = ['good', 'recipe', 'quest', 'mechanic', 'event', 'npc', 'locale'];
const FOLDER_KIND: Readonly<Record<string, AuthoringKind>> = {
  mechanics: 'mechanic',
  events: 'event',
  npcs: 'npc',
  goods: 'good',
  recipes: 'recipe',
  quests: 'quest',
};

function inferKind(path: string): AuthoringKind | null {
  const folder = path.split(/[\\/]/).at(-2) ?? '';
  return FOLDER_KIND[folder] ?? null;
}

function collect(dir: string, entries: AuthoringEntry[]): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      collect(path, entries);
      continue;
    }
    if (!name.endsWith('.json')) continue;
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
    const items = Array.isArray(raw) ? raw : [raw];
    for (const item of items) {
      if (typeof item !== 'object' || item === null) continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== 'string') continue;
      const explicit = KINDS.includes(record.kind as AuthoringKind) ? (record.kind as AuthoringKind) : inferKind(path);
      if (!explicit) continue;
      entries.push({ ...record, kind: explicit } as AuthoringEntry);
    }
  }
}

const entries: AuthoringEntry[] = [];
collect('content', entries);
const issues = lintContent(entries);
const graph = buildContentGraph(entries);

if (issues.length > 0) {
  for (const issue of issues) process.stderr.write(`✗ ${issue.code} ${issue.path}: ${issue.message}\n`);
  process.exit(1);
}
if (!graph.ok) {
  for (const issue of graph.error) process.stderr.write(`✗ ${issue.code} ${issue.path}: ${issue.message}\n`);
  process.exit(1);
}
for (const entry of entries.slice(0, 3)) process.stdout.write(`✓ ${previewContent(entry, 'ru-RU')}\n`);
process.stdout.write(`content:check OK — ${entries.length} записей, ${graph.value.edges.length} связей\n`);
