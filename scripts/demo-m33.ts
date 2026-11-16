/**
 * TKT-M33: демо M33 — скаффолд → lint → граф → preview.
 * Запуск: bun scripts/demo-m33.ts
 */
import {
  buildContentGraph,
  lintContent,
  previewContent,
  scaffoldContent,
  type AuthoringEntry,
} from '../src/domain/authoring/Authoring.js';

const good = scaffoldContent('good', 'amber') as AuthoringEntry;
const quest = { ...(scaffoldContent('quest', 'amber-run') as AuthoringEntry), requires: ['amber'] };
const broken = { id: 'broken', kind: 'good' as const };

const entries: readonly AuthoringEntry[] = [good, quest];
const withIssues = [...entries, broken];
const issues = lintContent(withIssues);
const graph = buildContentGraph(entries);
const cycle = buildContentGraph([
  { id: 'a', kind: 'quest', requires: ['b'] },
  { id: 'b', kind: 'quest', requires: ['a'] },
]);

process.stdout.write(`→ скаффолд: ${Object.keys(good).join(',')}\n`);
process.stdout.write(`→ lint: корректных=${lintContent(entries).length}, проблем=${issues.map((i) => i.code).join(',')}\n`);
process.stdout.write(`→ граф: nodes=${graph.ok ? graph.value.nodes.length : 0}, edges=${graph.ok ? graph.value.edges.length : 0}\n`);
process.stdout.write(`→ цикл: ${cycle.ok ? 'нет' : cycle.error[0].code}\n`);
process.stdout.write(`→ preview: ${previewContent(good, 'ru-RU')}\n`);

if (lintContent(entries).length !== 0 || issues.length !== 2 || !graph.ok || graph.value.edges.length !== 1 || cycle.ok) {
  process.stderr.write('DEMO M33 FAILED\n');
  process.exit(1);
}
process.stdout.write('DEMO M33 OK — скаффолд → lint → граф → preview\n');
