import { err, ok, type Result } from '../result/Result.js';

/** TKT-M30: фрагменты лора, слои раскрытия, NPC и средовой сторителлинг. */
export interface LoreFragment {
  readonly id: string;
  readonly locationId: string;
  readonly layer: 1 | 2 | 3;
  readonly text: string;
  readonly requiresFlags?: readonly string[];
  readonly revealsSecret?: string;
}

export interface LoreNpc {
  readonly id: string;
  readonly name: string;
  readonly locationId: string;
  readonly secretId?: string;
  alive: boolean;
  talked: boolean;
}

export interface LoreState {
  readonly known: Record<string, number>;
  readonly secrets: string[];
  readonly fragments: string[];
  readonly npcs: LoreNpc[];
  readonly clues: string[];
}

export interface LoreError {
  readonly code: 'LORE_LOCKED' | 'LORE_NPC_DEAD' | 'LORE_UNKNOWN_FRAGMENT';
  readonly message: string;
}
function fail(code: LoreError['code'], message: string): Result<never, LoreError> {
  return err({ code, message });
}

export function createLore(): LoreState {
  return { known: {}, secrets: [], fragments: [], npcs: [], clues: [] };
}

export function registerNpc(state: LoreState, npc: LoreNpc): LoreNpc {
  state.npcs.push({ ...npc });
  return npc;
}

/** TKT-M30: фрагменты раскрываются слоями и по флагам. */
export function revealsAt(
  state: LoreState,
  fragments: readonly LoreFragment[],
  locationId: string,
  flags: readonly string[] = [],
): readonly LoreFragment[] {
  return fragments.filter((fragment) => {
    if (fragment.locationId !== locationId) return false;
    if (!(fragment.requiresFlags ?? []).every((flag) => flags.includes(flag))) return false;
    const knownLayer = state.known[fragment.id] ?? 0;
    return fragment.layer === knownLayer + 1;
  });
}

export function revealFragment(state: LoreState, fragment: LoreFragment): Result<LoreState, LoreError> {
  const knownLayer = state.known[fragment.id] ?? 0;
  if (fragment.layer !== knownLayer + 1) return fail('LORE_LOCKED', `Layer ${fragment.layer} locked for ${fragment.id}`);
  state.known[fragment.id] = fragment.layer;
  if (!state.fragments.includes(fragment.id)) state.fragments.push(fragment.id);
  if (fragment.revealsSecret && !state.secrets.includes(fragment.revealsSecret)) state.secrets.push(fragment.revealsSecret);
  return ok(state);
}

/** TKT-M30: разговор с NPC и его смерть раскрывают секрет. */
export function talkToNpc(state: LoreState, npcId: string): Result<LoreNpc, LoreError> {
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) return fail('LORE_UNKNOWN_FRAGMENT', `Unknown NPC: ${npcId}`);
  if (!npc.alive) return fail('LORE_NPC_DEAD', `NPC is dead: ${npcId}`);
  npc.talked = true;
  if (npc.secretId && !state.secrets.includes(npc.secretId)) state.secrets.push(npc.secretId);
  return ok(npc);
}

export function killNpc(state: LoreState, npcId: string): Result<LoreNpc, LoreError> {
  const npc = state.npcs.find((entry) => entry.id === npcId);
  if (!npc) return fail('LORE_UNKNOWN_FRAGMENT', `Unknown NPC: ${npcId}`);
  npc.alive = false;
  if (npc.secretId && !state.secrets.includes(npc.secretId)) state.secrets.push(npc.secretId);
  state.clues.push(`death:${npc.id}`);
  return ok(npc);
}

/** TKT-M30: средовые подсказки в локации. */
export function inspectLocation(state: LoreState, locationId: string, clues: readonly { id: string; locationId: string }[]): readonly string[] {
  const found = clues.filter((clue) => clue.locationId === locationId && !state.clues.includes(clue.id)).map((clue) => clue.id);
  state.clues.push(...found);
  return found;
}

export function revelationLevel(state: LoreState): number {
  return Math.min(3, Math.max(0, ...Object.values(state.known)));
}
