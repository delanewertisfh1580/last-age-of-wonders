import type { RngStreamState } from '../rng/RngStreamState.js';

/** TKT-M3-009: SaveSnapshot из §5.2 DEV-SPEC-006. formatVersion — константа 1. */
export interface SaveSnapshot {
  readonly formatVersion: 1;
  readonly savedAtMs: number;
  readonly contentHash: string;
  readonly rngState: Readonly<Record<string, RngStreamState>>;
  readonly mechanicRuntimeState: Readonly<Record<string, unknown>>;
  readonly domainStates: Readonly<Record<string, unknown>>;
  readonly eventQueueState: Readonly<{
    readonly nextTick: readonly unknown[];
    readonly afterScene: readonly unknown[];
    readonly warning: readonly unknown[];
  }>;
  readonly completedCombatsJournal: readonly unknown[];
  readonly completedCataclysmsJournal: readonly unknown[];
  readonly epilogueEventsJournal: readonly unknown[];
  readonly transformationEventsJournal: readonly unknown[];
  readonly narrativeEventsJournal: readonly unknown[];
  readonly partyEventsJournal: readonly unknown[];
}

export type SaveSlotMetaLike = {
  readonly slotId: string;
  readonly savedAtMs: number;
  readonly contentHash: string;
  readonly formatVersion: 1;
};
