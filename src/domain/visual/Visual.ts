import { err, ok, type Result } from '../result/Result.js';
import type { QualityTier } from '../scene/SceneManager.js';

/** TKT-M9-003/004/005/006: шейдерный профиль, переходы и оверрайды. */
export interface ShaderProfile {
  readonly tier: QualityTier;
  readonly shadows: boolean;
  readonly particleBudget: number;
  readonly resolutionScale: number;
  readonly defines: Readonly<Record<string, string | number | boolean>>;
}

export const SHADER_PROFILES: Readonly<Record<QualityTier, ShaderProfile>> = {
  low: { tier: 'low', shadows: false, particleBudget: 64, resolutionScale: 0.6, defines: { WAVES: 0, BLOOM: 0, REFRACTION: 0 } },
  medium: { tier: 'medium', shadows: true, particleBudget: 192, resolutionScale: 0.85, defines: { WAVES: 1, BLOOM: 0, REFRACTION: 1 } },
  high: { tier: 'high', shadows: true, particleBudget: 512, resolutionScale: 1, defines: { WAVES: 2, BLOOM: 1, REFRACTION: 1 } },
};

export type TransitionCurve = 'linear' | 'ease-in-out';

export interface TransitionState {
  readonly from: number;
  readonly to: number;
  readonly durationMs: number;
  elapsedMs: number;
}

export type VisualErrorCode = 'VISUAL_INVALID_DURATION' | 'VISUAL_UNKNOWN_OVERRIDE';

export interface VisualError {
  readonly code: VisualErrorCode;
  readonly message: string;
}

function fail(code: VisualErrorCode, message: string): Result<never, VisualError> {
  return err({ code, message });
}

export class ShaderQualityController {
  private profile: ShaderProfile;

  constructor(tier: QualityTier) {
    this.profile = SHADER_PROFILES[tier];
  }

  current(): ShaderProfile {
    return this.profile;
  }

  setTier(tier: QualityTier): ShaderProfile {
    this.profile = SHADER_PROFILES[tier];
    return this.profile;
  }
}

export function startTransition(from: number, to: number, durationMs: number): Result<TransitionState, VisualError> {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return fail('VISUAL_INVALID_DURATION', `Invalid duration: ${durationMs}`);
  return ok({ from, to, durationMs, elapsedMs: 0 });
}

export function stepTransition(state: TransitionState, dtMs: number, curve: TransitionCurve = 'ease-in-out'): number {
  if (state.elapsedMs < state.durationMs) state.elapsedMs = Math.min(state.durationMs, state.elapsedMs + Math.max(0, dtMs));
  const t = state.elapsedMs / state.durationMs;
  const eased = curve === 'linear' ? t : t * t * (3 - 2 * t);
  return state.from + (state.to - state.from) * eased;
}

export interface VisualOverride {
  readonly id: string;
  readonly source: string;
  readonly tint: string;
  readonly intensity: number;
  remainingMs: number;
}

/** TKT-M9-005: оверрайды катаклизмов с приоритетом по интенсивности. */
export class VisualOverrideManager {
  private readonly overrides = new Map<string, VisualOverride>();

  apply(override: VisualOverride): VisualOverride {
    const existing = this.overrides.get(override.id);
    if (existing) {
      existing.remainingMs = Math.max(existing.remainingMs, override.remainingMs);
      return existing;
    }
    const copy = { ...override };
    this.overrides.set(copy.id, copy);
    return copy;
  }

  tick(dtMs: number): void {
    for (const [id, override] of this.overrides) {
      override.remainingMs -= dtMs;
      if (override.remainingMs <= 0) this.overrides.delete(id);
    }
  }

  active(): readonly VisualOverride[] {
    return [...this.overrides.values()].sort((a, b) => b.intensity - a.intensity);
  }

  dominant(): VisualOverride | null {
    return this.active()[0] ?? null;
  }

  clear(): void {
    this.overrides.clear();
  }
}

export interface VisualState {
  readonly tier: QualityTier;
  readonly overrides: readonly VisualOverride[];
  tick: number;
}

/** TKT-M9-006: агрегат визуального состояния для такта и memento. */
export class VisualStateAggregate {
  private tickCount = 0;

  constructor(
    private readonly shaders: ShaderQualityController,
    private readonly overrides: VisualOverrideManager,
  ) {}

  tick(dtMs: number): VisualState {
    this.tickCount += 1;
    this.overrides.tick(dtMs);
    return this.capture();
  }

  capture(): VisualState {
    return {
      tier: this.shaders.current().tier,
      overrides: this.overrides.active().map((override) => ({ ...override })),
      tick: this.tickCount,
    };
  }

  restore(state: VisualState): void {
    this.shaders.setTier(state.tier);
    this.overrides.clear();
    for (const override of state.overrides) this.overrides.apply(override);
    this.tickCount = state.tick;
  }
}
