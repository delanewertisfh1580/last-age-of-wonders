#!/usr/bin/env bun
/**
 * Трассировка документации .workflow.
 *
 * Читает все Markdown-документы из .workflow и строит сквозную цепочку:
 *
 *   TICKET (TKT-M1-001)
 *     → DEV-SPEC (DEV-SPEC-001, разделы §…)
 *       → DESIGN-блок (GD-01 / SPEC-ECON-001)
 *         → DESIGN-документ (GENERAL DESIGN / DESIGN v1.0 — «…»)
 *           → INTENT-пункт (INT-06 …) → INTENT
 *
 * Результат: trace/dist/index.html (автономная визуализация для GitHub Pages)
 * и trace/dist/trace-data.json (машиночитаемый граф).
 *
 * Запуск: bun run trace:build        (или bun tools/trace/build-trace.ts)
 *         bun run trace:build -- --strict   — падать при разрывах-ошибках.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORKFLOW_DIR = path.join(ROOT, ".workflow");
const OUT_DIR = path.join(ROOT, "trace", "dist");
const REPO = process.env.GITHUB_REPOSITORY ?? "delanewertisfh1580/last-age-of-wonders";
const REF = process.env.GITHUB_REF_NAME ?? "main";
const STRICT = process.argv.includes("--strict");

type DocKind = "intent" | "general" | "design" | "spec" | "tickets" | "meta";
type StatusKind = "done" | "approved" | "planned" | "draft" | "unknown";

interface Doc {
  key: string;
  rel: string;
  kind: DocKind;
  id: string;
  title: string;
  status: string;
  wave: string;
  text: string;
}

interface Def {
  id: string;
  title: string;
  docKey: string;
  file: string;
  line: number;
}

interface SpecInfo {
  doc: Doc;
  id: string;
  title: string;
  status: string;
  wave: string;
  blocks: string[];
  gds: string[];
  intRefs: string[];
  deps: string[];
  ownerKeys: string[];
  primaryDocKey?: string;
  primaryBlock?: string;
  tickets: TicketInfo[];
}

interface TicketInfo {
  id: string;
  title: string;
  file: string;
  line: number;
  status: string;
  wave: string;
  size: string;
  specId?: string;
  sections: string[];
  deps: string[];
  specMentions: string[];
}

type ChainKind = "ticket" | "spec" | "block" | "design" | "int" | "intent";

interface ChainStep {
  kind: ChainKind;
  id: string;
  title?: string;
  file?: string;
  line?: number;
  url?: string;
}

interface RefItem {
  kind: ChainKind;
  id: string;
  title?: string;
  file?: string;
  line?: number;
  url?: string;
}

interface Detail {
  kindLabel: string;
  status?: string;
  wave?: string;
  file?: string;
  line?: number;
  url?: string;
  sections?: string[];
  specNid?: string;
  chain?: ChainStep[];
  refs?: RefItem[];
  specs?: RefItem[];
  tickets?: RefItem[];
  deps?: string[];
  note?: string;
}

interface Node {
  nid: string;
  kind: "intent" | "design" | "block" | "spec" | "ticket" | "group";
  id: string;
  title: string;
  status?: string;
  statusKind?: StatusKind;
  wave?: string;
  counts?: { specs: number; tickets: number; done: number };
  detail: Detail;
  children: Node[];
}

interface GapGroup {
  severity: "error" | "warning" | "info";
  title: string;
  items: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Чтение и парсинг документов
// ────────────────────────────────────────────────────────────────────────────

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "ru"))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const relOf = (abs: string): string => path.relative(WORKFLOW_DIR, abs).split(path.sep).join("/");
const baseOf = (rel: string): string => rel.split("/").pop() ?? rel;

function classify(rel: string): DocKind {
  const base = baseOf(rel);
  if (rel.startsWith("change/")) return "intent";
  if (rel.startsWith("design/")) return base.startsWith("GENERAL DESIGN") ? "general" : "design";
  if (rel.startsWith("spec/")) return /DEV-SPEC-\d{3}/.test(base) ? "spec" : "meta";
  if (rel.startsWith("ticket/")) return /TICKETS-M\d+/.test(base) ? "tickets" : "meta";
  return "meta";
}

function docId(rel: string, kind: DocKind): string {
  const base = baseOf(rel);
  if (kind === "intent") return "INTENT";
  if (kind === "general") return "GENERAL DESIGN";
  if (kind === "design") return "DESIGN";
  if (kind === "spec") return base.match(/DEV-SPEC-\d{3}/)?.[0] ?? base;
  if (kind === "tickets") return base.match(/TICKETS-M\d+/)?.[0] ?? base;
  return base;
}

function cleanTitle(h1: string): string {
  const quoted = h1.match(/—\s*«(.+?)»/);
  if (quoted) return quoted[1];
  return h1.replace(/^#\s+/, "").replace(/\s{2,}/g, " ").trim();
}

function readDoc(abs: string): Doc {
  const rel = relOf(abs);
  const text = fs.readFileSync(abs, "utf8");
  const kind = classify(rel);
  const h1 = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? baseOf(rel);
  const status =
    text.match(/^\*\*Статус:\*\*\s*(.+)$/m)?.[1]?.trim() ??
    text.match(/^Статус:\s*(.+)$/m)?.[1]?.trim() ??
    "";
  const wave = text.match(/^\*\*Волна:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "";
  return { key: rel, rel, kind, id: docId(rel, kind), title: cleanTitle(h1), status, wave, text };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/**
 * Достаёт ссылки семейства (GD / SPEC-XXX / INT) и разворачивает диапазоны:
 * `SPEC-ECON-001…022`, `GD-04…GD-09`, `INT-06…INT-09`, а также хвостовые
 * числовые диапазоны вроде `(SPEC-ECON-001…022, 050–066)`.
 */
function extractRefs(text: string, prefix: string, width: number): string[] {
  const out = new Set<string>();

  const rangeRe = new RegExp(`(${prefix})-(\\d+)\\s*(?:…|–|—|\\.\\.\\.)\\s*(?:(?:${prefix})-)?(\\d+)`, "g");
  for (const match of text.matchAll(rangeRe)) {
    const start = Number(match[2]);
    const end = Number(match[3]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 500) continue;
    for (let n = start; n <= end; n += 1) {
      out.add(`${match[1]}-${String(n).padStart(Math.max(width, match[2].length), "0")}`);
    }
  }

  const singleRe = new RegExp(`\\b(${prefix})-(\\d+)(\\.\\d+)?\\b`, "g");
  for (const match of text.matchAll(singleRe)) {
    out.add(`${match[1]}-${match[2]}${match[3] ?? ""}`);
  }

  // Голые диапазоны в строке, где уже объявлен префикс: `SPEC-ECON-001…022, 050–066`.
  for (const line of text.split("\n")) {
    const prefixed = line.match(new RegExp(`(${prefix})-(\\d+)`));
    if (!prefixed) continue;
    for (const match of line.matchAll(/\b(\d{2,4})\s*(?:…|–|—)\s*(\d{2,4})\b/g)) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 500) continue;
      for (let n = start; n <= end; n += 1) {
        out.add(`${prefixed[1]}-${String(n).padStart(Math.max(width, match[1].length), "0")}`);
      }
    }
  }

  return [...out];
}

function statusKind(status: string): StatusKind {
  const s = status.toLowerCase();
  if (s.includes("не начато") || s.includes("запланировано")) return "planned";
  if (s.includes("выполнено") || s.includes("реализовано")) return "done";
  if (s.includes("утверждено")) return "approved";
  if (s.includes("draft") || s.includes("ожидает")) return "draft";
  return "unknown";
}

function statusLabel(kind: StatusKind): string {
  switch (kind) {
    case "done":
      return "выполнено";
    case "approved":
      return "утверждено";
    case "planned":
      return "не начато";
    case "draft":
      return "draft";
    default:
      return "статус не указан";
  }
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

function blobUrl(rel: string, line?: number): string {
  const encoded = rel
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const anchor = line ? `#L${line}` : "";
  return `https://github.com/${REPO}/blob/${REF}/.workflow/${encoded}${anchor}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Сбор документов и реестров идентификаторов
// ────────────────────────────────────────────────────────────────────────────

const files = walkMarkdown(WORKFLOW_DIR);
const docs = files.map(readDoc);
const intentDoc = docs.find((d) => d.kind === "intent");
const generalDoc = docs.find((d) => d.kind === "general");
const designDocs = docs.filter((d) => d.kind === "design");
const specDocs = docs.filter((d) => d.kind === "spec");
const ticketDocs = docs.filter((d) => d.kind === "tickets");

if (!intentDoc) {
  console.error("Не найден INTENT в .workflow/change — трассировку построить нельзя.");
  process.exit(1);
}

const intDefs = new Map<string, Def>();
const gdDefs = new Map<string, Def>();
const gdIntMap = new Map<string, string[]>();
const blockDefs = new Map<string, Def>();
const specs = new Map<string, SpecInfo>();
const tickets = new Map<string, TicketInfo>();

for (const doc of docs) {
  const lines = doc.text.split("\n");

  if (doc.kind === "intent") {
    lines.forEach((line, i) => {
      const m = line.match(/^\*\*(INT-\d{2})\.\*\*\s*(.*)$/);
      if (!m) return;
      intDefs.set(m[1], {
        id: m[1],
        title: m[2].replace(/\s{2,}/g, " ").slice(0, 180).trim(),
        docKey: doc.key,
        file: doc.rel,
        line: i + 1,
      });
    });
    continue;
  }

  if (doc.kind === "general") {
    lines.forEach((line, i) => {
      const heading = line.match(/^#{2,4}\s+(.+)$/);
      if (!heading) return;
      const ids = [...heading[1].matchAll(/\bGD-\d{2}\b/g)].map((m) => m[0]);
      if (ids.length === 0) return;
      const clean = heading[1]
        .replace(/^[\d.]+\s*/, "")
        .replace(/\(GD-[^)]*\)/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      for (const id of ids) {
        gdDefs.set(id, { id, title: clean, docKey: doc.key, file: doc.rel, line: i + 1 });
      }
    });
    // Таблица «Покрываемые требования INTENT (GD → INT)» даёт по-блочную трассировку.
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      const gds = [...line.matchAll(/\bGD-\d{2}\b/g)].map((m) => m[0]);
      const ints = [...line.matchAll(/\bINT-\d{2}(?:\.\d+)?\b/g)].map((m) => m[0]);
      if (gds.length === 0 || ints.length === 0) continue;
      for (const gd of gds) gdIntMap.set(gd, unique([...(gdIntMap.get(gd) ?? []), ...ints]));
    }
    continue;
  }

  if (doc.kind === "design") {
    lines.forEach((line, i) => {
      const m =
        line.match(/^###\s+(SPEC-[A-Z]+-\d+)\.\s*(.*)$/) ??
        line.match(/^\*\*(SPEC-[A-Z]+-\d+)\.\s*(.*?)\*\*\s*$/);
      if (!m) return;
      blockDefs.set(m[1], {
        id: m[1],
        title: m[2].replace(/\*\*/g, "").replace(/\s{2,}/g, " ").trim(),
        docKey: doc.key,
        file: doc.rel,
        line: i + 1,
      });
    });
    continue;
  }

  if (doc.kind === "spec") {
    const ids = doc.id.match(/DEV-SPEC-\d{3}/);
    if (!ids) continue;
    specs.set(doc.id, {
      doc,
      id: doc.id,
      title: doc.title,
      status: doc.status,
      wave: doc.wave,
      blocks: [],
      gds: [],
      intRefs: [],
      deps: [],
      ownerKeys: [],
      tickets: [],
    });
  }
}

const generalKey = generalDoc?.key;

function intRefsOf(text: string): string[] {
  return extractRefs(text, "INT", 2).filter((id) => intDefs.has(id.split(".")[0]));
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Поле «Основана на» — основной источник выбора ветки DESIGN в дереве. */
function basisBlock(spec: SpecInfo): string {
  const text = spec.doc.text;
  const start = text.search(/^\*\*Основана на:\*\*/m);
  if (start < 0) return "";
  const tail = text.slice(start + "**Основана на:**".length);
  const nextField = tail.search(/\n\s*\n|\n\*\*/);
  const basis = nextField >= 0 ? tail.slice(0, nextField) : tail.slice(0, 800);
  return basis.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function basisPrimaryDocKey(spec: SpecInfo): string | undefined {
  const basis = basisBlock(spec);
  if (!basis) return undefined;
  const hasGeneral = basis.includes("GENERAL DESIGN") || /\bGD-\d{2}\b/.test(basis);
  const generalIndex = basis.search(/GENERAL DESIGN/);
  const specificMatch = basis.match(/DESIGN[^«\n]*«([^»]+)»/);
  const specificIndex = specificMatch ? basis.search(/DESIGN[^«\n]*«/) : -1;
  if (specificMatch && specificIndex >= 0) {
    const norm = normalizeTitle(specificMatch[1]);
    if (norm && !norm.startsWith("…")) {
      const found = designDocs.find((doc) => {
        const title = normalizeTitle(doc.title);
        return title === norm || title.includes(norm) || norm.includes(title);
      });
      if (found) {
        if (hasGeneral && generalIndex >= 0 && generalIndex < specificIndex) return generalKey;
        return found.key;
      }
    }
  }
  if (hasGeneral) return generalKey;
  return undefined;
}

function sortNatural(ids: string[]): string[] {
  return [...ids].sort((a, b) => a.localeCompare(b, "ru", { numeric: true }));
}

for (const spec of specs.values()) {
  const text = spec.doc.text;
  const deps = text.match(/^\*\*Зависит от:\*\*\s*(.+)$/m)?.[1] ?? "";
  spec.deps = unique([...deps.matchAll(/DEV-SPEC-\d{3}/g)].map((m) => m[0]));
  spec.blocks = sortNatural(extractRefs(text, "SPEC-[A-Z]+", 3).filter((id) => blockDefs.has(id)));
  spec.gds = sortNatural(extractRefs(text, "GD", 2).filter((id) => gdDefs.has(id)));
  spec.intRefs = intRefsOf(text);

  const owners = new Map<string, number>();
  for (const block of spec.blocks) {
    const owner = blockDefs.get(block)?.docKey;
    if (owner) owners.set(owner, (owners.get(owner) ?? 0) + 1);
  }
  for (let i = 0; i < spec.gds.length; i += 1) {
    if (generalKey) owners.set(generalKey, (owners.get(generalKey) ?? 0) + 1);
  }
  spec.ownerKeys = [...owners.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([key]) => key);
  spec.primaryDocKey = basisPrimaryDocKey(spec) ?? spec.ownerKeys[0];
}

// primaryBlock выбираем после сортировки ссылок: первый блок «основного» документа.
function attachPrimaryBlocks(): void {
  for (const spec of specs.values()) {
    if (!spec.primaryDocKey) continue;
    if (spec.primaryDocKey === generalKey) {
      spec.primaryBlock = spec.gds[0];
    } else {
      spec.primaryBlock = spec.blocks.find((id) => blockDefs.get(id)?.docKey === spec.primaryDocKey);
    }
  }
}
attachPrimaryBlocks();

for (const doc of ticketDocs) {
  const text = doc.text;
  const wave = text.match(/^\*\*Веха:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "";
  const heads = [...text.matchAll(/^###\s+(TKT-M\d+-\d+)\.*\s*—\s*(.+?)\s*$/gm)];
  heads.forEach((head, index) => {
    const start = (head.index ?? 0) + head[0].length;
    const end = index + 1 < heads.length ? (heads[index + 1].index ?? text.length) : text.length;
    const block = text.slice(start, end);
    const status = block.match(/^\*\*Статус:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "статус не указан";
    const specLine = block.match(/^\*\*DEV-SPEC:\*\*\s*(.+)$/m)?.[1] ?? "";
    const specId = specLine.match(/DEV-SPEC-\d{3}/)?.[0];
    const sections = unique([...specLine.matchAll(/§\s*\d+(?:\.\d+)*/g)].map((m) => m[0].replace(/\s+/g, " ")));
    const deps = block.match(/^\*\*Зависит от:\*\*\s*(.+)$/m)?.[1] ?? "";
    const size = block.match(/^\*\*Размер:\*\*\s*(.+)$/m)?.[1]?.trim() ?? "";
    const ticket: TicketInfo = {
      id: head[1],
      title: head[2].replace(/\s{2,}/g, " ").trim(),
      file: doc.rel,
      line: lineOf(text, head.index ?? 0),
      status,
      wave,
      size,
      specId,
      sections,
      deps: unique([...deps.matchAll(/TKT-M\d+-\d+/g)].map((m) => m[0])),
      specMentions: unique([...block.matchAll(/DEV-SPEC-\d{3}/g)].map((m) => m[0])),
    };
    tickets.set(ticket.id, ticket);
    if (specId) specs.get(specId)?.tickets.push(ticket);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Построение дерева: INTENT → DESIGN → блок → DEV-SPEC → TICKET
// ────────────────────────────────────────────────────────────────────────────

const specNodeId = (id: string): string => `spec:${id}`;
const ticketNodeId = (id: string): string => `ticket:${id}`;
const blockNodeId = (id: string): string => `block:${id}`;
const docNodeId = (key: string): string => `design:${key}`;

const docByKey = new Map(docs.map((d) => [d.key, d]));
const intOwnerDoc = new Map<string, Doc>();
for (const def of intDefs.values()) {
  const owner = docByKey.get(def.docKey);
  if (owner) intOwnerDoc.set(def.id, owner);
}

const root: Node = {
  nid: "intent",
  kind: "intent",
  id: "INTENT",
  title: intentDoc.title,
  status: intentDoc.status,
  statusKind: statusKind(intentDoc.status),
  detail: {
    kindLabel: "Intent — корень трассировки",
    status: intentDoc.status,
    file: intentDoc.rel,
    line: 1,
    url: blobUrl(intentDoc.rel, 1),
    note: `${intDefs.size} пунктов намерения. Все DESIGN-документы ссылаются на INT-пункты, DEV-SPEC — на блоки DESIGN, тикеты — на DEV-SPEC.`,
  },
  children: [],
};

const designNodes: Node[] = [];
const orderedDesignDocs = [...designDocs].sort((a, b) => a.title.localeCompare(b.title, "ru"));
if (generalDoc) orderedDesignDocs.unshift(generalDoc);

const specsByDoc = new Map<string, SpecInfo[]>();
for (const spec of specs.values()) {
  if (!spec.primaryDocKey) continue;
  const list = specsByDoc.get(spec.primaryDocKey) ?? [];
  list.push(spec);
  specsByDoc.set(spec.primaryDocKey, list);
}

for (const doc of orderedDesignDocs) {
  const docSpecs = specsByDoc.get(doc.key) ?? [];
  const docDetail: Detail = {
    kindLabel: doc.kind === "general" ? "General Design — уровень 1" : "Design — уровень 2",
    status: doc.status,
    file: doc.rel,
    line: 1,
    url: blobUrl(doc.rel, 1),
    refs: intRefsOf(doc.text).map((id) => {
      const def = intDefs.get(id.split(".")[0]);
      return {
        kind: "int",
        id,
        title: def?.title,
        file: def?.file,
        line: def?.line,
        url: def ? blobUrl(def.file, def.line) : undefined,
      };
    }),
    specs: docSpecs.map((s) => ({
      kind: "spec" as ChainKind,
      id: s.id,
      title: s.title,
      file: s.doc.rel,
      line: 1,
      url: blobUrl(s.doc.rel, 1),
    })),
    note: doc.kind === "general" ? "Определяет GD-блоки, на которые ссылаются DEV-SPEC." : "Определяет SPEC-блоки, на которые ссылаются DEV-SPEC.",
  };
  if (doc.kind === "general") {
    docDetail.note = "Определяет GD-блоки, на которые ссылаются DEV-SPEC.";
  }

  const docNode: Node = {
    nid: docNodeId(doc.key),
    kind: "design",
    id: doc.kind === "general" ? "GENERAL DESIGN" : "DESIGN",
    title: doc.title,
    status: doc.status,
    statusKind: statusKind(doc.status),
    detail: docDetail,
    children: [],
  };

  const byBlock = new Map<string, SpecInfo[]>();
  for (const spec of docSpecs) {
    const block = spec.primaryBlock;
    if (!block) continue;
    const list = byBlock.get(block) ?? [];
    list.push(spec);
    byBlock.set(block, list);
  }

  for (const blockId of sortNatural([...byBlock.keys()])) {
    const def = blockDefs.get(blockId) ?? gdDefs.get(blockId);
    const blockSpecs = (byBlock.get(blockId) ?? []).sort((a, b) => a.id.localeCompare(b.id, "ru"));
    const ticketsInside = blockSpecs.flatMap((s) => s.tickets);
    const blockNode: Node = {
      nid: blockNodeId(blockId),
      kind: "block",
      id: blockId,
      title: def?.title ?? "",
      detail: {
        kindLabel: blockId.startsWith("GD-") ? "GD-блок General Design" : "SPEC-блок Design",
        file: def?.file,
        line: def?.line,
        url: def ? blobUrl(def.file, def.line) : undefined,
        note: `${blockSpecs.length} DEV-SPEC · ${ticketsInside.length} тикетов. Связь: тикет ссылается на DEV-SPEC, DEV-SPEC — на этот блок.`,
        specs: blockSpecs.map((s) => ({
          kind: "spec" as ChainKind,
          id: s.id,
          title: s.title,
          file: s.doc.rel,
          line: 1,
          url: blobUrl(s.doc.rel, 1),
        })),
        tickets: ticketsInside.map((t) => ({
          kind: "ticket" as ChainKind,
          id: t.id,
          title: t.title,
          file: t.file,
          line: t.line,
          url: blobUrl(t.file, t.line),
        })),
      },
      children: [],
    };

    for (const spec of blockSpecs) {
      const specTickets = [...spec.tickets].sort((a, b) => a.id.localeCompare(b.id, "ru"));
      const ownerDoc = spec.primaryDocKey ? docByKey.get(spec.primaryDocKey) : undefined;
      const primaryDef = spec.primaryBlock ? (blockDefs.get(spec.primaryBlock) ?? gdDefs.get(spec.primaryBlock)) : undefined;
      const specChain: ChainStep[] = [
        {
          kind: "spec",
          id: spec.id,
          title: spec.title,
          file: spec.doc.rel,
          line: 1,
          url: blobUrl(spec.doc.rel, 1),
        },
      ];
      if (primaryDef) {
        specChain.push({
          kind: "block",
          id: primaryDef.id,
          title: primaryDef.title,
          file: primaryDef.file,
          line: primaryDef.line,
          url: blobUrl(primaryDef.file, primaryDef.line),
        });
      }
      if (ownerDoc) {
        specChain.push({
          kind: "design",
          id: ownerDoc.kind === "general" ? "GENERAL DESIGN" : "DESIGN",
          title: ownerDoc.title,
          file: ownerDoc.rel,
          line: 1,
          url: blobUrl(ownerDoc.rel, 1),
        });
      }
      const chainInts = new Set<string>(spec.intRefs);
      const blockInts = spec.primaryBlock ? gdIntMap.get(spec.primaryBlock) : undefined;
      const primaryOwner = spec.primaryDocKey ? docByKey.get(spec.primaryDocKey) : undefined;
      if (blockInts && blockInts.length > 0) {
        for (const id of blockInts) chainInts.add(id);
      } else if (primaryOwner) {
        for (const id of intRefsOf(primaryOwner.text)) chainInts.add(id);
      }
      for (const intId of [...chainInts].sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))) {
        const idef = intDefs.get(intId.split(".")[0]);
        specChain.push({
          kind: "int",
          id: intId,
          title: idef?.title,
          file: idef?.file,
          line: idef?.line,
          url: idef ? blobUrl(idef.file, idef.line) : undefined,
        });
      }
      specChain.push({ kind: "intent", id: "INTENT", title: intentDoc.title, file: intentDoc.rel, line: 1, url: blobUrl(intentDoc.rel, 1) });

      const specNode: Node = {
        nid: specNodeId(spec.id),
        kind: "spec",
        id: spec.id,
        title: spec.title,
        status: spec.status,
        statusKind: statusKind(spec.status),
        wave: spec.wave,
        detail: {
          kindLabel: "Development Specification",
          status: spec.status,
          wave: spec.wave,
          file: spec.doc.rel,
          line: 1,
          url: blobUrl(spec.doc.rel, 1),
          chain: specChain,
          refs: [...spec.blocks, ...spec.gds, ...spec.intRefs].length
            ? [...spec.blocks, ...spec.gds].map((id) => {
                const bdef = blockDefs.get(id) ?? gdDefs.get(id);
                return {
                  kind: "block" as ChainKind,
                  id,
                  title: bdef?.title,
                  file: bdef?.file,
                  line: bdef?.line,
                  url: bdef ? blobUrl(bdef.file, bdef.line) : undefined,
                };
              })
            : undefined,
          tickets: specTickets.map((t) => ({
            kind: "ticket" as ChainKind,
            id: t.id,
            title: t.title,
            file: t.file,
            line: t.line,
            url: blobUrl(t.file, t.line),
          })),
          deps: spec.deps,
          note: specTickets.length === 0 ? "Тикеты для этой спецификации ещё не нарезаны." : undefined,
        },
        children: [],
      };

      for (const ticket of specTickets) {
        const ticketNode: Node = {
          nid: ticketNodeId(ticket.id),
          kind: "ticket",
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          statusKind: statusKind(ticket.status),
          wave: ticket.wave,
          detail: {
            kindLabel: "Тикет разработки",
            status: ticket.status,
            wave: ticket.wave,
            file: ticket.file,
            line: ticket.line,
            url: blobUrl(ticket.file, ticket.line),
            sections: ticket.sections.length ? ticket.sections : undefined,
            specNid: specNodeId(spec.id),
            refs: ticket.specMentions
              .filter((id) => id !== ticket.specId)
              .map((id) => ({ kind: "spec" as ChainKind, id, title: specs.get(id)?.title })),
            deps: ticket.deps,
            note: ticket.size ? `Размер: ${ticket.size}.` : undefined,
          },
          children: [],
        };
        specNode.children.push(ticketNode);
      }
      specNode.detail.note = specTickets.length === 0 ? "Тикеты для этой спецификации ещё не нарезаны." : undefined;
      blockNode.children.push(specNode);
    }

    docNode.children.push(blockNode);
  }

  designNodes.push(docNode);
}

// Спецификации, которым не нашлось DESIGN-блока, и тикеты без DEV-SPEC.
const unassignedSpecs = [...specs.values()]
  .filter((s) => !s.primaryDocKey || !s.primaryBlock)
  .sort((a, b) => a.id.localeCompare(b.id, "ru"));

if (unassignedSpecs.length > 0) {
  const group: Node = {
    nid: "group:unassigned-specs",
    kind: "group",
    id: "БЕЗ DESIGN",
    title: "Спецификации без привязки к DESIGN-блоку",
    detail: {
      kindLabel: "Группа разрывов",
      note: "У этих DEV-SPEC не найдено ссылок на GD/SPEC-блоки — цепочка до INTENT обрывается.",
      specs: unassignedSpecs.map((s) => ({
        kind: "spec" as ChainKind,
        id: s.id,
        title: s.title,
        file: s.doc.rel,
        line: 1,
        url: blobUrl(s.doc.rel, 1),
      })),
    },
    children: [],
  };
  root.children.push(group);
}

const orphanTickets = [...tickets.values()]
  .filter((t) => !t.specId || !specs.has(t.specId))
  .sort((a, b) => a.id.localeCompare(b.id, "ru"));

if (orphanTickets.length > 0) {
  const missing = orphanTickets.filter((t) => t.specId && !specs.has(t.specId)).length;
  const group: Node = {
    nid: "group:orphan-tickets",
    kind: "group",
    id: "БЕЗ DEV-SPEC",
    title: "Тикеты без трассировки",
    detail: {
      kindLabel: "Группа разрывов",
      note: `Тикеты без поля DEV-SPEC: ${orphanTickets.length - missing}; ссылаются на несуществующий DEV-SPEC: ${missing}.`,
      tickets: orphanTickets.map((t) => ({
        kind: "ticket" as ChainKind,
        id: t.id,
        title: t.title,
        file: t.file,
        line: t.line,
        url: blobUrl(t.file, t.line),
      })),
    },
    children: [],
  };
  root.children.push(group);
}

root.children.push(...designNodes);

function aggregate(node: Node): { specs: number; tickets: number; done: number } {
  let specsCount = 0;
  let ticketsCount = 0;
  let doneCount = 0;
  for (const child of node.children) {
    const stats = aggregate(child);
    specsCount += stats.specs;
    ticketsCount += stats.tickets;
    doneCount += stats.done;
    if (child.kind === "spec") specsCount += 1;
    if (child.kind === "ticket") {
      ticketsCount += 1;
      if (child.statusKind === "done") doneCount += 1;
    }
  }
  node.counts = { specs: specsCount, tickets: ticketsCount, done: doneCount };
  return node.counts;
}
aggregate(root);

// ────────────────────────────────────────────────────────────────────────────
// Разрывы трассировки
// ────────────────────────────────────────────────────────────────────────────

const gaps: GapGroup[] = [];

const noSpecTickets = [...tickets.values()].filter((t) => !t.specId);
const missingSpecTickets = [...tickets.values()].filter((t) => t.specId && !specs.has(t.specId));
if (noSpecTickets.length > 0) {
  gaps.push({
    severity: "error",
    title: "Тикеты без поля DEV-SPEC",
    items: noSpecTickets.map((t) => `${t.id} — ${t.file}`),
  });
}
if (missingSpecTickets.length > 0) {
  gaps.push({
    severity: "error",
    title: "Тикеты ссылаются на несуществующий DEV-SPEC",
    items: missingSpecTickets.map((t) => `${t.id} → ${t.specId}`),
  });
}

const specsWithoutDesign = [...specs.values()].filter((s) => s.blocks.length === 0 && s.gds.length === 0);
if (specsWithoutDesign.length > 0) {
  gaps.push({
    severity: "warning",
    title: "DEV-SPEC без ссылок на DESIGN-блоки",
    items: specsWithoutDesign.map((s) => `${s.id} — ${s.doc.rel}`),
  });
}

const specsWithoutIntent = [...specs.values()].filter((s) => s.intRefs.length === 0);
if (specsWithoutIntent.length > 0) {
  gaps.push({
    severity: "info",
    title: "DEV-SPEC без прямых ссылок на INT (INT наследуется из DESIGN)",
    items: specsWithoutIntent.map((s) => `${s.id} — ${s.doc.rel}`),
  });
}

const referencedBlocks = new Set<string>();
for (const spec of specs.values()) {
  for (const id of [...spec.blocks, ...spec.gds]) referencedBlocks.add(id);
}
const definedSpecs = new Set([...specs.keys()]);
const specRefsInDocs = new Map<string, string[]>();
for (const doc of docs) {
  for (const m of doc.text.matchAll(/DEV-SPEC-\d{3}/g)) {
    if (definedSpecs.has(m[0])) continue;
    const list = specRefsInDocs.get(m[0]) ?? [];
    list.push(doc.rel);
    specRefsInDocs.set(m[0], list);
  }
}
if (specRefsInDocs.size > 0) {
  gaps.push({
    severity: "info",
    title: "Ссылки на ещё не созданные DEV-SPEC (план)",
    items: sortNatural([...specRefsInDocs.keys()]).map((id) => `${id} — упоминается в ${unique(specRefsInDocs.get(id) ?? []).length} документах`),
  });
}

const specsWithoutTickets = [...specs.values()].filter((s) => s.tickets.length === 0);
if (specsWithoutTickets.length > 0) {
  gaps.push({
    severity: "info",
    title: "DEV-SPEC без нарезанных тикетов",
    items: specsWithoutTickets.map((s) => `${s.id} — ${s.title}`),
  });
}

const designWithoutInt = orderedDesignDocs.filter((doc) => intRefsOf(doc.text).length === 0);
if (designWithoutInt.length > 0) {
  gaps.push({
    severity: "warning",
    title: "DESIGN-документы без ссылок на INT",
    items: designWithoutInt.map((doc) => doc.rel),
  });
}

const unresolvedBlocks = sortNatural([...referencedBlocks].filter((id) => !blockDefs.has(id) && !gdDefs.has(id)));
if (unresolvedBlocks.length > 0) {
  gaps.push({
    severity: "warning",
    title: "Ссылки на неопределённые DESIGN-блоки",
    items: unresolvedBlocks,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Метаданные и HTML
// ────────────────────────────────────────────────────────────────────────────

const countNodes = (node: Node): number => 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
const doneTickets = [...tickets.values()].filter((t) => statusKind(t.status) === "done").length;
const tracedTickets = [...tickets.values()].filter((t) => {
  if (!t.specId) return false;
  const spec = specs.get(t.specId);
  if (!spec) return false;
  const designOk = spec.blocks.length > 0 || spec.gds.length > 0;
  const intentOk = spec.intRefs.length > 0 || spec.ownerKeys.some((key) => intRefsOf(docByKey.get(key)?.text ?? "").length > 0);
  return designOk && intentOk;
}).length;

const meta = {
  generatedAt: new Date().toISOString(),
  project: "«Наука против Магии»",
  workflow: ".workflow",
  repo: REPO,
  ref: REF,
  counts: {
    docs: docs.length,
    ints: intDefs.size,
    gd: gdDefs.size,
    blocks: blockDefs.size,
    specs: specs.size,
    designDocs: designDocs.length,
    tickets: tickets.size,
    doneTickets,
    treeNodes: countNodes(root),
    tracedTickets,
  },
  coverage: tickets.size === 0 ? 0 : Math.round((tracedTickets / tickets.size) * 100),
};

const payload = { meta, root, gaps };

function serialize(node: Node): unknown {
  return {
    nid: node.nid,
    kind: node.kind,
    id: node.id,
    title: node.title,
    status: node.status,
    statusKind: node.statusKind,
    wave: node.wave,
    counts: node.counts,
    detail: node.detail,
    children: node.children.map(serialize),
  };
}

const dataJson = JSON.stringify({ meta, root: serialize(root), gaps }).replace(/</g, "\\u003c");

const html = buildHtml(dataJson);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf8");
fs.writeFileSync(path.join(OUT_DIR, "trace-data.json"), JSON.stringify(payload, null, 2), "utf8");
fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "", "utf8");

const errors = gaps.filter((g) => g.severity === "error");
console.log("Трассировка документации .workflow");
console.log(`  документов: ${meta.counts.docs} · INT: ${meta.counts.ints} · GD: ${meta.counts.gd} · DESIGN-блоков: ${meta.counts.blocks}`);
console.log(`  DEV-SPEC: ${meta.counts.specs} · тикетов: ${meta.counts.tickets} (выполнено ${doneTickets})`);
console.log(`  узлов дерева: ${meta.counts.treeNodes} · трассируемость тикетов: ${meta.coverage}%`);
console.log("");
for (const gap of gaps) {
  const icon = gap.severity === "error" ? "✖" : gap.severity === "warning" ? "▲" : "ℹ";
  console.log(`${icon} ${gap.title}: ${gap.items.length}`);
}
console.log("");
console.log(`Визуализация: ${path.relative(ROOT, path.join(OUT_DIR, "index.html"))}`);
console.log(`Данные:       ${path.relative(ROOT, path.join(OUT_DIR, "trace-data.json"))}`);

if (STRICT && errors.length > 0) {
  console.error(`\n--strict: ${errors.length} разрыв(ов) уровня error.`);
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────────
// HTML-шаблон (автономный: данные и стили встроены)
// ────────────────────────────────────────────────────────────────────────────

function buildHtml(dataJsonText: string): string {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Трассировка требований — «Наука против Магии»</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #080e14;
    --panel: #0d1720;
    --panel-2: #101d28;
    --line: #1c2e3c;
    --line-soft: #16232e;
    --text: #dce8f1;
    --muted: #7e94a5;
    --intent: #f0b45c;
    --design: #6ea8fe;
    --block: #4fd1c5;
    --spec: #8ce99a;
    --ticket: #c3a6ff;
    --group: #8b9aa8;
    --error: #ff7a7a;
    --warning: #f2c14e;
    --info: #7fb6ff;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    background-color: var(--bg);
    background-image:
      linear-gradient(rgba(110, 168, 254, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(110, 168, 254, 0.045) 1px, transparent 1px);
    background-size: 30px 30px;
    color: var(--text);
    font: 14px/1.55 "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
  }
  a { color: #9fc6ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code, .mono { font-family: ui-monospace, "SFMono-Regular", "JetBrains Mono", Consolas, monospace; }
  header {
    padding: 26px clamp(16px, 4vw, 44px) 18px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(13, 23, 32, 0.96), rgba(8, 14, 20, 0.72));
  }
  .kicker {
    font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
    color: var(--intent); font-weight: 600;
  }
  h1 { margin: 4px 0 2px; font-size: clamp(22px, 3vw, 30px); letter-spacing: -0.01em; }
  .subtitle { margin: 0; color: var(--muted); font-size: 13px; }
  .stats { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .stat {
    border: 1px solid var(--line); background: var(--panel);
    border-radius: 8px; padding: 7px 11px; min-width: 92px;
  }
  .stat b { display: block; font-size: 17px; line-height: 1.2; }
  .stat span { color: var(--muted); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; }
  .stat.accent b { color: var(--intent); }
  main {
    display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
    gap: 16px; padding: 18px clamp(16px, 4vw, 44px);
    align-items: start;
  }
  .panel {
    border: 1px solid var(--line); border-radius: 12px;
    background: rgba(13, 23, 32, 0.92); overflow: hidden;
  }
  .toolbar {
    display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--line-soft);
    background: var(--panel-2); flex-wrap: wrap;
  }
  .toolbar input {
    flex: 1 1 220px; min-width: 180px; padding: 9px 11px;
    background: #0a141c; border: 1px solid var(--line); border-radius: 8px;
    color: var(--text); font: inherit; outline: none;
  }
  .toolbar input:focus { border-color: #3d5a72; box-shadow: 0 0 0 3px rgba(110, 168, 254, 0.12); }
  button {
    background: #12222e; color: var(--text); border: 1px solid var(--line);
    border-radius: 8px; padding: 8px 11px; font: inherit; cursor: pointer;
  }
  button:hover { border-color: #3d5a72; background: #162835; }
  .legend {
    display: flex; flex-wrap: wrap; gap: 12px; padding: 9px 14px;
    color: var(--muted); font-size: 11.5px; border-bottom: 1px solid var(--line-soft);
  }
  .legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
  .tree { padding: 10px 8px 18px; max-height: calc(100vh - 250px); overflow: auto; }
  .tree ul { list-style: none; margin: 0; padding-left: 17px; border-left: 1px solid var(--line-soft); }
  .tree > ul { padding-left: 4px; border-left: 0; }
  .tree li { margin: 2px 0; }
  li.collapsed > ul { display: none; }
  .row {
    display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap;
    padding: 5px 8px; border-radius: 7px; cursor: pointer;
    border: 1px solid transparent;
  }
  .row:hover { background: rgba(110, 168, 254, 0.07); border-color: #1d3447; }
  .row.selected { background: rgba(110, 168, 254, 0.12); border-color: #2a4b66; }
  .caret {
    background: none; border: 0; padding: 0 2px; color: var(--muted);
    cursor: pointer; font-size: 11px; line-height: 1; width: 14px;
  }
  .caret-space { width: 14px; display: inline-block; }
  .badge {
    font-family: ui-monospace, monospace; font-size: 9.5px; letter-spacing: 0.05em;
    padding: 2px 5px; border-radius: 4px; border: 1px solid currentColor;
    text-transform: uppercase; white-space: nowrap; opacity: 0.9;
  }
  .b-intent { color: var(--intent); }
  .b-design { color: var(--design); }
  .b-block { color: var(--block); }
  .b-spec { color: var(--spec); }
  .b-ticket { color: var(--ticket); }
  .b-group { color: var(--group); }
  .nid { font-family: ui-monospace, monospace; font-size: 12px; color: #b9cfdf; white-space: nowrap; }
  .ntitle { color: var(--text); font-size: 13px; }
  .meta { color: var(--muted); font-size: 11px; margin-left: auto; white-space: nowrap; }
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }
  .dot.done { background: #5bd48a; }
  .dot.approved { background: #6ea8fe; }
  .dot.planned { background: #8b9aa8; }
  .dot.draft { background: #f2c14e; }
  .dot.unknown { background: #516676; }
  .denied { color: var(--muted); font-size: 11px; }
  .details { padding: 16px 18px 22px; max-height: calc(100vh - 250px); overflow: auto; }
  .details .kind { font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
  .details h2 { margin: 6px 0 2px; font-family: ui-monospace, monospace; font-size: 20px; word-break: break-word; }
  .details h3 { margin: 0 0 10px; font-size: 14px; font-weight: 500; color: #b7cad8; }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 14px; }
  .pill {
    font-size: 11px; padding: 3px 8px; border-radius: 999px;
    border: 1px solid var(--line); background: #0a141c; color: var(--muted);
  }
  .pill.done { color: #8ce99a; border-color: #2f5d40; }
  .pill.approved { color: #9fc6ff; border-color: #2c4a6b; }
  .pill.planned { color: #b3bdc5; }
  .pill.draft { color: #f2c14e; border-color: #5b4a1f; }
  .section-title {
    margin: 16px 0 7px; font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); border-top: 1px solid var(--line-soft);
    padding-top: 12px;
  }
  .chain { list-style: none; margin: 0; padding: 0 0 0 12px; border-left: 1px dashed #2a4152; }
  .chain li { position: relative; padding: 5px 0 7px 10px; }
  .chain li::before {
    content: ""; position: absolute; left: -17px; top: 12px; width: 7px; height: 7px;
    border-radius: 50%; background: #2a4152; border: 1px solid var(--bg);
  }
  .chain li.chain-intent::before { background: var(--intent); }
  .chain li.chain-ticket::before { background: var(--ticket); }
  .chain li.chain-spec::before { background: var(--spec); }
  .chain li.chain-block::before { background: var(--block); }
  .chain li.chain-design::before { background: var(--design); }
  .chain li.chain-int::before { background: var(--intent); opacity: 0.55; }
  .chain .ctitle { color: var(--muted); font-size: 12px; }
  .src { margin-top: 1px; font-size: 11px; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip {
    font-family: ui-monospace, monospace; font-size: 10.5px;
    border: 1px solid var(--line); background: #0a141c;
    padding: 2px 6px; border-radius: 4px; color: #b9cfdf;
  }
  .chip.int { color: var(--intent); }
  .list { margin: 0; padding: 0; list-style: none; }
  .list li { padding: 4px 0; border-bottom: 1px solid var(--line-soft); font-size: 12.5px; }
  .list li:last-child { border-bottom: 0; }
  .list .mono { color: #b9cfdf; }
  .empty { color: var(--muted); padding: 22px 4px; }
  .gaps { padding: 4px clamp(16px, 4vw, 44px) 26px; }
  .gaps h2 { font-size: 15px; margin: 12px 0 8px; }
  .gap {
    border: 1px solid var(--line); border-left-width: 3px; border-radius: 8px;
    background: rgba(13, 23, 32, 0.9); padding: 10px 13px; margin-bottom: 8px;
  }
  .gap.error { border-left-color: var(--error); }
  .gap.warning { border-left-color: var(--warning); }
  .gap.info { border-left-color: var(--info); }
  .gap summary { cursor: pointer; color: var(--text); font-size: 13px; }
  .gap summary .count { color: var(--muted); margin-left: 6px; }
  .gap ul { margin: 8px 0 0; padding-left: 20px; color: var(--muted); font-size: 12px; }
  .gap li { margin: 2px 0; }
  footer {
    color: var(--muted); font-size: 11.5px; padding: 0 clamp(16px, 4vw, 44px) 30px;
  }
  .hidden { display: none !important; }
  @media (max-width: 980px) {
    main { grid-template-columns: 1fr; }
    .tree, .details { max-height: none; }
  }
</style>
</head>
<body>
<header>
  <div class="kicker">Traceability map · manual deploy</div>
  <h1>Трассировка требований</h1>
  <p class="subtitle">INTENT → DESIGN → DEV-SPEC → TICKET · «Наука против Магии» · источник: <code>.workflow</code></p>
  <div class="stats" id="stats"></div>
</header>

<main>
  <section class="panel">
    <div class="toolbar">
      <input id="search" type="search" placeholder="Поиск: TKT-M1-001, SPEC-ECON, INT-07, «рынок»…" autocomplete="off">
      <button id="expand" type="button">Развернуть всё</button>
      <button id="collapse" type="button">Свернуть</button>
      <button id="gaps-btn" type="button">Разрывы</button>
    </div>
    <div class="legend">
      <span><i style="background:var(--intent)"></i>Intent</span>
      <span><i style="background:var(--design)"></i>Design</span>
      <span><i style="background:var(--block)"></i>Блок DESIGN</span>
      <span><i style="background:var(--spec)"></i>DEV-SPEC</span>
      <span><i style="background:var(--ticket)"></i>Тикет</span>
      <span>дерево показывает основную ветку; полный набор связей — в карточке узла</span>
    </div>
    <div class="tree" id="tree"></div>
  </section>

  <aside class="panel details" id="details">
    <div class="empty">Выберите узел дерева, чтобы увидеть цепочку трассировки и ссылки на исходные документы.</div>
  </aside>
</main>

<section class="gaps" id="gaps">
  <h2>Разрывы и покрытие</h2>
  <div id="gap-list"></div>
</section>

<footer>
  Сгенерировано из <code>.workflow</code> скриптом <code>bun run trace:build</code>. Запуск публикации — только вручную (workflow_dispatch).
  Источник: <a id="repo-link" href="#" target="_blank" rel="noopener">GitHub</a>.
</footer>

<script>
const DATA = ${dataJsonText};

const KIND_LABEL = {
  intent: "Intent",
  design: "Design",
  block: "Design-блок",
  spec: "DEV-SPEC",
  ticket: "Тикет",
  group: "Разрыв"
};

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function statusText(node) {
  if (!node.status) return "";
  return node.status.replace(/✅|⏳|📄/g, "").trim();
}

function metaText(node) {
  const parts = [];
  if (node.wave) parts.push(esc(node.wave));
  if (node.counts && (node.counts.specs || node.counts.tickets)) {
    if (node.kind !== "ticket" && node.kind !== "spec") {
      parts.push(esc(node.counts.specs) + " DEV-SPEC");
    }
    if (node.kind !== "ticket" && node.counts.tickets) {
      parts.push(esc(node.counts.tickets) + " тикетов");
    }
    if (node.counts.done) parts.push(esc(node.counts.done) + " выполнено");
  }
  return parts.join(" · ");
}

function renderNode(node, depth) {
  const kids = node.children && node.children.length > 0;
  const collapsed = depth >= 2;
  const caret = kids
    ? '<button class="caret" type="button" aria-label="Свернуть/развернуть">' + (collapsed ? "▸" : "▾") + "</button>"
    : '<span class="caret-space"></span>';
  const search = (node.id + " " + node.title + " " + (node.status || "") + " " + (node.wave || "")).toLowerCase();
  const dot = node.statusKind ? '<span class="dot ' + esc(node.statusKind) + '"></span>' : "";
  const meta = metaText(node);
  const row =
    '<div class="row kind-' + esc(node.kind) + (node.kind === "ticket" ? "" : "") + '" data-nid="' + esc(node.nid) + '" data-search="' + esc(search) + '" tabindex="0">' +
      caret +
      '<span class="badge b-' + esc(node.kind) + '">' + esc(KIND_LABEL[node.kind] || node.kind) + "</span>" +
      '<span class="nid">' + esc(node.id) + "</span>" +
      '<span class="ntitle">' + esc(node.title) + "</span>" +
      (meta ? '<span class="meta">' + dot + meta + "</span>" : (dot ? '<span class="meta">' + dot + "</span>" : "")) +
    "</div>";
  const children = kids ? "<ul>" + node.children.map(function (child) { return renderNode(child, depth + 1); }).join("") + "</ul>" : "";
  return '<li class="node-li' + (collapsed ? " collapsed" : "") + '" data-depth="' + depth + '">' + row + children + "</li>";
}

const treeEl = document.getElementById("tree");
treeEl.innerHTML = "<ul>" + renderNode(DATA.root, 0) + "</ul>";

function statHtml(meta) {
  const c = meta.counts;
  const items = [
    ["Тикеты", c.tickets, true],
    ["DEV-SPEC", c.specs, false],
    ["DESIGN", c.designDocs, false],
    ["Блоки", c.blocks + c.gd, false],
    ["INT", c.ints, false],
    ["Покрытие", meta.coverage + "%", true]
  ];
  document.getElementById("stats").innerHTML = items.map(function (item) {
    return '<div class="stat' + (item[2] ? " accent" : "") + '"><b>' + esc(item[1]) + "</b><span>" + esc(item[0]) + "</span></div>";
  }).join("");
}
statHtml(DATA.meta);

function refList(items, emptyText) {
  if (!items || items.length === 0) return '<div class="denied">' + esc(emptyText || "нет") + "</div>";
  return '<ul class="list">' + items.map(function (item) {
    const link = item.url
      ? '<a href="' + esc(item.url) + '" target="_blank" rel="noopener">' + esc(item.id) + "</a>"
      : '<span class="mono">' + esc(item.id) + "</span>";
    return "<li>" + link + (item.title ? " — " + esc(item.title) : "") + "</li>";
  }).join("") + "</ul>";
}

function chips(list) {
  if (!list || list.length === 0) return "";
  return '<div class="chips">' + list.map(function (item) {
    return '<span class="chip ' + esc(item.kind) + '">' + esc(item.id) + "</span>";
  }).join("") + "</div>";
}

function chainHtml(steps) {
  if (!steps || steps.length === 0) return '<div class="denied">цепочка не построена</div>';
  return '<ol class="chain">' + steps.map(function (step) {
    const src = step.file
      ? '<div class="src"><a href="' + esc(step.url || "#") + '" target="_blank" rel="noopener">' +
        esc(step.file) + (step.line ? ":" + esc(step.line) : "") + "</a></div>"
      : "";
    return '<li class="chain-' + esc(step.kind) + '">' +
      '<span class="badge b-' + esc(step.kind) + '">' + esc(step.kind) + "</span> " +
      "<b>" + esc(step.id) + "</b> " +
      (step.title ? '<span class="ctitle">' + esc(step.title) + "</span>" : "") +
      src + "</li>";
  }).join("") + "</ol>";
}

function renderDetails(node) {
  let d = node.detail || {};
  if (node.kind === "ticket" && d.specNid) {
    const specNode = findNode(DATA.root, d.specNid);
    const specChain = specNode && specNode.detail && specNode.detail.chain ? specNode.detail.chain : [];
    d = Object.assign({}, d, {
      chain: [{ kind: "ticket", id: node.id, title: node.title, file: d.file, line: d.line, url: d.url }].concat(specChain)
    });
  }
  const pills = [];
  if (d.status) pills.push('<span class="pill ' + esc(node.statusKind || "unknown") + '">' + esc(statusText(node) || d.status) + "</span>");
  if (d.wave) pills.push('<span class="pill">' + esc(d.wave) + "</span>");
  if (d.sections && d.sections.length) pills.push('<span class="pill">' + esc(d.sections.join(", ")) + "</span>");
  if (node.counts && node.counts.tickets) pills.push('<span class="pill">' + esc(node.counts.tickets) + " тикетов</span>");
  if (node.counts && node.counts.specs) pills.push('<span class="pill">' + esc(node.counts.specs) + " DEV-SPEC</span>");

  let html = '<div class="kind">' + esc(d.kindLabel || KIND_LABEL[node.kind] || node.kind) + "</div>";
  html += "<h2>" + esc(node.id) + "</h2>";
  html += "<h3>" + esc(node.title) + "</h3>";
  if (pills.length) html += '<div class="pills">' + pills.join("") + "</div>";
  if (d.file) {
    html += '<div class="src"><a href="' + esc(d.url || "#") + '" target="_blank" rel="noopener">Открыть ' +
      esc(d.file) + (d.line ? ":" + esc(d.line) : "") + "</a></div>";
  }
  if (d.note) html += '<p class="denied">' + esc(d.note) + "</p>";

  if (d.chain && d.chain.length) {
    html += '<div class="section-title">Цепочка трассировки</div>' + chainHtml(d.chain);
  }
  if (d.refs && d.refs.length) {
    html += '<div class="section-title">Связанные разделы DESIGN / INT</div>' + chips(d.refs);
  }
  if (d.deps && d.deps.length) {
    html += '<div class="section-title">Зависимости</div><div class="chips">' +
      d.deps.map(function (id) { return '<span class="chip">' + esc(id) + "</span>"; }).join("") + "</div>";
  }
  if (d.specs) {
    html += '<div class="section-title">Спецификации</div>' + refList(d.specs, "нет");
  }
  if (d.tickets) {
    html += '<div class="section-title">Тикеты</div>' + refList(d.tickets, "нет");
  }
  document.getElementById("details").innerHTML = html;
}

function selectRow(row) {
  document.querySelectorAll(".row.selected").forEach(function (el) { el.classList.remove("selected"); });
  row.classList.add("selected");
  const nid = row.getAttribute("data-nid");
  const found = findNode(DATA.root, nid);
  if (found) renderDetails(found);
}

function findNode(node, nid) {
  if (node.nid === nid) return node;
  for (const child of node.children || []) {
    const hit = findNode(child, nid);
    if (hit) return hit;
  }
  return null;
}

treeEl.addEventListener("click", function (event) {
  const caret = event.target.closest(".caret");
  const row = event.target.closest(".row");
  if (caret && row) {
    const li = row.parentElement;
    li.classList.toggle("collapsed");
    caret.textContent = li.classList.contains("collapsed") ? "▸" : "▾";
    event.stopPropagation();
    return;
  }
  if (row) selectRow(row);
});

treeEl.addEventListener("keydown", function (event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest(".row");
  if (!row) return;
  event.preventDefault();
  selectRow(row);
});

document.getElementById("expand").addEventListener("click", function () {
  document.querySelectorAll(".node-li").forEach(function (li) { li.classList.remove("collapsed"); });
  document.querySelectorAll(".caret").forEach(function (c) { c.textContent = "▾"; });
});
document.getElementById("collapse").addEventListener("click", function () {
  document.querySelectorAll(".node-li").forEach(function (li) {
    if (Number(li.getAttribute("data-depth")) >= 1) li.classList.add("collapsed");
  });
  document.querySelectorAll(".caret").forEach(function (c) { c.textContent = "▸"; });
});
document.getElementById("gaps-btn").addEventListener("click", function () {
  document.getElementById("gaps").scrollIntoView({ behavior: "smooth", block: "start" });
});

const searchInput = document.getElementById("search");
searchInput.addEventListener("input", function () {
  const q = searchInput.value.trim().toLowerCase();
  const rows = Array.prototype.slice.call(document.querySelectorAll(".row"));
  if (!q) {
    rows.forEach(function (row) { row.classList.remove("hidden"); });
    return;
  }
  rows.forEach(function (row) {
    const hit = (row.getAttribute("data-search") || "").indexOf(q) !== -1;
    row.classList.toggle("hidden", !hit);
    if (hit) {
      let li = row.parentElement;
      while (li) {
        li.classList.remove("collapsed");
        const caret = li.querySelector(":scope > .row > .caret");
        if (caret) caret.textContent = "▾";
        li = li.parentElement ? li.parentElement.closest("li") : null;
      }
    }
  });
});

function gapsHtml(gaps) {
  if (!gaps || gaps.length === 0) return '<div class="denied">Разрывов не найдено.</div>';
  return gaps.map(function (gap) {
    const items = gap.items.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("");
    return '<details class="gap ' + esc(gap.severity) + '"' + (gap.severity === "error" ? " open" : "") + ">" +
      "<summary>" + esc(gap.title) + '<span class="count">' + gap.items.length + "</span></summary>" +
      "<ul>" + items + "</ul></details>";
  }).join("");
}
document.getElementById("gap-list").innerHTML = gapsHtml(DATA.gaps);

document.getElementById("repo-link").href = "https://github.com/" + DATA.meta.repo;

const timestamp = new Date(DATA.meta.generatedAt).toLocaleString("ru-RU");
document.getElementById("repo-link").textContent = DATA.meta.repo;
document.querySelector("footer").insertAdjacentHTML("afterbegin",
  '<div style="margin-bottom:6px">Сборка: ' + esc(timestamp) + " · " + esc(DATA.meta.ref) + " · покрытие трассировки: " + esc(DATA.meta.coverage) + "%</div>");
</script>
</body>
</html>`;
}
