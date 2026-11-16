import { err, ok, type Result } from '../result/Result.js';

/** TKT-M29: предыстория, пролог, маяки, арки, диалоги, финал. */
export interface Background {
  readonly id: string;
  readonly title: string;
  readonly flags: readonly string[];
  readonly bonusSkill: string;
}

export interface StoryBeacon {
  readonly id: string;
  readonly locationId: string;
  readonly arcId: string;
  readonly requiresFlags?: readonly string[];
}

export interface StoryBeat {
  readonly id: string;
  readonly flag: string;
  readonly requiresFlags?: readonly string[];
}

export interface StoryArc {
  readonly id: string;
  readonly title: string;
  readonly beats: readonly StoryBeat[];
  readonly finalFlag: string;
}

export interface DialogueChoice {
  readonly id: string;
  readonly text: string;
  readonly flag: string;
  readonly reputation: number;
}

export interface NarrativeState {
  prologueSeen: boolean;
  backgroundId?: string;
  finaleReached: boolean;
  readonly flags: string[];
  readonly activeArcs: string[];
  readonly completedArcs: string[];
  readonly visitedBeacons: string[];
  reputation: number;
  readonly log: string[];
}

export interface NarrativeError {
  readonly code: 'NARRATIVE_NO_PROLOGUE' | 'NARRATIVE_BEACON_MISSING' | 'NARRATIVE_ARC_UNKNOWN' | 'NARRATIVE_BEAT_LOCKED' | 'NARRATIVE_CHOICE_UNKNOWN';
  readonly message: string;
}
function fail(code: NarrativeError['code'], message: string): Result<never, NarrativeError> {
  return err({ code, message });
}

export function createNarrative(): NarrativeState {
  return { prologueSeen: false, finaleReached: false, flags: [], activeArcs: [], completedArcs: [], visitedBeacons: [], reputation: 30, log: [] };
}

export function hasFlags(state: NarrativeState, flags: readonly string[] = []): boolean {
  return flags.every((flag) => state.flags.includes(flag));
}

export function startPrologue(state: NarrativeState, background: Background): Result<NarrativeState, NarrativeError> {
  state.prologueSeen = true;
  state.backgroundId = background.id;
  for (const flag of background.flags) if (!state.flags.includes(flag)) state.flags.push(flag);
  state.log.push(`prologue:${background.id}`);
  return ok(state);
}

/** TKT-M29: маяк активирует арку в локации при наличии флагов. */
export function activateBeacon(
  state: NarrativeState,
  beacon: StoryBeacon,
  arc: StoryArc,
  locationId: string,
): Result<NarrativeState, NarrativeError> {
  if (!state.prologueSeen) return fail('NARRATIVE_NO_PROLOGUE', 'Prologue required');
  if (beacon.locationId !== locationId) return fail('NARRATIVE_BEACON_MISSING', `Beacon is in ${beacon.locationId}`);
  if (!hasFlags(state, beacon.requiresFlags)) return fail('NARRATIVE_BEACON_MISSING', 'Beacon flags missing');
  if (!state.visitedBeacons.includes(beacon.id)) state.visitedBeacons.push(beacon.id);
  if (!state.activeArcs.includes(arc.id) && !state.completedArcs.includes(arc.id)) state.activeArcs.push(arc.id);
  state.log.push(`beacon:${beacon.id}`);
  return ok(state);
}

/** TKT-M29: биты арки открываются последовательно, финал закрывает арку. */
export function advanceArc(state: NarrativeState, arc: StoryArc, beatId: string): Result<NarrativeState, NarrativeError> {
  if (!state.activeArcs.includes(arc.id)) return fail('NARRATIVE_ARC_UNKNOWN', `Arc not active: ${arc.id}`);
  const beat = arc.beats.find((entry) => entry.id === beatId);
  if (!beat) return fail('NARRATIVE_ARC_UNKNOWN', `Unknown beat: ${beatId}`);
  if (!hasFlags(state, beat.requiresFlags)) return fail('NARRATIVE_BEAT_LOCKED', `Beat locked: ${beatId}`);
  if (!state.flags.includes(beat.flag)) state.flags.push(beat.flag);
  state.log.push(`beat:${arc.id}:${beat.id}`);
  if (arc.beats.every((entry) => state.flags.includes(entry.flag))) {
    if (!state.completedArcs.includes(arc.id)) state.completedArcs.push(arc.id);
    state.activeArcs.splice(state.activeArcs.indexOf(arc.id), 1);
    if (!state.flags.includes(arc.finalFlag)) state.flags.push(arc.finalFlag);
    state.log.push(`arc-complete:${arc.id}`);
  }
  if (!state.finaleReached && state.completedArcs.length > 0 && state.flags.includes('finale-ready')) {
    state.finaleReached = true;
    state.log.push('finale');
  }
  return ok(state);
}

export interface DialogueResult {
  readonly flag: string;
  readonly reputation: number;
}

/** TKT-M29: выбор в диалоге меняет флаги и репутацию. */
export function dialogue(
  state: NarrativeState,
  choices: readonly DialogueChoice[],
  choiceId: string,
): Result<DialogueResult, NarrativeError> {
  const choice = choices.find((entry) => entry.id === choiceId);
  if (!choice) return fail('NARRATIVE_CHOICE_UNKNOWN', `Unknown choice: ${choiceId}`);
  if (!state.flags.includes(choice.flag)) state.flags.push(choice.flag);
  state.reputation = Math.max(0, Math.min(100, state.reputation + choice.reputation));
  state.log.push(`dialogue:${choice.id}`);
  return ok({ flag: choice.flag, reputation: state.reputation });
}

export function makeFinaleReady(state: NarrativeState): NarrativeState {
  if (!state.flags.includes('finale-ready')) state.flags.push('finale-ready');
  return state;
}

export function captureNarrative(state: NarrativeState): string {
  return JSON.stringify(state);
}
