import { err, ok, type Result } from '../result/Result.js';

/** TKT-M31: факты → нити → текст → сцены → выбор. */
export interface EpilogueFact {
  readonly id: string;
  readonly domain: string;
  readonly text: string;
  readonly weight: number;
  readonly tags: readonly string[];
}

export interface EpilogueFactPort {
  collect(): readonly EpilogueFact[];
}

export interface EpilogueThread {
  readonly id: string;
  readonly domain: string;
  readonly facts: readonly EpilogueFact[];
  readonly weight: number;
}

export interface EpilogueScene {
  readonly id: string;
  readonly threadId: string;
  readonly text: string;
}

export interface EpilogueChoice {
  readonly id: string;
  readonly text: string;
  readonly tag: string;
}

export interface EpilogueResult {
  readonly threads: readonly EpilogueThread[];
  readonly scenes: readonly EpilogueScene[];
  readonly text: string;
  readonly choice?: EpilogueChoice;
  readonly missingDomains: readonly string[];
}

export interface EpilogueError {
  readonly code: 'EPILOGUE_NO_FACTS' | 'EPILOGUE_UNKNOWN_CHOICE';
  readonly message: string;
}
function fail(code: EpilogueError['code'], message: string): Result<never, EpilogueError> {
  return err({ code, message });
}

/** TKT-M31: нити группируют факты по домену и сортируются по весу. */
export function weaveThreads(facts: readonly EpilogueFact[], maxFactsPerThread = 3): readonly EpilogueThread[] {
  const byDomain = new Map<string, EpilogueFact[]>();
  for (const fact of facts) {
    const bucket = byDomain.get(fact.domain) ?? [];
    bucket.push(fact);
    byDomain.set(fact.domain, bucket);
  }
  return [...byDomain.entries()]
    .map(([domain, domainFacts]) => {
      const sorted = [...domainFacts].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0, maxFactsPerThread);
      return {
        id: `thread:${domain}`,
        domain,
        facts: sorted,
        weight: sorted.reduce((sum, fact) => sum + fact.weight, 0),
      };
    })
    .sort((a, b) => b.weight - a.weight || a.domain.localeCompare(b.domain));
}

export function buildScenes(threads: readonly EpilogueThread[]): readonly EpilogueScene[] {
  return threads.map((thread) => ({
    id: `scene:${thread.domain}`,
    threadId: thread.id,
    text: thread.facts.map((fact) => fact.text).join(' '),
  }));
}

export function renderText(scenes: readonly EpilogueScene[], choice?: EpilogueChoice): string {
  const body = scenes.map((scene) => scene.text).join('\n\n');
  return choice ? `${body}\n\n${choice.text}` : body;
}

/** TKT-M31: полнота эпилога — факт из каждого домена-источника. */
export function missingDomains(facts: readonly EpilogueFact[], requiredDomains: readonly string[]): readonly string[] {
  return requiredDomains.filter((domain) => !facts.some((fact) => fact.domain === domain));
}

export function generateEpilogue(
  port: EpilogueFactPort,
  requiredDomains: readonly string[] = [],
  choice?: EpilogueChoice,
): Result<EpilogueResult, EpilogueError> {
  const facts = port.collect();
  if (facts.length === 0) return fail('EPILOGUE_NO_FACTS', 'No facts collected');
  const missing = missingDomains(facts, requiredDomains);
  const threads = weaveThreads(facts);
  const scenes = buildScenes(threads);
  return ok({ threads, scenes, text: renderText(scenes, choice), choice, missingDomains: missing });
}

export function pickChoice(choices: readonly EpilogueChoice[], id: string): Result<EpilogueChoice, EpilogueError> {
  const found = choices.find((choice) => choice.id === id);
  if (!found) return fail('EPILOGUE_UNKNOWN_CHOICE', `Unknown choice: ${id}`);
  return ok(found);
}

export function createFactPort(facts: readonly EpilogueFact[]): EpilogueFactPort {
  return { collect: () => [...facts] };
}
