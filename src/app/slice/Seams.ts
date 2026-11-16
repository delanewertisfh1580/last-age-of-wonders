/**
 * TKT-M34-001: канонические топики и адаптеры на границах доменов.
 * Контент, использующий устаревшее имя, приводит к SLICE_SEAM_MISSING.
 */
export interface SeamSpec {
  readonly id: string;
  readonly canonical: string;
  readonly legacy: readonly string[];
  readonly from: string;
  readonly to: string;
}

export const SLICE_SEAMS: readonly SeamSpec[] = [
  { id: 'cataclysm-start', canonical: 'cataclysm.started', legacy: ['cataclysm.activated', 'cataclysm.begin'], from: 'world', to: 'world' },
  { id: 'cataclysm-escalate', canonical: 'cataclysm.escalated', legacy: ['cataclysm.escalation'], from: 'world', to: 'economy' },
  { id: 'combat-crew', canonical: 'combat.crew_died', legacy: ['combat.crewDeath', 'party.member_lost'], from: 'combat', to: 'party' },
  { id: 'companion-death', canonical: 'party.companion_died', legacy: ['companion.death', 'companion.died'], from: 'party', to: 'narrative' },
  { id: 'narrative-action', canonical: 'narrative.player_action_recorded', legacy: ['narrative.action', 'player.action'], from: 'narrative', to: 'meta' },
  { id: 'epilogue-fact', canonical: 'epilogue.fact_collected', legacy: ['epilogue.fact'], from: 'epilogue', to: 'meta' },
];

export type SeamError = { readonly code: 'SLICE_SEAM_MISSING'; readonly message: string; readonly topic: string };

const CANONICAL = new Set(SLICE_SEAMS.map((seam) => seam.canonical));

export function isCanonicalTopic(topic: string): boolean {
  return CANONICAL.has(topic);
}

/** Адаптер: устаревшее имя → канонический топик. */
export function adaptSeamTopic(topic: string): string | SeamError {
  if (CANONICAL.has(topic)) return topic;
  for (const seam of SLICE_SEAMS) {
    if (seam.legacy.includes(topic)) return seam.canonical;
  }
  return { code: 'SLICE_SEAM_MISSING', message: `No seam mapping for ${topic}`, topic };
}

export function validateSeamTopics(topics: readonly string[], knownTopics: readonly string[] = []): readonly SeamError[] {
  const allowed = new Set([...CANONICAL, ...knownTopics]);
  return topics
    .filter((topic) => !allowed.has(topic))
    .map((topic) => ({ code: 'SLICE_SEAM_MISSING' as const, message: `Topic is not canonical: ${topic}`, topic }));
}

export function seamFor(id: string): SeamSpec | undefined {
  return SLICE_SEAMS.find((seam) => seam.id === id);
}
