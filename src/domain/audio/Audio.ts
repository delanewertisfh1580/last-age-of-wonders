import { err, ok, type Result } from '../result/Result.js';

/** TKT-M12-002/003/004: шины, музыкальные состояния и SFX. */
export type BusName = 'master' | 'music' | 'sfx' | 'ambient';
export type MusicState = 'exploration' | 'combat' | 'city' | 'cataclysm' | 'epilogue';

export interface AudioError {
  readonly code: 'AUDIO_INVALID_VOLUME' | 'AUDIO_COOLDOWN' | 'AUDIO_BUDGET_EXCEEDED';
  readonly message: string;
}
function fail(code: AudioError['code'], message: string): Result<never, AudioError> {
  return err({ code, message });
}

export class AudioMixerService {
  private readonly volumes: Record<BusName, number> = { master: 1, music: 0.8, sfx: 1, ambient: 0.6 };
  private readonly muted: Record<BusName, boolean> = { master: false, music: false, sfx: false, ambient: false };
  private duck = 1;

  setVolume(bus: BusName, value: number): Result<number, AudioError> {
    if (!Number.isFinite(value) || value < 0 || value > 1) return fail('AUDIO_INVALID_VOLUME', `Volume out of range: ${value}`);
    this.volumes[bus] = value;
    return ok(value);
  }

  mute(bus: BusName, muted: boolean): void {
    this.muted[bus] = muted;
  }

  /** TKT-M12-002: приглушение музыки под диалог/удар. */
  duckMusic(factor: number): Result<number, AudioError> {
    if (!Number.isFinite(factor) || factor < 0 || factor > 1) return fail('AUDIO_INVALID_VOLUME', `Duck out of range: ${factor}`);
    this.duck = factor;
    return ok(factor);
  }

  restoreDuck(): void {
    this.duck = 1;
  }

  effective(bus: BusName): number {
    if (this.muted.master || this.muted[bus]) return 0;
    const ducked = bus === 'music' ? this.volumes.music * this.duck : this.volumes[bus];
    return Math.round(ducked * this.volumes.master * 1000) / 1000;
  }

  snapshot(): Readonly<Record<BusName, number>> {
    return { master: this.volumes.master, music: this.volumes.music, sfx: this.volumes.sfx, ambient: this.volumes.ambient };
  }

  restore(snapshot: Readonly<Record<BusName, number>>): void {
    for (const bus of Object.keys(this.volumes) as BusName[]) {
      const value = snapshot[bus];
      if (typeof value === 'number') this.volumes[bus] = value;
    }
  }
}

export interface MusicTransition {
  readonly from: MusicState | null;
  readonly to: MusicState;
  progress: number;
  readonly durationMs: number;
}

/** TKT-M12-003: плавная смена музыкального состояния. */
export class MusicStateController {
  private state: MusicState = 'exploration';
  private transition: MusicTransition | null = null;

  current(): MusicState {
    return this.state;
  }

  play(to: MusicState, durationMs = 1200): MusicTransition {
    this.transition = { from: this.state, to, progress: 0, durationMs };
    this.state = to;
    return this.transition;
  }

  tick(dtMs: number): number {
    if (!this.transition) return 1;
    this.transition.progress = Math.min(1, this.transition.progress + dtMs / this.transition.durationMs);
    return this.transition.progress;
  }
}

export interface SfxDefinition {
  readonly id: string;
  readonly bus: BusName;
  readonly cooldownMs: number;
  readonly weight: number;
}

export interface SfxTrigger {
  readonly id: string;
  readonly atMs: number;
}

/** TKT-M12-004: триггеры SFX с кулдауном и лимитом одновременных. */
export class AudioSfxService {
  private readonly lastPlayed = new Map<string, number>();
  private readonly active: { id: string; untilMs: number }[] = [];
  private readonly budget: number;

  constructor(budget = 8) {
    this.budget = budget;
  }

  trigger(definition: SfxDefinition, atMs: number): Result<SfxTrigger, AudioError> {
    this.active.splice(0, this.active.length, ...this.active.filter((entry) => entry.untilMs > atMs));
    const last = this.lastPlayed.get(definition.id);
    if (last !== undefined && atMs - last < definition.cooldownMs) {
      return fail('AUDIO_COOLDOWN', `SFX on cooldown: ${definition.id}`);
    }
    if (this.active.length >= this.budget) return fail('AUDIO_BUDGET_EXCEEDED', 'Concurrent SFX budget exceeded');
    this.lastPlayed.set(definition.id, atMs);
    this.active.push({ id: definition.id, untilMs: atMs + definition.weight * 100 });
    return ok({ id: definition.id, atMs });
  }

  activeCount(atMs: number): number {
    return this.active.filter((entry) => entry.untilMs > atMs).length;
  }
}
