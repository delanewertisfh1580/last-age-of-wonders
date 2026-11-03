/**
 * TKT-M3-021: TickPhase — полный перечень из §5.1 DEV-SPEC-007
 * (в списке спеки 13 фаз; тикет называет 14 — используем перечень спеки).
 */
export type TickPhase =
  | 'warning-drain'
  | 'tick-drain'
  | 'world-tick-advance'
  | 'scope:world'
  | 'scope:economy'
  | 'scope:cataclysm'
  | 'scope:party'
  | 'scope:combat'
  | 'scope:captain'
  | 'scope:narrative'
  | 'scope:visual'
  | 'scope:epilogue'
  | 'after-scene-drain';

export const ALL_TICK_PHASES: readonly TickPhase[] = [
  'warning-drain',
  'tick-drain',
  'world-tick-advance',
  'scope:world',
  'scope:economy',
  'scope:cataclysm',
  'scope:party',
  'scope:combat',
  'scope:captain',
  'scope:narrative',
  'scope:visual',
  'scope:epilogue',
  'after-scene-drain',
];

export const TICK_SCOPES = [
  'world',
  'economy',
  'cataclysm',
  'party',
  'combat',
  'captain',
  'narrative',
  'visual',
  'epilogue',
] as const;
