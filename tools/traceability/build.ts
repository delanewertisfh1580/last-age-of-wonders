/**
 * Трассировка «тикет → намерение» и генерация статической HTML-визуализации
 * (D3, дерево Intent → General Design → Design → DEV-SPEC → TKT).
 * Запуск: bun tools/traceability/build.ts [--ticket TKT-M1-001] [--out docs/traceability]
 */
import { existsSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTopLevelDocs, parseTickets, ParsedTicket } from './parse.ts';
import { buildGraph, TraceGraph } from './graph.ts';

// ROOT: из cwd (bun tools/... / node dist/...) или от файла на два уровня вверх
function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, '.workflow'))) return dir;
    dir = dirname(dir);
  }
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..');
}
const RAW_ROOT = findRoot();
// в git-worktree .workflow может быть симлинком — берём его realpath как корень
const WORKFLOW_REAL = realpathSync(join(RAW_ROOT, '.workflow'));
const ROOT = process.env.TRACE_REPO_ROOT ?? (WORKFLOW_REAL ? dirname(WORKFLOW_REAL) : RAW_ROOT);
const WORKFLOW_DIR = WORKFLOW_REAL || join(ROOT, '.workflow');

// ─── CLI ─────────────────────────────────────────────────────────────────────

function arg(name: string): string | null {
  const m = process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1]
    ?? (() => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; })();
  return m ?? null;
}

const focusTicket = arg('ticket');
const outDir = join(ROOT, arg('out') ?? 'docs/traceability');

// ─── Сбор ────────────────────────────────────────────────────────────────────

const docs = parseTopLevelDocs(WORKFLOW_DIR, ROOT);
const tickets = parseTickets(WORKFLOW_DIR, ROOT);
const graph = buildGraph(docs, tickets);

// Дерево: parent → children (только иерархические рёбра)
interface TreeNode { id: string; children: TreeNode[]; }
const childrenOf = new Map<string, { to: string; via: string; detail?: string }[]>();
for (const e of graph.edges) {
  if (!childrenOf.has(e.from)) childrenOf.set(e.from, []);
  childrenOf.get(e.from)!.push({ to: e.to, via: e.via, detail: e.detail });
}
const rootId = graph.nodes.find(n => n.kind === 'intent')?.id ?? 'INTENT v1.0';

function makeTree(id: string, seen: Set<string>, depth: number): TreeNode {
  const s = new Set(seen).add(id);
  const kids: TreeNode[] = [];
  for (const c of childrenOf.get(id) ?? []) {
    if (s.has(c.to) || depth > 6) continue; // защита от циклов spec→spec
    kids.push(makeTree(c.to, s, depth + 1));
  }
  kids.sort((a, b) => a.id.localeCompare(b.id));
  return { id, children: kids };
}

// Для --ticket: обрезанное дерево — только пути от корня к фокусному тикету
function pruneToFocus(tree: TreeNode, focus: string): TreeNode | null {
  if (tree.id === focus) return { ...tree, children: [] };
  const kept: TreeNode[] = [];
  for (const c of tree.children) {
    const p = pruneToFocus(c, focus);
    if (p) kept.push(p);
  }
  return kept.length ? { ...tree, children: kept } : null;
}

let tree = makeTree(rootId, new Set(), 0);
if (focusTicket) {
  const pruned = pruneToFocus(tree, focusTicket);
  if (!pruned) {
    console.error(`Тикет ${focusTicket} не найден в дереве трассировки.`);
    process.exit(1);
  }
  tree = pruned;
}

// ─── Отчёт в консоль ─────────────────────────────────────────────────────────

const nodeById = new Map(graph.nodes.map(n => [n.id, n]));
console.log(`Узлы: ${graph.nodes.length}, рёбра: ${graph.edges.length}`);
console.log(`Спекификации: ${docs.filter(d => d.kind === 'spec').length}, тикеты: ${tickets.length}`);
console.log(`Без тикетов (orphan specs): ${graph.coverage.orphanSpecs.join(', ') || 'нет'}`);
console.log(`Висячие узлы (без родителя): ${graph.coverage.danglingRefs.join(', ') || 'нет'}`);

if (focusTicket) {
  const t = tickets.find(x => x.id === focusTicket);
  console.log('\n═══ ТРАССИРОВКА ═══');
  printTrace(focusTicket, t, graph);
} else {
  console.log('\n═══ ПОКРЫТИЕ INTENT → TICKETS ═══');
  for (const [i, v] of Object.entries(graph.coverage.intents)) {
    if (v.specs.length) console.log(`${i.padEnd(9)} specs: ${v.specs.join(', ')}  tickets≈${v.tickets}`);
  }
}

function printTrace(id: string, t: ParsedTicket | undefined, g: TraceGraph) {
  const tr = g.ticketTraces[id];
  const chain: string[] = [rootId, ...tr.designs, ...tr.specs, id];
  const fmt = (x: string) => `${x} — ${nodeById.get(x)?.label?.replace(/^[^«]*«?/, '').slice(0, 60) ?? ''}`;
  console.log('INTENT   :', fmt(rootId));
  for (const d of tr.designs) console.log('DESIGN   :', fmt(d));
  for (const s of tr.specs) console.log('SPEC     :', fmt(s));
  console.log('TICKET   :', fmt(id));
  if (t) {
    console.log('Идентификатор связи:', [
      ...t.specRefs.map(s => t.specSections.length ? `${s} §${t.specSections.join(',§')}` : s),
      ...t.requirements.map(r => `${t.specRefs[0]}-${r}`),
      ...t.acs.map(a => `${t.specRefs[0]}-${a}`),
    ].join(' · '));
    if (t.dependsOn.length) console.log('Зависит от:', t.dependsOn.join(', '));
  }
}

// ─── Артефакты ───────────────────────────────────────────────────────────────

const BASE_PATH = process.env.TRACE_BASE_PATH ?? ''; // например '/nvm-w0' для GitHub Pages из подпадки

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'graph.json'), JSON.stringify(graph, null, 2));
writeFileSync(join(outDir, 'index.html'), renderHtml(tree, graph, focusTicket));
console.log(`\nАртефакты: ${join(outDir, 'index.html')}, graph.json`);

// ─── HTML / D3 ───────────────────────────────────────────────────────────────

function renderHtml(tree: TreeNode, g: TraceGraph, focus: string | null): string {
  const data = JSON.stringify(tree).replace(/</g, '\\u003c');
  const nodes = JSON.stringify(Object.fromEntries(g.nodes.map(n => [n.id, {
    kind: n.kind, label: n.label, sub: n.sub ?? '', path: n.path ?? '',
    reqs: (n.meta?.requirements as string[]) ?? [], acs: (n.meta?.acs as string[]) ?? [],
    sections: (n.meta?.sections as string[]) ?? [],
  }]))).replace(/</g, '\\u003c');
  const traces = JSON.stringify(g.ticketTraces).replace(/</g, '\\u003c');
  const stats = {
    specs: g.nodes.filter(n => n.kind === 'spec').length,
    tickets: g.nodes.filter(n => n.kind === 'ticket').length,
    designs: g.nodes.filter(n => n.kind === 'design').length,
    orphanSpecs: g.coverage.orphanSpecs.length,
  };

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Трассировка: тикет → намерение</title>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"><\/script>
<style>
  :root { --intent:#e0457b; --design:#f59e0b; --gd:#d97706; --spec:#3b82f6; --ticket:#10b981; }
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin:0; background:#0f172a; color:#e2e8f0; }
  header { padding:14px 22px; background:#1e293b; display:flex; gap:18px; align-items:baseline; flex-wrap:wrap; }
  header h1 { font-size:18px; margin:0; }
  .stat { font-size:13px; color:#94a3b8; } .stat b { color:#e2e8f0; }
  #legend { padding:8px 22px; font-size:12px; color:#94a3b8; display:flex; gap:16px; flex-wrap:wrap;}
  .dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
  svg { display:block; width:100%; height:calc(100vh - 110px); cursor:grab; }
  .link { fill:none; stroke:#334155; stroke-opacity:.7; stroke-width:1.4px; }
  .node circle { stroke-width:2px; cursor:pointer; }
  .node text { font-size:11px; fill:#cbd5e1; }
  .node:hover circle { filter:brightness(1.4); }
  .hl circle { filter:brightness(1.6); stroke-width:3px !important; }
  .hl text { fill:#fff; font-weight:600; }
  #tip { position:fixed; pointer-events:none; background:#1e293b; border:1px solid #475569;
         border-radius:8px; padding:10px 12px; font-size:12px; max-width:420px; display:none; z-index:10;
         box-shadow:0 8px 24px rgba(0,0,0,.5);}
  #tip code { color:#7dd3fc; } #tip .k { color:#94a3b8; }
  input#search { background:#0f172a; color:#e2e8f0; border:1px solid #475569; border-radius:6px; padding:5px 10px; font-size:13px; width:260px;}
</style>
</head>
<body>
<header>
  <h1>🧭 Трассировка: тикет → намерение</h1>
  <span class="stat"><b>${stats.designs}</b> design · <b>${stats.specs}</b> спеков · <b>${stats.tickets}</b> тикетов · <b>${stats.orphanSpecs}</b> спеков без тикетов</span>
  <input id="search" placeholder="фильтр: TKT-M1-001 / DEV-SPEC-001…" />
  <span class="stat">${focus ? `фокус: <b>${focus}</b>` : 'клик по тикету — подсветка пути до INTENT'}</span>
</header>
<div id="legend">
  <span><i class="dot" style="background:var(--intent)"></i>Intent (корень)</span>
  <span><i class="dot" style="background:var(--gd)"></i>General Design</span>
  <span><i class="dot" style="background:var(--design)"></i>Design</span>
  <span><i class="dot" style="background:var(--spec)"></i>DEV-SPEC</span>
  <span><i class="dot" style="background:var(--ticket)"></i>TKT (лист)</span>
</div>
<svg id="chart"></svg>
<div id="tip"></div>
<script>
const TREE = ${data};
const NODES = ${nodes};
const TRACES = ${traces};
const COLORS = { intent:'#e0457b', design:'#f59e0b', gd:'#d97706', spec:'#3b82f6', ticket:'#10b981' };
const isGD = id => id.startsWith('GENERAL DESIGN');
const color = k => k==='design'&&isGD===false?'':''; 

const svg = d3.select('#chart');
const g = svg.append('g');
const zoom = d3.zoom().scaleExtent([0.05, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

const root = d3.hierarchy(TREE, d => d.children);
const W = window.innerWidth, H = Math.max(window.innerHeight, 2000);
const layout = d3.tree().size([H - 60, W * 1.1]);
layout.separation((a,b)=> (a.parent===b.parent?1:2) / 2);
layout(root);
// горизонтальное дерево: y — глубина
root.each(d => { d.x = d.y; });

g.append('g').selectAll('path').data(root.links()).join('path')
  .attr('class','link')
  .attr('d', d3.linkHorizontal().x(d=>d.y*1).y(d=>d.x));

const sel = g.append('g').selectAll('g').data(root.descendants()).join('g')
  .attr('class','node')
  .attr('transform', d => \`translate(\${d.y},\${d.x})\`)
  .on('click', (ev,d) => highlightPath(d))
  .on('mousemove', (ev,d) => showTip(ev,d))
  .on('mouseleave', hideTip);

sel.append('circle')
  .attr('r', d => d.data.id===TREE.id?12:d.children?7:5)
  .attr('fill', d => { const k=NODES[d.data.id]?.kind; return k==='design'&&isGD(d.data.id)?COLORS.gd:COLORS[k]||'#64748b'; });

sel.append('text')
  .attr('dy', 4)
  .attr('x', d => d.children ? -12 : 10)
  .attr('text-anchor', d => d.children ? 'end':'start')
  .text(d => shortLabel(d.data.id));

function shortLabel(id){
  const l = NODES[id]?.label || id;
  return l.length>64 ? l.slice(0,62)+'…' : l;
}

function highlightPath(d){
  sel.classed('hl', false);
  let n = d;
  while(n){ n.classed && null; n = n.parent; }
  const ids = new Set();
  n = d; while(n){ ids.add(n.data.id); n=n.parent; }
  sel.classed('hl', x => ids.has(x.data.id));
  g.selectAll('.link').attr('stroke', l => ids.has(l.target.data.id)&&ids.has(l.source.data.id)?'#e2e8f0':'#334155')
   .attr('stroke-width', l => ids.has(l.target.data.id)&&ids.has(l.source.data.id)?2.5:1.4);
}

function showTip(ev,d){
  const n = NODES[d.data.id]; if(!n) return hideTip();
  const tip = document.getElementById('tip');
  let html = '<b>'+n.label+'</b><br>';
  if(n.sub) html += '<span class=k>'+n.sub+'</span><br>';
  if(n.path) html += '<span class=k>📄 '+n.path+'</span><br>';
  if(n.sections.length) html += '<code>§'+n.sections.join(', §')+'</code><br>';
  if(n.reqs.length) html += '<code>'+n.reqs.join(', ')+'</code><br>';
  if(n.acs.length) html += '<code>'+n.acs.join(', ')+'</code><br>';
  if(TRACES[d.data.id]) { const t=TRACES[d.data.id];
    html += '<hr size=1 color=#334155>⬆️ '+t.designs.length+' design · '+t.specs.length+' spec'; }
  tip.innerHTML = html; tip.style.display='block';
  tip.style.left = Math.min(ev.clientX+14, window.innerWidth-440)+'px';
  tip.style.top = (ev.clientY+10)+'px';
}
function hideTip(){ document.getElementById('tip').style.display='none'; }

document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  sel.style('opacity', d => !q || d.data.id.toLowerCase().includes(q) || (NODES[d.data.id]?.label||'').toLowerCase().includes(q) ? 1 : 0.12);
});

// авто-zoom чтобы влезло
const b = g.node().getBBox();
const scale = Math.min((W-40)/b.width, (window.innerHeight-160)/b.height, 1.2);
svg.call(zoom.transform, d3.zoomIdentity.translate(40 - b.x*scale, 40 - b.y*scale).scale(scale));
<\/script>
</body>
</html>`;
}
