/**
 * Парсер документации .workflow для трассировки Intent → Design → Spec → Ticket.
 * Чистый TypeScript, без внешних зависимостей (запускается bun или node via tsx).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─── Типы ────────────────────────────────────────────────────────────────────

export type DocKind = 'intent' | 'design' | 'spec' | 'ticket';

export interface ParsedDoc {
  kind: DocKind;
  /** Канонический ID документа: INTENT / GENERAL DESIGN / DEV-SPEC-001 … */
  id: string;
  title: string;
  version: string;
  status: string;
  /** Относительный путь в репозитории */
  path: string;
  raw: string;
  /** Ссылки на секции/блоки DESIGN: SPEC-*, GD-* */
  designRefs: string[];
  /** Ссылки на требования INTENT: INT-* */
  intentRefs: string[];
  /** Ссылки на DEV-SPEC (для тикетов и спеков) */
  specRefs: string[];
}

export interface ParsedTicket extends ParsedDoc {
  milestone: string; // M1..M8
  requirements: string[]; // R01…
  acs: string[]; // AC01…
  size: string;
  dependsOn: string[]; // TKT-…
  /** Секции DEV-SPEC, на которые ссылается тикет: 4.2, 6.2 … */
  specSections: string[];
}

// ─── Регулярки идентификаторов ───────────────────────────────────────────────

const RE_DESIGN_SECTION = /\bSPEC-[A-Z]+-\d+(?:\.\d+)?\b/g;
const RE_GD = /\bGD-\d+(?:\.\d+)?\b/g;
const RE_INTENT = /\bINT-\d+(?:\.\d+)?\b/g;
const RE_DEV_SPEC = /\bDEV-SPEC-\d{3}\b/g;
const RE_TKT = /\bTKT-M\d+-\d{3}\b/g;
const RE_SPEC_SECTION_REF = /§\s*\d+(?:\.\d+)*/g;

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

function matches(text: string, re: RegExp): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(re)) set.add(m[0]);
  return [...set].sort();
}

/** Значение жирного поля "**Ключ:** значение" (первое вхождение до ---) */
function field(text: string, key: string): string {
  const m = text.match(new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+)`));
  return m ? m[1].trim() : '';
}

function guillemets(s: string): string {
  const m = s.match(/«([^»]*)»/);
  return m ? m[1] : s;
}

function exists(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function findFirst(root: string, subdirs: string[], pred: (name: string) => boolean): string | null {
  for (const sd of subdirs) {
    const dir = join(root, sd);
    if (!exists(dir)) continue;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      try {
        if (statSync(p).isFile() && pred(name)) return p;
      } catch { /* ignore */ }
    }
  }
  return null;
}

// ─── Парсинг верхнего уровня (.workflow/change|design|spec) ─────────────────

export function parseTopLevelDocs(workflowDir: string, repoRoot: string): ParsedDoc[] {
  const docs: ParsedDoc[] = [];

  // 1. INTENT — корень дерева
  const intentFile = findFirst(workflowDir, ['change', '.'], f => f.startsWith('INTENT') && f.endsWith('.md'));
  if (intentFile) {
    const raw = readFileSync(intentFile, 'utf8');
    const h1 = raw.match(/^#\s+(.+)$/m)?.[1] ?? 'INTENT';
    docs.push({
      kind: 'intent',
      id: 'INTENT v1.0',
      title: guillemets(h1),
      version: h1.match(/v(\d+\.\d+)/)?.[1] ?? '1.0',
      status: field(raw, 'Статус'),
      path: relative(repoRoot, intentFile),
      raw,
      designRefs: [],
      intentRefs: matches(raw, RE_INTENT),
      specRefs: [],
    });
  }

  // 2. GENERAL DESIGN
  const gdFile = findFirst(workflowDir, ['design', '.'], f => f.includes('GENERAL DESIGN') && f.endsWith('.md'));
  if (gdFile) {
    const raw = readFileSync(gdFile, 'utf8');
    const h1 = raw.match(/^#\s+(.+)$/m)?.[1] ?? 'GENERAL DESIGN';
    docs.push({
      kind: 'design',
      id: 'GENERAL DESIGN v1.0',
      title: guillemets(h1),
      version: h1.match(/v(\d+\.\d+)/)?.[1] ?? '1.0',
      status: field(raw, 'Статус'),
      path: relative(repoRoot, gdFile),
      raw,
      designRefs: [],
      intentRefs: matches(raw, RE_INTENT),
      specRefs: [],
    });
  }

  // 3. DESIGN-документы (уровень 2)
  const designDir = join(workflowDir, 'design');
  if (exists(designDir)) {
    for (const file of walk(designDir)) {
      const base = file.split('/').pop()!;
      if (!base.startsWith('DESIGN')) continue;
      const raw = readFileSync(file, 'utf8');
      const docId = `DESIGN ${base.match(/v(\d+\.\d+)/)?.[1] ?? '1.0'} — «${guillemets(base)}»`;
      docs.push({
        kind: 'design',
        id: docId,
        title: guillemets(base),
        version: base.match(/v(\d+\.\d+)/)?.[1] ?? '1.0',
        status: field(raw, 'Статус'),
        path: relative(repoRoot, file),
        raw,
        designRefs: matches(raw, RE_DESIGN_SECTION),
        intentRefs: matches(raw.slice(0, 3000), RE_INTENT),
        specRefs: [],
      });
    }
  }

  // 4. DEV-SPEC-документы
  const specDir = join(workflowDir, 'spec');
  if (exists(specDir)) {
    for (const file of walk(specDir)) {
      const base = file.split('/').pop()!;
      const idm = base.match(/DEV-SPEC-(\d{3})/);
      if (!idm) continue; // OVERVIEW / TEMPLATE не узлы дерева
      const raw = readFileSync(file, 'utf8');
      const header = raw.slice(0, 2500); // шапка: ссылки внутри тела — шум трассировки
      const own = `DEV-SPEC-${idm[1]}`;
      docs.push({
        kind: 'spec',
        id: own,
        title: guillemets(base),
        version: base.match(/v(\d+\.\d+)/)?.[1] ?? '1.0',
        status: field(raw, 'Статус'),
        path: relative(repoRoot, file),
        raw,
        designRefs: [...matches(header, RE_DESIGN_SECTION), ...matches(header, RE_GD)],
        intentRefs: matches(header, RE_INTENT),
        specRefs: matches(header, RE_DEV_SPEC).filter(x => x !== own),
      });
    }
  }

  return docs;
}

// ─── Парсинг тикетов (.workflow/ticket/**) ──────────────────────────────────

export function parseTickets(workflowDir: string, repoRoot: string): ParsedTicket[] {
  const ticketDir = join(workflowDir, 'ticket');
  if (!exists(ticketDir)) return [];
  const tickets: ParsedTicket[] = [];

  for (const file of walk(ticketDir)) {
    const base = file.split('/').pop()!;
    if (!base.startsWith('TICKETS')) continue; // пропускаем TICKET-TEMPLATE
    const raw = readFileSync(file, 'utf8');
    // тикет-блоки могут быть на ### (M-файлы) или #### (шаблон/примеры)
    const blocks = raw.split(/\n#{3,4}\s+/).slice(1);

    for (const block of blocks) {
      const headMatch = block.match(/^(TKT-M\d+-\d{3})\s*—\s*(.+)$/);
      if (!headMatch) continue;
      const [, id, nameRaw] = headMatch;
      const end = block.indexOf('\n---');
      const section = end >= 0 ? block.slice(0, end) : block;

      const specLine = field(section, 'DEV-SPEC');
      let specIds = matches(specLine, RE_DEV_SPEC);
      if (!specIds.length) specIds = matches(section.slice(0, 600), RE_DEV_SPEC);
      const specSections = matches(specLine, RE_SPEC_SECTION_REF).map(s => s.replace(/§\s*/, ''));

      const reqLine = field(section, 'Требования');
      const acLine = field(section, 'AC');
      const depLine = field(section, 'Зависит от');

      const deps = new Set(matches(depLine, RE_TKT));
      // диапазоны вида "TKT-M1-011…014" или "TKT-M5-002…006"
      for (const m of depLine.matchAll(/(TKT-M\d+-)(\d{3})…(\d{3})/g)) {
        const a = parseInt(m[2], 10), b = parseInt(m[3], 10);
        for (let i = a; i <= b; i++) deps.add(`${m[1]}${String(i).padStart(3, '0')}`);
      }

      const acs = new Set<string>(matches(acLine, /\bAC\d{2}\b/g));
      // AC в явном виде: "DEV-SPEC-020-AC01"
      for (const m of section.matchAll(/\bDEV-SPEC-\d{3}-(AC\d{2})\b/g)) acs.add(m[1]);

      tickets.push({
        kind: 'ticket',
        id,
        title: nameRaw.trim(),
        version: '1.0',
        status: '',
        path: relative(repoRoot, file),
        raw: section,
        designRefs: [...new Set([...matches(section, RE_DESIGN_SECTION), ...matches(section, RE_GD)])].sort(),
        intentRefs: matches(section, RE_INTENT),
        specRefs: specIds,
        milestone: id.match(/TKT-(M\d+)/)![1],
        requirements: matches(reqLine, /\bR\d{2}\b/g),
        acs: [...acs].sort(),
        size: field(section, 'Размер'),
        dependsOn: [...deps].sort(),
        specSections,
      });
    }
  }
  return tickets;
}
