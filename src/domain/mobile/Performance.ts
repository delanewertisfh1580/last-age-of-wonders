import { err, ok, type Result } from '../result/Result.js';
import type { QualityTier } from '../scene/SceneManager.js';

/** TKT-M14-001/002/003/004: профили устройств и бюджет производительности. */
export type DeviceKind = 'desktop' | 'tablet' | 'mobile';

export interface DeviceProfileDefinition {
  readonly id: string;
  readonly kind: DeviceKind;
  readonly gpuScore: number;
  readonly maxTextureSize: number;
  readonly memoryMb: number;
}

export interface PerformanceBudget {
  readonly maxTickMs: number;
  readonly maxFrameMs: number;
  readonly particleBudget: number;
  readonly maxSaveBytes: number;
}

export const DEFAULT_BUDGETS: Readonly<Record<DeviceKind, PerformanceBudget>> = {
  desktop: { maxTickMs: 8, maxFrameMs: 16.7, particleBudget: 512, maxSaveBytes: 8 * 1024 * 1024 },
  tablet: { maxTickMs: 12, maxFrameMs: 20, particleBudget: 256, maxSaveBytes: 4 * 1024 * 1024 },
  mobile: { maxTickMs: 25, maxFrameMs: 33.3, particleBudget: 96, maxSaveBytes: 2 * 1024 * 1024 },
};

export type PerformanceErrorCode = 'PERF_BUDGET_EXCEEDED' | 'PERF_INVALID_MEASUREMENT';
export interface PerformanceError {
  readonly code: PerformanceErrorCode;
  readonly message: string;
}

function fail(code: PerformanceErrorCode, message: string): Result<never, PerformanceError> {
  return err({ code, message });
}

/** TKT-M14-002: детерминированный детектор профиля по признакам. */
export function detectDeviceProfile(input: {
  readonly userAgent?: string;
  readonly touch?: boolean;
  readonly gpuScore?: number;
  readonly maxTextureSize?: number;
  readonly memoryMb?: number;
}): DeviceProfileDefinition {
  const ua = (input.userAgent ?? '').toLowerCase();
  const mobileUa = /android|iphone|ipad|mobile/.test(ua);
  const kind: DeviceKind = mobileUa ? (input.touch ? 'mobile' : 'tablet') : input.touch ? 'tablet' : 'desktop';
  return {
    id: `${kind}-${input.gpuScore ?? 50}`,
    kind,
    gpuScore: input.gpuScore ?? (kind === 'mobile' ? 30 : kind === 'tablet' ? 55 : 80),
    maxTextureSize: input.maxTextureSize ?? 2048,
    memoryMb: input.memoryMb ?? (kind === 'mobile' ? 1024 : 4096),
  };
}

export function budgetFor(profile: DeviceProfileDefinition): PerformanceBudget {
  return DEFAULT_BUDGETS[profile.kind];
}

export function tierFor(profile: DeviceProfileDefinition): QualityTier {
  if (profile.kind === 'mobile') return profile.gpuScore >= 60 ? 'medium' : 'low';
  if (profile.kind === 'tablet') return profile.gpuScore >= 50 ? 'high' : 'medium';
  return profile.gpuScore >= 40 ? 'high' : 'medium';
}

export interface GovernorState {
  tier: QualityTier;
  particleBudget: number;
  degraded: boolean;
  readonly samples: { tickMs: number; frameMs: number }[];
}

/** TKT-M14-003/004: понижение тира и бюджета при перерасходе. */
export class MobilePerformanceGovernor {
  private readonly state: GovernorState;

  constructor(private readonly profile: DeviceProfileDefinition) {
    this.state = { tier: tierFor(profile), particleBudget: budgetFor(profile).particleBudget, degraded: false, samples: [] };
  }

  record(tickMs: number, frameMs: number): Result<GovernorState, PerformanceError> {
    if (!Number.isFinite(tickMs) || !Number.isFinite(frameMs) || tickMs < 0 || frameMs < 0) {
      return fail('PERF_INVALID_MEASUREMENT', `Invalid measurement: ${tickMs}/${frameMs}`);
    }
    this.state.samples.push({ tickMs, frameMs });
    if (this.state.samples.length > 120) this.state.samples.shift();
    const budget = budgetFor(this.profile);
    if (tickMs > budget.maxTickMs || frameMs > budget.maxFrameMs) {
      this.state.degraded = true;
      this.state.tier = this.state.tier === 'high' ? 'medium' : 'low';
      this.state.particleBudget = Math.max(32, Math.floor(this.state.particleBudget / 2));
    }
    return ok(this.capture());
  }

  capture(): GovernorState {
    return { ...this.state, samples: this.state.samples.map((sample) => ({ ...sample })) };
  }

  restore(state: GovernorState): void {
    this.state.tier = state.tier;
    this.state.particleBudget = state.particleBudget;
    this.state.degraded = state.degraded;
    this.state.samples.splice(0, this.state.samples.length, ...state.samples.map((sample) => ({ ...sample })));
  }

  /** TKT-M14-004: проверка бюджета сохранения. */
  validateSave(bytes: number): Result<number, PerformanceError> {
    const budget = budgetFor(this.profile);
    if (bytes > budget.maxSaveBytes) return fail('PERF_BUDGET_EXCEEDED', `Save ${bytes} > ${budget.maxSaveBytes}`);
    return ok(bytes);
  }
}
