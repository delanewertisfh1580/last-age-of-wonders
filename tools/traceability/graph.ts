/**
 * Построение графа трассировки Intent → Design → Spec → Ticket
 * и матрицы покрытия. Чистые вычисления, без I/O.
 */
import { ParsedDoc, ParsedTicket } from './parse.ts';

export interface GraphNode {
  id: string;
  kind: 'intent' | 'design' | 'spec' | 'ticket';
  label: string;
  sub?: string;
  path?: string;
  status?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  from: string; // parent (ближе к корню)
  to: string;   // child
  via: string;  // тип связи: intent | design | spec | section | requirement | ac | depends
  detail?: string;
}

export interface TraceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Предки по видам для каждого тикета — плоская трассировка до корня */
  ticketTraces: Record<string, { intents: string[]; designs: string[]; specs: string[] }>;
  coverage: CoverageReport;
}

export interface CoverageReport {
  intents: Record<string, { specs: string[]; tickets: number }>;
  specs: Record<string, { tickets: number; requirements: string[]; acs: string[] }>;
  orphanTickets: string[];    // тикеты без ссылки на DEV-SPEC
  orphanSpecs: string[];      // спеки без тикетов
  danglingRefs: string[];     // ссылки на несуществующие документы
}

// ─── Сборка ──────────────────────────────────────────────────────────────────

export function buildGraph(docs: ParsedDoc[], tickets: ParsedTicket[]): TraceGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const addNode = (n: GraphNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };
  const addEdge = (from: string, to: string, via: string, detail?: string) => {
    const e = { from, to, via, detail };
    if (!edges.some(x => x.from === from && x.to === to && x.via === via && x.detail === detail)) edges.push(e);
  };

  const intent = docs.find(d => d.kind === 'intent');
  const generalDesign = docs.find(d => d.id.startsWith('GENERAL DESIGN'));
  const designs = docs.filter(d => d.kind === 'design' && !d.id.startsWith('GENERAL DESIGN'));
  const specs = docs.filter(d => d.kind === 'spec');
  const specIds = new Set(specs.map(s => s.id));
  const designTitles = new Map<string, ParsedDoc>();
  for (const d of designs) designTitles.set(d.title.toLowerCase(), d);

  // Корень
  if (intent) addNode({ id: intent.id, kind: 'intent', label: `INTENT v${intent.version}`, sub: intent.title, path: intent.path, status: intent.status });
  const rootId = intent?.id ?? 'INTENT v1.0';

  // GENERAL DESIGN — дочерний узел уровня 1
  if (generalDesign) {
    addNode({ id: generalDesign.id, kind: 'design', label: 'GENERAL DESIGN', sub: generalDesign.title, path: generalDesign.path, status: generalDesign.status });
    addEdge(rootId, generalDesign.id, 'intent', ...generalDesign.intentRefs.length ? [`INT: ${generalDesign.intentRefs.join(', ')}`] : []);
  }

  // DESIGN-документы — уровень 2. Родитель: GD (по умолчанию) либо другой DESIGN (расширение).
  for (const d of designs) {
    addNode({ id: d.id, kind: 'design', label: `DESIGN «${d.title}»`, sub: d.status, path: d.path, status: d.status });
    let parentLinked = false;
    // расширение другого DESIGN: "Основана на: SPECIFICATION …" внутри raw шапки
    for (const [title, other] of designTitles) {
      if (other.id === d.id) continue;
      if (d.raw.slice(0, 3000).toLowerCase().includes(title)) {
        addEdge(other.id, d.id, 'design');
        parentLinked = true;
      }
    }
    if (!parentLinked && generalDesign) addEdge(generalDesign.id, d.id, 'intent', d.intentRefs.length ? `INT: ${d.intentRefs.join(', ')}` : undefined);
  }

  // Индекс DESIGN-секций: SPEC-PARTY-005 → документ-владелец
  const sectionOwner = new Map<string, string>();
  for (const d of designs) for (const s of d.designRefs) if (!sectionOwner.has(s)) sectionOwner.set(s, d.id);
  // GD-NN → GENERAL DESIGN
  const gdSections = new Set((generalDesign?.raw.match(/GD-\d+/g) ?? []));

  // DEV-SPEC
  for (const s of specs) {
    addNode({
      id: s.id, kind: 'spec', label: `${s.id} «${s.title}»`, sub: s.status, path: s.path, status: s.status,
      meta: { designBlocks: s.designRefs },
    });
    // Связь spec → design: явные SPEC-* секции + GD-* блоки
    const linkedDesigns = new Set<string>();
    for (const ref of s.designRefs) {
      if (ref.startsWith('GD-')) {
        if (generalDesign) { addEdge(generalDesign.id, s.id, 'design', ref); linkedDesigns.add(generalDesign.id); }
      } else {
        const owner = sectionOwner.get(ref);
        if (owner) { addEdge(owner, s.id, 'design', ref); linkedDesigns.add(owner); }
      }
    }
    // Явное имя DESIGN в шапке "Основана на: DESIGN v1.0 — «…»"
    const headerMentions = s.raw.slice(0, 2500);
    for (const d of designs) {
      if (!linkedDesigns.size && headerMentions.includes(`«${d.title}»`)) {
        addEdge(d.id, s.id, 'design');
        linkedDesigns.add(d.id);
      }
    }
    // Прямые ссылки INT-* в шапке спеки
    for (const i of s.intentRefs) addEdge(rootId, s.id, 'intent', i);
    // spec → spec (зависимости из шапки) — только точные существующие ID
    for (const dep of s.specRefs) {
      if (specIds.has(dep) && dep !== s.id) addEdge(dep, s.id, 'spec', 'зависит от');
    }
  }

  // Тикеты
  const ticketIds = new Set(tickets.map(t => t.id));
  const ticketTraces: TraceGraph['ticketTraces'] = {};
  for (const t of tickets) {
    addNode({
      id: t.id, kind: 'ticket',
      label: `${t.id} · ${t.title}`,
      sub: `${t.milestone}${t.size ? ' · ' + t.size : ''}`,
      path: t.path,
      meta: { requirements: t.requirements, acs: t.acs, sections: t.specSections },
    });
    const trace = { intents: new Set<string>(), designs: new Set<string>(), specs: new Set<string>() };

    for (const sid of t.specRefs) {
      if (specIds.has(sid)) {
        // самый длинный идентификатор: TKT → SPEC → §секция → R/AC
        const detail = [
          t.specSections.length ? `§${t.specSections.join(', §')}` : '',
          t.requirements.length ? t.requirements.map(r => `${sid}-${r}`).join(', ') : '',
          t.acs.length ? t.acs.map(a => `${sid}-${a}`).join(', ') : '',
        ].filter(Boolean).join(' · ');
        addEdge(sid, t.id, 'section', detail || undefined);
        trace.specs.add(sid);
      }
    }
    for (const ref of t.designRefs) {
      if (ref.startsWith('GD-')) {
        if (generalDesign) { trace.designs.add(generalDesign.id); trace.intents.add(rootId); }
      } else {
        const owner = sectionOwner.get(ref);
        if (owner) { trace.designs.add(owner); }
        else addEdge('__dangling__', ref, 'design'); // отметка о висячей ссылке
      }
    }
    for (const i of t.intentRefs) trace.intents.add(rootId);

    // Транзитивное замыкание: предки спеки поднимаются к тикету
    for (const sid of trace.specs) {
      for (const e of edges) {
        if (e.to === sid && e.from !== rootId) {
          if (nodes.get(e.from)?.kind === 'design') trace.designs.add(e.from);
        }
        if (e.to === sid && e.via === 'intent') trace.intents.add(e.from);
      }
    }
    ticketTraces[t.id] = { intents: [...trace.intents], designs: [...trace.designs], specs: [...trace.specs] };

    // Зависимости тикетов — НЕ рёбра дерева (иначе цикл в иерархии), храним в meta
  }

  // Висячие ссылки: все child-узлы без родителя
  const withParent = new Set(edges.map(e => e.to));
  const dangling: string[] = [];
  for (const n of nodes.values()) {
    if (n.id === rootId) continue;
    if (!withParent.has(n.id)) dangling.push(n.id);
  }

  const coverage = computeCoverage(docs, tickets, edges, specIds, rootId);

  return { nodes: [...nodes.values()], edges: edges.filter(e => e.from !== '__dangling__'), ticketTraces, coverage: { ...coverage, danglingRefs: dangling } };
}

function computeCoverage(
  docs: ParsedDoc[], tickets: ParsedTicket[], edges: GraphEdge[],
  specIds: Set<string>, rootId: string,
): CoverageReport {
  const specs = docs.filter(d => d.kind === 'spec');
  const intents: CoverageReport['intents'] = {};
  const specCov: CoverageReport['specs'] = {};
  const intentDoc = docs.find(d => d.kind === 'intent');
  for (const i of intentDoc?.intentRefs ?? []) intents[i] = { specs: [], tickets: 0 };

  for (const s of specs) specCov[s.id] = { tickets: 0, requirements: [], acs: [] };

  for (const t of tickets) {
    for (const sid of t.specRefs) {
      if (!specCov[sid]) continue;
      specCov[sid].tickets++;
      for (const r of t.requirements) if (!specCov[sid].requirements.includes(`${sid}-${r}`)) specCov[sid].requirements.push(`${sid}-${r}`);
      for (const a of t.acs) if (!specCov[sid].acs.includes(`${sid}-${a}`)) specCov[sid].acs.push(`${sid}-${a}`);
    }
  }

  // int-требования через рёбра spec←root(via intent) и транзитивно к тикетам
  for (const e of edges) {
    if (e.via === 'intent' && e.detail?.startsWith('INT:')) {
      const list = (e.detail.slice(5)).split(', ');
      const target = e.to;
      if (target in specCov) {
        for (const i of list) if (intents[i]) { if (!intents[i].specs.includes(target)) intents[i].specs.push(target); intents[i].tickets += specCov[target].tickets; }
      }
    }
  }

  const orphanTickets = tickets.filter(t => !t.specRefs.some(s => specIds.has(s))).map(t => t.id);
  const orphanSpecs = Object.entries(specCov).filter(([, v]) => v.tickets === 0).map(([k]) => k);

  return { intents, specs: specCov, orphanTickets, orphanSpecs, danglingRefs: [] };
}
